import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'

// Offline: the model and the ONNX runtime are served from this app (src/renderer/public),
// never fetched from the Hugging Face Hub or a CDN. Without wasmPaths, transformers.js 4
// would load the runtime from cdn.jsdelivr.net.
env.allowRemoteModels = false
env.allowLocalModels = true
env.localModelPath = '/models/'
env.useFS = false // read the model over the app's own server, never from a disk path
env.useFSCache = false
env.useBrowserCache = false
const ort = `${self.location.origin}/ort/`
env.backends.onnx.wasm!.wasmPaths = {
  mjs: `${ort}ort-wasm-simd-threaded.asyncify.mjs`,
  wasm: `${ort}ort-wasm-simd-threaded.asyncify.wasm`
}

// whisper-small hears Filipino far better than base; base remains the fallback if small is missing.
const MODELS = ['onnx-community/whisper-small', 'onnx-community/whisper-base']

let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null
const load = (): Promise<AutomaticSpeechRecognitionPipeline> =>
  (asr ??= (async () => {
    let last: unknown
    for (const m of MODELS) {
      try {
        return (await pipeline('automatic-speech-recognition', m, {
          dtype: 'q8', // the *_quantized.onnx files from npm run models:download
          device: 'wasm'
        })) as AutomaticSpeechRecognitionPipeline
      } catch (err) {
        last = err
      }
    }
    asr = null
    throw last
  })())

load().then(
  () => self.postMessage({ type: 'ready' }),
  (err) => self.postMessage({ type: 'load-error', error: String(err) })
)

self.onmessage = async (
  e: MessageEvent<{ id: number; audio: Float32Array; language?: string }>
): Promise<void> => {
  const { id, audio, language } = e.data
  try {
    const t = await load()
    const started = performance.now()
    const out = await t(audio, { language, task: 'transcribe', chunk_length_s: 30 })
    const text = (Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text).trim()
    self.postMessage({ type: 'result', id, text, ms: Math.round(performance.now() - started) })
  } catch (err) {
    self.postMessage({ type: 'error', id, error: String(err) })
  }
}
