// Main-thread handle for the Whisper worker. Created once at startup so the model loads in
// the background while the person types or reads.
export type SttState = 'loading' | 'ready' | 'error'

type Pending = { resolve: (t: string) => void; reject: (e: Error) => void }

// Whisper language for Taglish; undefined = auto-detect. See docs/bench.md before changing.
export type VoiceLang = 'tagalog' | 'english' | 'auto'
const LANG_KEY = 'vox.voiceLang'
export function getVoiceLang(): VoiceLang {
  try {
    const v = localStorage.getItem(LANG_KEY)
    return v === 'english' || v === 'auto' ? v : 'tagalog'
  } catch {
    return 'tagalog'
  }
}
export function setVoiceLang(v: VoiceLang): void {
  try {
    localStorage.setItem(LANG_KEY, v)
  } catch {
    /* ignore: the choice just won't be remembered */
  }
}

let worker: Worker | null = null
let state: SttState = 'loading'
let nextId = 1
const pending = new Map<number, Pending>()
const listeners = new Set<(s: SttState) => void>()

function setState(s: SttState): void {
  state = s
  listeners.forEach((l) => l(s))
}

export function startStt(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./stt.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data
    if (m.type === 'ready') setState('ready')
    else if (m.type === 'load-error') {
      console.error('Whisper failed to load:', m.error)
      setState('error')
    } else if (m.type === 'result') {
      console.info(`[vox stt] transcribed ${m.text.length} chars in ${m.ms} ms`)
      pending.get(m.id)?.resolve(m.text)
      pending.delete(m.id)
    } else if (m.type === 'error') {
      pending.get(m.id)?.reject(new Error(m.error))
      pending.delete(m.id)
    }
  }
  return worker
}

export const sttState = (): SttState => state

export function onSttState(cb: (s: SttState) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function transcribe(audio: Float32Array): Promise<string> {
  const w = startStt()
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    w.postMessage({ id, audio, language: getVoiceLang() === 'auto' ? undefined : getVoiceLang() }, [audio.buffer])
  })
}
