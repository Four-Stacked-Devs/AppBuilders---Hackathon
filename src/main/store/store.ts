import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { Commitment, LogEntry, Profile } from '@shared/schemas'

// JSON file store in the user-data folder. The data is tiny, so the whole database is kept
// in memory and rewritten atomically after each change. It is never uploaded anywhere.
export const Db = z.object({
  version: z.literal(1),
  profile: Profile.nullable(),
  entries: z.array(LogEntry),
  commitments: z.array(Commitment).default([]) // older files have none
})
export type Db = z.infer<typeof Db>

const empty = (): Db => ({ version: 1, profile: null, entries: [], commitments: [] })

export type Store = { get: () => Db; update: (fn: (db: Db) => Db) => Db }

export function createStore(file: string): Store {
  let db = load()

  function load(): Db {
    if (!existsSync(file)) return empty()
    try {
      return Db.parse(JSON.parse(readFileSync(file, 'utf8')))
    } catch (err) {
      // Keep the unreadable file for inspection instead of overwriting the user's data.
      const backup = `${file}.corrupt-${Date.now()}`
      renameSync(file, backup)
      console.error(`store: ${file} was unreadable, moved to ${backup}:`, err)
      return empty()
    }
  }

  function save(): void {
    const tmp = `${file}.tmp`
    writeFileSync(tmp, JSON.stringify(db, null, 2))
    renameSync(tmp, file) // atomic: never leaves a half-written file
  }

  return {
    get: (): Db => db,
    update(fn: (db: Db) => Db): Db {
      db = Db.parse(fn(db))
      save()
      return db
    }
  }
}
