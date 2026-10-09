import path from 'node:path'
import { app } from 'electron'
import type { Llama, LlamaContext, LlamaModel } from 'node-llama-cpp'
import type { AiStatus } from '@shared/status'
import { fakeGenerate } from './fakeLlm'

export const FAKE_LLM = process.env.VOX_FAKE_LLM === '1'
export const MODEL_FILE = process.env.VOX_MODEL_FILE ?? 'qwen2.5-3b-instruct-q4_k_m.gguf'

let nlc: typeof import('node-llama-cpp')
let llama: Llama
let model: LlamaModel
let context: LlamaContext
let queue: Promise<unknown> = Promise.resolve()
let status: AiStatus = { state: 'loading' }
let gpu: string | null = null // 'metal' | 'vulkan' | 'cuda' | 'cpu', once loaded

export const getGpu = (): string | null => (FAKE_LLM ? 'mock mode' : gpu)

export const getStatus = (): AiStatus => status

export function modelPath(): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'models')
    : path.join(app.getAppPath(), 'models')
  return path.join(base, 'llm', MODEL_FILE)
}

// Loads the model in the background; the window never waits on this.
export async function initLlm(onStatus: (s: AiStatus) => void): Promise<void> {
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
    model = await llama.loadModel({
      modelPath: modelPath(),
      onLoadProgress: (p) => {
        const pct = Math.round(p * 100)
        if (pct === lastPct) return // at most one update per percent
        lastPct = pct
        set({ state: 'loading', message: 'Loading AI model on this computer…', progress: p })
      }
    })
    context = await model.createContext({ contextSize: 4096 })
    await generate({
      system: 'Reply with OK.',
      user: 'Hi',
      temperature: 0,
      maxTokens: 4,
      timeoutMs: 60_000
    })
    set({ state: 'ready', message: MODEL_FILE })
  } catch (err) {
    console.error('LLM load failed:', err)
    set({ state: 'error', message: String(err) })
  }
}

// One request at a time: a single context sequence keeps RAM small.
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.catch(() => undefined)
  return run
}

export type GenerateOpts = {
  system: string
  user: string
  jsonSchema?: object // when set, output is forced to match it
  temperature: number
  maxTokens: number
  timeoutMs: number
}

export function generate(opts: GenerateOpts): Promise<string> {
  if (FAKE_LLM) return fakeGenerate(opts)
  return serialize(async () => {
    if (!context) throw new Error('model not loaded')
    // A fresh session per request, so no chat history leaks between logs.
    const session = new nlc.LlamaChatSession({
      contextSequence: context.getSequence(),
      systemPrompt: opts.system
    })
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(new Error('LLM timeout')), opts.timeoutMs)
    try {
      const grammar = opts.jsonSchema
        ? await llama.createGrammarForJsonSchema(opts.jsonSchema as never)
        : undefined
      return await session.prompt(opts.user, {
        grammar,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
        signal: abort.signal
      })
    } finally {
      clearTimeout(timer)
      // disposeSequence defaults to false; without it the context's only sequence stays taken.
      session.dispose({ disposeSequence: true })
    }
  })
}
