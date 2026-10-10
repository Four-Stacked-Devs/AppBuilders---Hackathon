import { randomUUID } from 'node:crypto'
import { addDays, localDate } from '@shared/dates'
import type { ConfirmResult } from '@shared/schemas'
import { generatePlan } from '@shared/workouts/generate'
import type { FinishInput, LibraryExercise, WorkoutInput, WorkoutPlan } from '@shared/workouts/types'
import exercisesJson from '../../data/exercises.json'
import { confirmLog } from './confirm'
import { db } from './store/db'

const library = exercisesJson as unknown as LibraryExercise[]

type PlanRow = { json: string }

export function createPlan(input: WorkoutInput): WorkoutPlan {
  const teen = db().get().profile?.mode === 'teen'
  const plan = generatePlan(input, library, {
    teen,
    id: randomUUID(),
    createdAt: new Date().toISOString()
  })
  const sql = db().sql
  sql.exec('BEGIN')
  try {
    sql.exec('UPDATE workout_plans SET active = 0')
    sql
      .prepare('INSERT INTO workout_plans (id, json, created_at, active) VALUES (?, ?, ?, 1)')
      .run(plan.id, JSON.stringify(plan), plan.createdAt)
    sql.exec('COMMIT')
  } catch (err) {
    sql.exec('ROLLBACK')
    throw err
  }
  return plan
}

export function activePlan(): WorkoutPlan | null {
  const row = db()
    .sql.prepare('SELECT json FROM workout_plans WHERE active = 1 ORDER BY created_at DESC LIMIT 1')
    .get() as PlanRow | undefined
  return row ? (JSON.parse(row.json) as WorkoutPlan) : null
}

export function listPlans(): WorkoutPlan[] {
  return (
    db().sql.prepare('SELECT json FROM workout_plans ORDER BY created_at DESC LIMIT 20').all() as PlanRow[]
  ).map((r) => JSON.parse(r.json) as WorkoutPlan)
}

export function deletePlan(id: string): void {
  db().sql.prepare('DELETE FROM workout_plans WHERE id = ?').run(id)
}

// Logs the session as a normal entry (so the streak, plans and insights count it) and remembers
// which muscles it worked, for the muscle map.
export async function finishSession(input: FinishInput): Promise<ConfirmResult> {
  const row = db().sql.prepare('SELECT json FROM workout_plans WHERE id = ?').get(input.planId) as PlanRow | undefined
  if (!row) throw new Error('That plan no longer exists.')
  const plan = JSON.parse(row.json) as WorkoutPlan
  const day = plan.days[input.dayIndex]
  if (!day) throw new Error('That workout day does not exist.')
  const result = await confirmLog({
    rawText: `Workout: ${day.name}`,
    items: [{ kind: 'exercise', refId: day.activityId, durationMin: input.minutes, effort: 'unknown' }],
    sleepHours: 0,
    waterGlasses: 0,
    bodyWeightKg: 0,
    safety: null
  })
  const muscles: Record<string, number> = {}
  for (const e of day.exercises)
    for (const m of e.muscles) muscles[m] = (muscles[m] ?? 0) + e.sets
  db()
    .sql.prepare('INSERT INTO workout_sessions (plan_id, day_index, date, minutes, muscles, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(input.planId, input.dayIndex, localDate(), input.minutes, JSON.stringify(muscles), new Date().toISOString())
  return result
}

// Sets worked per muscle over the last 7 days.
export function muscleWeek(): Record<string, number> {
  const rows = db()
    .sql.prepare('SELECT muscles FROM workout_sessions WHERE date >= ?')
    .all(addDays(localDate(), -6)) as { muscles: string }[]
  const out: Record<string, number> = {}
  for (const r of rows)
    for (const [m, n] of Object.entries(JSON.parse(r.muscles) as Record<string, number>)) out[m] = (out[m] ?? 0) + n
  return out
}

export function sessionsThisWeek(): number {
  return (
    db().sql.prepare('SELECT COUNT(*) AS n FROM workout_sessions WHERE date >= ?').get(addDays(localDate(), -6)) as { n: number }
  ).n
}
