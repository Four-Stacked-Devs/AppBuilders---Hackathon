import { getGpu, MODEL_FILE } from './ai/llm'
import { createRequestCounter } from './netcount'
import { dataFilePath } from './store/db'

// What runs where, read from the running app so the Settings panel can't drift from reality.
export const requests = createRequestCounter()
const since = new Date().toISOString()

export function getMeta(): {
  modelFile: string
  gpu: string | null
  whisperModel: string
  dataFile: string
  outsideRequests: number
  lastOutsideHost: string | null
  since: string
} {
  return {
    modelFile: MODEL_FILE,
    gpu: getGpu(),
    whisperModel: 'onnx-community/whisper-small (8-bit)',
    dataFile: dataFilePath(),
    ...requests.snapshot(),
    since
  }
}
