import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'

// Offline: the model and the ONNX runtime are served from this app (src/renderer/public),
// never fetched from the Hugging Face Hub or a CDN. Without wasmPaths, transformers.js 4
// would load the runtime from cdn.jsdelivr.net.
env.allowRemoteModels = false
env.allowLocalModels = true
env.localModelPath = '/models/'
env.useBrowserCache = false
const ort = `${self.location.origin}/ort/`
env.backends.onnx.wasm!.wasmPaths = {
  mjs: `${ort}ort-wasm-simd-threaded.asyncify.mjs`,
  wasm: `${ort}ort-wasm-simd-threaded.asyncify.wasm`
}

const MODEL = 'onnx-community/whisper-base'

let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null
const load = (): Promise<AutomaticSpeechRecognitionPipeline> =>
  (asr ??= pipeline('automatic-speech-recognition', MODEL, {
    dtype: 'q8', // the *_quantized.onnx files from npm run models:download
    device: 'wasm'
  }) as Promise<AutomaticSpeechRecognitionPipeline>)

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
