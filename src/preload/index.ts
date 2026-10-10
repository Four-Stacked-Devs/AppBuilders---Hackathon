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
  meta: { get: () => ipcRenderer.invoke('meta:get') },
  profile: {
    get: () => ipcRenderer.invoke('profile:get'),
    save: (p) => ipcRenderer.invoke('profile:save', p)
  },
  log: {
    parse: (t) => ipcRenderer.invoke('log:parse', t),
    confirm: (i) => ipcRenderer.invoke('log:confirm', i)
  },
  day: {
    get: (d) => ipcRenderer.invoke('day:get', d),
    entries: (d) => ipcRenderer.invoke('day:entries', d)
  },
  entry: { delete: (id) => ipcRenderer.invoke('entry:delete', id) },
  chat: {
    list: () => ipcRenderer.invoke('chat:list'),
    create: () => ipcRenderer.invoke('chat:create'),
    rename: (id, title) => ipcRenderer.invoke('chat:rename', id, title),
    delete: (id) => ipcRenderer.invoke('chat:delete', id),
    history: (id) => ipcRenderer.invoke('chat:history', id),
    send: (id, text) => ipcRenderer.invoke('chat:send', id, text),
    confirm: (messageId, input) => ipcRenderer.invoke('chat:confirm', messageId, input),
    discard: (messageId) => ipcRenderer.invoke('chat:discard', messageId)
  },
  insights: {
    get: () => ipcRenderer.invoke('insights:get'),
    dismiss: (id) => ipcRenderer.invoke('insights:dismiss', id)
  },
  plan: {
    list: () => ipcRenderer.invoke('plan:list'),
    activities: () => ipcRenderer.invoke('plan:activities'),
    add: (input) => ipcRenderer.invoke('plan:add', input),
    resolve: (id, action) => ipcRenderer.invoke('plan:resolve', id, action)
  },
  streak: { get: () => ipcRenderer.invoke('streak:get') },
  history: { range: (f, t) => ipcRenderer.invoke('history:range', f, t) },
  dev: { seed: () => ipcRenderer.invoke('dev:seed') }
}

contextBridge.exposeInMainWorld('vox', api)
