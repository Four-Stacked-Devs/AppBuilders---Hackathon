// State of the on-device language model, pushed from main to the renderer.
export type AiStatus = { state: 'loading' | 'ready' | 'error'; message?: string }
