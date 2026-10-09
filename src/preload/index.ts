// Sandboxed preload: only contextBridge and ipcRenderer from electron, no npm imports.
import { contextBridge, ipcRenderer } from 'electron'
import type { VoxApi } from '../shared/api'
import type { AiStatus } from '../shared/status'

const api: VoxApi = {
  ai: {
    status: () => ipcRenderer.invoke('ai:status'),
    onStatus: (cb) => {
      const h = (_e: unknown, s: AiStatus): void => cb(s)
      ipcRenderer.on('ai:status-changed', h)
      return () => ipcRenderer.removeListener('ai:status-changed', h)
    }
  },
  debug: {
    generate: (text) => ipcRenderer.invoke('debug:generate', text)
  }
}

contextBridge.exposeInMainWorld('vox', api)
