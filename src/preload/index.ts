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
  profile: {
    get: () => ipcRenderer.invoke('profile:get'),
    save: (p) => ipcRenderer.invoke('profile:save', p)
  },
  log: {
    parse: (t) => ipcRenderer.invoke('log:parse', t),
    confirm: (i) => ipcRenderer.invoke('log:confirm', i)
  },
  day: { get: (d) => ipcRenderer.invoke('day:get', d) },
  history: { range: (f, t) => ipcRenderer.invoke('history:range', f, t) },
  dev: { seed: () => ipcRenderer.invoke('dev:seed') }
}

contextBridge.exposeInMainWorld('vox', api)
