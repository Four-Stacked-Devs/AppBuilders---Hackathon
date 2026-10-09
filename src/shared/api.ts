import type { AiStatus } from './status'

// The only API the renderer can call. Exposed by the preload as window.vox.
// Later phases add profile, log, day and history here.
export interface VoxApi {
  ai: {
    status(): Promise<AiStatus>
    onStatus(cb: (s: AiStatus) => void): () => void
  }
  // Temporary Phase 1 debug hook: sends raw text to the model, returns raw output.
  debug: {
    generate(text: string): Promise<string>
  }
}
