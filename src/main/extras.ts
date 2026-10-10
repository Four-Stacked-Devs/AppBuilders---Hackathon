import { writeFileSync } from 'node:fs'
import { BrowserWindow, dialog } from 'electron'
import { db } from './store/db'

// Set/rep logger: one row per set. A personal record is a new best estimated one-rep max
// (Epley: weight x (1 + reps / 30)), shown as an estimate.
export type LiftInput = { exercise: string; reps: number; weightKg: number }
export type LiftRow = {
  id: number
  date: string
  exercise: string
  reps: number
  weightKg: number
  est1rm: number
}

const epley = (w: number, reps: number): number => Math.round(w * (1 + reps / 30) * 10) / 10

export function addLift(i: LiftInput, today: string): { pr: boolean; est1rm: number } {
  const sql = db().sql
  const key = i.exercise.trim().toLowerCase()
  const est = epley(i.weightKg, i.reps)
  const best = sql.prepare('SELECT MAX(est1rm) AS m FROM lifts WHERE exercise = ?').get(key) as {
    m: number | null
  }
  sql
    .prepare(
      'INSERT INTO lifts (date, exercise, reps, weight_kg, est1rm, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(today, key, i.reps, i.weightKg, est, new Date().toISOString())
  return { pr: (best.m ?? 0) > 0 && est > (best.m ?? 0), est1rm: est }
}

export function listLifts(): { recent: LiftRow[]; best: Record<string, number> } {
  const sql = db().sql
  const recent = sql
    .prepare(
      'SELECT id, date, exercise, reps, weight_kg AS weightKg, est1rm FROM lifts ORDER BY id DESC LIMIT 40'
    )
    .all() as LiftRow[]
  const best: Record<string, number> = {}
  for (const r of sql
    .prepare('SELECT exercise, MAX(est1rm) AS m FROM lifts GROUP BY exercise')
    .all() as {
    exercise: string
    m: number
  }[])
    best[r.exercise] = r.m
  return { recent, best }
}

// Saves a copy of everything to a JSON file the person chooses.
export async function exportData(): Promise<{ path: string } | null> {
  const win = BrowserWindow.getAllWindows()[0]
  const res = await dialog.showSaveDialog(win, {
    title: 'Export VOX data',
    defaultPath: `vox-export-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (res.canceled || !res.filePath) return null
  writeFileSync(res.filePath, JSON.stringify(db().get(), null, 2))
  return { path: res.filePath }
}
