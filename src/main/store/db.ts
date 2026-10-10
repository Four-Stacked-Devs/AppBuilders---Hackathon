import { join } from 'node:path'
import { app } from 'electron'
import { createSqliteStore, type SqliteStore } from './sqlite'

let store: SqliteStore | null = null

export const dataFilePath = (): string => join(app.getPath('userData'), 'vox.sqlite')

// The app's single store (SQLite in Electron's user-data folder). Created on first use; an old
// vox-data.json is imported once and kept as a backup next to it.
export function db(): SqliteStore {
  store ??= createSqliteStore(dataFilePath(), join(app.getPath('userData'), 'vox-data.json'))
  return store
}
