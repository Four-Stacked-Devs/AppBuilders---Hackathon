import { randomUUID } from 'node:crypto'
import { addDays, localDate } from '@shared/dates'
import { needsComeback, nudgesOff, planStatus, restWarning, shrink } from '@shared/insights/plans'
import type { Commitment, PlanAction, PlanAddInput, PlanList } from '@shared/schemas'
import { ACTIVITIES } from './matching/match'
import { db } from './store/db'

const MAX_PER_DAY = 12

// Plans around today (yesterday, today, tomorrow) with their status, plus the comeback and
// rest flags. Everything is computed from the saved entries; nothing is stored as "missed".
export function listPlans(): PlanList {
  const { commitments, entries } = db().get()
  const today = localDate()
  const from = addDays(today, -1)
  const to = addDays(today, 1)
  const off = nudgesOff(
    entries.filter((e) => e.safety === 'eating').map((e) => e.date),
    today
  )
  return {
    plans: commitments
      .filter((c) => c.date >= from && c.date <= to)
      .map((c) => ({ ...c, status: planStatus(c, entries, today) })),
    comeback:
      !off &&
      needsComeback(
        entries.map((e) => e.date),
        today
      ),
    rest: restWarning(entries, today),
    nudgesOff: off
  }
}

export const listActivities = (): { id: string; name: string }[] =>
  ACTIVITIES.map((a) => ({ id: a.id, name: a.name }))

const countFor = (commitments: Commitment[], date: string): number =>
  commitments.filter((c) => c.date === date && c.resolution !== 'dropped').length

function create(
  commitments: Commitment[],
  input: { date: string; activityRefId: string; minutes: number; cue?: string }
): Commitment {
  const activity = ACTIVITIES.find((a) => a.id === input.activityRefId)
  if (!activity) throw new Error('Unknown activity.')
  if (countFor(commitments, input.date) >= MAX_PER_DAY)
    throw new Error('That day already has a lot of plans.')
  return {
    id: randomUUID(),
    date: input.date,
    activityRefId: activity.id,
    activityName: activity.name,
    minutes: input.minutes,
    ...(input.cue ? { cue: input.cue } : {}),
    createdAt: new Date().toISOString()
  }
}

export function addPlan(input: PlanAddInput): Commitment {
  const today = localDate()
  if (input.date !== today && input.date !== addDays(today, 1))
    throw new Error('Plans are for today or tomorrow.')
  let made: Commitment | undefined
  db().update((d) => {
    made = create(d.commitments, input)
    return { ...d, commitments: [...d.commitments, made] }
  })
  return made as Commitment
}

// A missed plan can be tried again tomorrow, made smaller, or dropped. The original is marked as
// dealt with so it stops being offered.
export function resolvePlan(id: string, action: PlanAction): { ok: true } {
  const tomorrow = addDays(localDate(), 1)
  db().update((d) => {
    const old = d.commitments.find((c) => c.id === id)
    if (!old) throw new Error('That plan no longer exists.')
    const marked = d.commitments.map((c) =>
      c.id === id
        ? {
            ...c,
            resolution: (action === 'retry'
              ? 'retried'
              : action === 'shrink'
                ? 'shrunk'
                : 'dropped') as Commitment['resolution']
          }
        : c
    )
    if (action === 'drop') return { ...d, commitments: marked }
    const next = create(marked, {
      date: tomorrow,
      activityRefId: old.activityRefId,
      minutes: action === 'shrink' ? shrink(old.minutes) : old.minutes,
      cue: old.cue
    })
    return { ...d, commitments: [...marked, next] }
  })
  return { ok: true }
}
