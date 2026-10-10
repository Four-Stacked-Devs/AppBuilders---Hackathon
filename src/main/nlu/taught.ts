import { db } from '../store/db'
import { taught } from '../matching/match'
import { resetNluIndex } from './parseRules'

// Words the person taught VOX ("ensaymada" is this food). Stored in SQLite, used by both the
// matcher and the Taglish reader from then on.

export type Taught = { alias: string; kind: 'food' | 'activity'; refId: string }

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function listTaught(): Taught[] {
  return (
    db().sql.prepare('SELECT alias, kind, ref_id AS refId FROM aliases').all() as Taught[]
  )
}

export function loadTaught(): void {
  taught.clear()
  for (const t of listTaught()) taught.set(norm(t.alias), { kind: t.kind, refId: t.refId })
  resetNluIndex()
}

export function saveTaught(items: Taught[]): void {
  if (items.length === 0) return
  const ins = db().sql.prepare(
    'INSERT OR REPLACE INTO aliases (alias, kind, ref_id, created_at) VALUES (?, ?, ?, ?)'
  )
  const t = new Date().toISOString()
  for (const i of items) ins.run(norm(i.alias), i.kind, i.refId, t)
  loadTaught()
}
