import { join } from 'node:path'
import { app } from 'electron'
import { createStore, type Store } from './store'

let store: Store | null = null

// The app's single store, in Electron's user-data folder. Created on first use.
export function db(): Store {
  store ??= createStore(join(app.getPath('userData'), 'vox-data.json'))
  return store
}
