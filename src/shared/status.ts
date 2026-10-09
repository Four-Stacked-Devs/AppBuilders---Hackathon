// State of the on-device language model, pushed from main to the renderer.
export type AiStatus = {
  state: 'loading' | 'ready' | 'error'
  message?: string
  progress?: number // 0..1 while the model file is loading
}
