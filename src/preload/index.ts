// Sandboxed preload: only contextBridge and ipcRenderer from electron, no npm imports.
import { contextBridge, ipcRenderer } from 'electron'
import type { VoxApi } from '../shared/api'
import type { AiStatus } from '../shared/status'

const api: VoxApi = {
  tts: {
    speak: (t) => ipcRenderer.invoke('tts:speak', t),
    stop: () => ipcRenderer.invoke('tts:stop')
  },
  ai: {
    assist: (task, ctx) => ipcRenderer.invoke('ai:assist', task, ctx),
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
  lifts: { add: (i) => ipcRenderer.invoke('lifts:add', i), list: () => ipcRenderer.invoke('lifts:list') },
  data: { export: () => ipcRenderer.invoke('data:export') },
  app: {
    onQuickCapture: (cb) => {
      const h = (): void => cb()
      ipcRenderer.on('vox:quick-capture', h)
      return () => ipcRenderer.removeListener('vox:quick-capture', h)
    }
  },
  meals: {
    custom: (i) => ipcRenderer.invoke('meals:custom', i),
    generate: (input) => ipcRenderer.invoke('meals:generate', input),
    active: () => ipcRenderer.invoke('meals:active'),
    recipes: () => ipcRenderer.invoke('meals:recipes'),
    swap: (id, day, slot) => ipcRenderer.invoke('meals:swap', id, day, slot)
  },
  workout: {
    library: () => ipcRenderer.invoke('workout:library'),
    setActive: (id) => ipcRenderer.invoke('workout:setActive', id),
    custom: (i) => ipcRenderer.invoke('workout:custom', i),
    generate: (input) => ipcRenderer.invoke('workout:generate', input),
    active: () => ipcRenderer.invoke('workout:active'),
    list: () => ipcRenderer.invoke('workout:list'),
    delete: (id) => ipcRenderer.invoke('workout:delete', id),
    finish: (input) => ipcRenderer.invoke('workout:finish', input),
    muscles: () => ipcRenderer.invoke('workout:muscles')
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
  streak: {
    get: () => ipcRenderer.invoke('streak:get'),
    run: () => ipcRenderer.invoke('streak:run')
  },
  history: { range: (f, t) => ipcRenderer.invoke('history:range', f, t) },
  dev: { seed: () => ipcRenderer.invoke('dev:seed'), clear: () => ipcRenderer.invoke('dev:clear') }
}

contextBridge.exposeInMainWorld('vox', api)
