import type { VoxApi } from '../shared/api'

declare global {
  interface Window {
    vox: VoxApi
  }
}
