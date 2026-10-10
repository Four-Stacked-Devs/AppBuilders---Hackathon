import { existsSync, readFileSync, copyFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { Commitment, LogEntry, Profile } from '@shared/schemas'
import { Db, type Store } from './store'

// SQLite storage (node:sqlite, built into Electron's Node: no native module to rebuild).
//  - The whole database stays in memory for fast reads; only changed rows are written, in one
//    transaction, so saving a log no longer rewrites the entire history.
//  - Rows that no longer validate are kept in `bad_rows` instead of making the app start empty.
//  - The old vox-data.json is imported once and left in place as a backup.
//  - Chat, taught words and other new data use the same file through `sql`.

export type SqliteStore = Store & { sql: DatabaseSync }

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY, date TEXT NOT NULL, created_at TEXT NOT NULL, json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS entries_date ON entries (date);
CREATE TABLE IF NOT EXISTS commitments (
  id TEXT PRIMARY KEY, date TEXT NOT NULL, json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS commitments_date ON commitments (date);
CREATE TABLE IF NOT EXISTS dismissed (id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS bad_rows (tbl TEXT, id TEXT, json TEXT, error TEXT);
CREATE TABLE IF NOT EXISTS aliases (
  alias TEXT PRIMARY KEY, kind TEXT NOT NULL, ref_id TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL, role TEXT NOT NULL,
  kind TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_conv ON messages (conversation_id, id);
`

type Row = { json: string; id?: string }

export function createSqliteStore(file: string, legacyJson?: string): SqliteStore {
  const sql = new DatabaseSync(file)
  sql.exec(SCHEMA)
  sql.prepare("INSERT OR IGNORE INTO meta (k, v) VALUES ('schema_version', '2')").run()

  const bad = (tbl: string, id: string, json: string, err: unknown): void => {
    sql.prepare('INSERT INTO bad_rows (tbl, id, json, error) VALUES (?, ?, ?, ?)').run(tbl, id, json, String(err))
  }

  function load(): Db {
    const profileRow = sql.prepare('SELECT json FROM profile WHERE id = 1').get() as Row | undefined
    let profile: Profile | null = null
    if (profileRow) {
      const r = Profile.safeParse(JSON.parse(profileRow.json))
      if (r.success) profile = r.data
      else bad('profile', '1', profileRow.json, r.error)
    }
    const entries: LogEntry[] = []
    for (const row of sql.prepare('SELECT id, json FROM entries ORDER BY created_at').all() as Row[]) {
      const r = LogEntry.safeParse(JSON.parse(row.json))
      if (r.success) entries.push(r.data)
      else bad('entries', row.id ?? '', row.json, r.error)
    }
    const commitments: Commitment[] = []
    for (const row of sql.prepare('SELECT id, json FROM commitments').all() as Row[]) {
      const r = Commitment.safeParse(JSON.parse(row.json))
      if (r.success) commitments.push(r.data)
      else bad('commitments', row.id ?? '', row.json, r.error)
    }
    const dismissed = (sql.prepare('SELECT id FROM dismissed').all() as { id: string }[]).map((d) => d.id)
    return { version: 1, profile, entries, commitments, dismissed }
  }

  let db = load()

  // One-time import of the old JSON file, when this database is brand new.
  const migrated = sql.prepare("SELECT v FROM meta WHERE k = 'imported_json'").get()
  if (!migrated && legacyJson && existsSync(legacyJson) && !db.profile && db.entries.length === 0) {
    try {
      const old = Db.parse(JSON.parse(readFileSync(legacyJson, 'utf8')))
      copyFileSync(legacyJson, `${legacyJson}.v1.bak.json`)
      persist({ version: 1, profile: null, entries: [], commitments: [], dismissed: [] }, old)
      db = old
    } catch (err) {
      console.error('store: could not import the old data file (left untouched):', err)
    }
    sql.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('imported_json', '1')").run()
  } else if (!migrated) sql.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('imported_json', '0')").run()

  // Write only what changed between `a` and `b`, in one transaction.
  function persist(a: Db, b: Db): void {
    sql.exec('BEGIN')
    try {
      if (a.profile !== b.profile) {
        if (b.profile)
          sql.prepare('INSERT OR REPLACE INTO profile (id, json) VALUES (1, ?)').run(JSON.stringify(b.profile))
        else sql.prepare('DELETE FROM profile WHERE id = 1').run()
      }
      syncRows('entries', a.entries, b.entries, (e) => [e.id, e.date, e.createdAt])
      syncRows('commitments', a.commitments, b.commitments, (c) => [c.id, c.date])
      if (a.dismissed !== b.dismissed) {
        sql.exec('DELETE FROM dismissed')
        const ins = sql.prepare('INSERT OR IGNORE INTO dismissed (id) VALUES (?)')
        for (const id of b.dismissed) ins.run(id)
      }
      sql.exec('COMMIT')
    } catch (err) {
      sql.exec('ROLLBACK')
      throw err
    }
  }

  function syncRows<T extends { id: string }>(
    table: 'entries' | 'commitments',
    before: T[],
    after: T[],
    cols: (row: T) => string[]
  ): void {
    if (before === after) return
    const old = new Map(before.map((r) => [r.id, r]))
    const seen = new Set<string>()
    const sample = after[0] ? cols(after[0]) : []
    const placeholders = [...sample.map(() => '?'), '?'].join(', ')
    const names = table === 'entries' ? 'id, date, created_at, json' : 'id, date, json'
    const up = sql.prepare(`INSERT OR REPLACE INTO ${table} (${names}) VALUES (${placeholders})`)
    for (const r of after) {
      seen.add(r.id)
      if (old.get(r.id) === r) continue // unchanged: same object as before
      up.run(...cols(r), JSON.stringify(r))
    }
    const del = sql.prepare(`DELETE FROM ${table} WHERE id = ?`)
    for (const id of old.keys()) if (!seen.has(id)) del.run(id)
  }

  return {
    sql,
    get: () => db,
    update(fn) {
      const next = fn(db)
      // Validate only what changed, not the whole history.
      if (next.profile !== db.profile && next.profile) Profile.parse(next.profile)
      if (next.entries !== db.entries) {
        const old = new Set(db.entries)
        for (const e of next.entries) if (!old.has(e)) LogEntry.parse(e)
      }
      if (next.commitments !== db.commitments) {
        const old = new Set(db.commitments)
        for (const c of next.commitments) if (!old.has(c)) Commitment.parse(c)
      }
      persist(db, next)
      db = next
      return db
    }
  }
}
