import { existsSync } from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type {
  Llama,
  LlamaChatSession,
  LlamaContextSequence,
  LlamaGrammar,
  LlamaModel
} from 'node-llama-cpp'
import type { AiStatus } from '@shared/status'
import { fakeGenerate } from './fakeLlm'

export const FAKE_LLM = process.env.VOX_FAKE_LLM === '1'

// Preferred files, best first. The first one present in models/llm is used; VOX_MODEL_FILE wins.
const MAIN_CANDIDATES = [
  'Qwen3-4B-Instruct-2507-Q4_K_M.gguf',
  'qwen2.5-3b-instruct-q4_k_m.gguf'
]
const FAST_CANDIDATES = ['qwen2.5-1.5b-instruct-q4_k_m.gguf']
// VOX_PROFILE=lite loads only the main model (for an 8 GB computer).
const LITE = process.env.VOX_PROFILE === 'lite'

function baseDir(): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'models')
    : path.join(app.getAppPath(), 'models')
  return path.join(base, 'llm')
}
const pick = (env: string | undefined, candidates: string[]): string | null =>
  env ?? candidates.find((f) => existsSync(path.join(baseDir(), f))) ?? null

export const MODEL_FILE = pick(process.env.VOX_MODEL_FILE, MAIN_CANDIDATES) ?? MAIN_CANDIDATES[1]
const FAST_FILE = LITE ? null : pick(process.env.VOX_FAST_MODEL_FILE, FAST_CANDIDATES)

export type Role = 'parse' | 'explain' | 'coach'
type Slot = { seq: LlamaContextSequence; session?: LlamaChatSession; system?: string; queue: Promise<unknown> }

let nlc: typeof import('node-llama-cpp')
let llama: Llama
let main: LlamaModel
let fast: LlamaModel | null = null
const slots = new Map<Role, Slot>()
const grammars = new Map<string, LlamaGrammar>()
let status: AiStatus = { state: 'loading' }
let gpu: string | null = null // 'metal' | 'vulkan' | 'cuda' | 'cpu', once loaded

export const getGpu = (): string | null => (FAKE_LLM ? 'mock mode' : gpu)
export const getStatus = (): AiStatus => status
export const getLoadedModels = (): { main: string; fast: string | null } => ({
  main: MODEL_FILE,
  fast: fast ? FAST_FILE : null
})

export function modelPath(file = MODEL_FILE): string {
  return path.join(baseDir(), file)
}

const jsonKey = (schema: object): string => JSON.stringify(schema)

async function grammarFor(schema: object): Promise<LlamaGrammar> {
  const k = jsonKey(schema)
  let g = grammars.get(k)
  if (!g) {
    g = await llama.createGrammarForJsonSchema(schema as never)
    grammars.set(k, g)
  }
  return g
}

// Loads the model(s) in the background; the window never waits on this. Each role (parse,
// explain, coach) owns one context sequence for the whole run, so its system prompt stays
// cached between requests instead of being re-read every time.
export async function initLlm(
  onStatus: (s: AiStatus) => void,
  schemas: object[] = []
): Promise<void> {
  const set = (s: AiStatus): void => {
    status = s
    onStatus(s)
  }
  if (FAKE_LLM) return set({ state: 'ready', message: 'mock mode' })
  try {
    set({ state: 'loading', message: 'Loading AI model on this computer…' })
    nlc = await import('node-llama-cpp') // ESM-only package: dynamic import
    llama = await nlc.getLlama() // picks Metal / Vulkan / CUDA / CPU
    gpu = llama.gpu || 'cpu'
    let lastPct = -1
    main = await llama.loadModel({
      modelPath: modelPath(),
      onLoadProgress: (p) => {
        const pct = Math.round(p * (FAST_FILE ? 85 : 100))
        if (pct === lastPct) return // at most one update per percent
        lastPct = pct
        set({
          state: 'loading',
          message: 'Loading AI model on this computer…',
          progress: pct / 100
        })
      }
    })
    const mainCtx = await main.createContext({
      contextSize: 6144,
      sequences: FAST_FILE ? 1 : 3,
      flashAttention: true
    })
    if (FAST_FILE && existsSync(modelPath(FAST_FILE))) {
      fast = await llama.loadModel({ modelPath: modelPath(FAST_FILE) })
      const fastCtx = await fast.createContext({ contextSize: 4096, sequences: 2, flashAttention: true })
      slots.set('parse', { seq: mainCtx.getSequence(), queue: Promise.resolve() })
      slots.set('explain', { seq: fastCtx.getSequence(), queue: Promise.resolve() })
      slots.set('coach', { seq: fastCtx.getSequence(), queue: Promise.resolve() })
    } else {
      slots.set('parse', { seq: mainCtx.getSequence(), queue: Promise.resolve() })
      slots.set('explain', { seq: mainCtx.getSequence(), queue: Promise.resolve() })
      slots.set('coach', { seq: mainCtx.getSequence(), queue: Promise.resolve() })
    }
    for (const s of schemas) await grammarFor(s) // compile once, up front
    await generate({
      system: 'Reply with OK.',
      user: 'Hi',
      temperature: 0,
      maxTokens: 4,
      timeoutMs: 60_000,
      role: 'explain'
    })
    set({ state: 'ready', message: fast ? `${MODEL_FILE} + ${FAST_FILE}` : MODEL_FILE })
  } catch (err) {
    console.error('LLM load failed:', err)
    set({ state: 'error', message: String(err) })
  }
}

export type GenerateOpts = {
  system: string
  user: string
  jsonSchema?: object // when set, output is forced to match it
  temperature: number
  maxTokens: number
  timeoutMs: number
  role?: Role // which cached sequence to use (default: parse)
}

export function generate(opts: GenerateOpts): Promise<string> {
  if (FAKE_LLM) return fakeGenerate(opts)
  const slot = slots.get(opts.role ?? 'parse')
  if (!slot) return Promise.reject(new Error('model not loaded'))
  // One request at a time per role; different roles can overlap.
  const run = slot.queue.then(
    () => runOne(slot, opts),
    () => runOne(slot, opts)
  )
  slot.queue = run.catch(() => undefined)
  return run
}

async function runOne(slot: Slot, opts: GenerateOpts): Promise<string> {
  // Same system prompt as last time: keep the session (and its cached prompt) and only clear
  // the chat. A different prompt starts a new session on the same sequence.
  if (!slot.session || slot.system !== opts.system) {
    slot.session?.dispose({ disposeSequence: false })
    slot.session = new nlc.LlamaChatSession({
      contextSequence: slot.seq,
      systemPrompt: opts.system,
      autoDisposeSequence: false
    })
    slot.system = opts.system
  } else {
    slot.session.resetChatHistory()
  }
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(new Error('LLM timeout')), opts.timeoutMs)
  try {
    const grammar = opts.jsonSchema ? await grammarFor(opts.jsonSchema) : undefined
    return await slot.session.prompt(opts.user, {
      grammar,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      signal: abort.signal
    })
  } catch (err) {
    slot.session?.dispose({ disposeSequence: false }) // start clean after any failure
    slot.session = undefined
    slot.system = undefined
    throw err
  } finally {
    clearTimeout(timer)
  }
}
