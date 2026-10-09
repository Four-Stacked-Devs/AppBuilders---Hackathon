import { addDays } from '../dates'
import type { Commitment, LogEntry, PlanStatus } from '../schemas'

// Rules behind "Plano ko bukas". Pure: dates come in as parameters. A missed day is information,
// never a failing, so nothing here counts misses against the person.

// A plan is kept when exercise of the same activity on its day adds up to at least half of the
// planned minutes. Kept wins even if the plan was already marked as dealt with.
export function planStatus(c: Commitment, entries: LogEntry[], today: string): PlanStatus {
  const done = entries
    .filter((e) => e.date === c.date)
    .flatMap((e) => e.calc ?? [])
    .reduce((n, i) => (i.kind === 'exercise' && i.refId === c.activityRefId ? n + i.minutes : n), 0)
  if (done >= Math.ceil(c.minutes / 2)) return 'kept'
  if (c.resolution) return 'resolved'
  return c.date >= today ? 'pending' : 'missed'
}

// The smaller step offered after a missed plan: half the minutes, to the nearest 5, at least 5.
export const shrink = (minutes: number): number => Math.max(5, Math.round(minutes / 2 / 5) * 5)

const dayNum = (d: string): number => {
  const [y, m, day] = d.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, day) / 86_400_000)
}
const daysBetween = (from: string, to: string): number => dayNum(to) - dayNum(from)

// Nothing logged for 3 or more days, after logging at least once before.
export function needsComeback(entryDates: string[], today: string): boolean {
  const past = entryDates.filter((d) => d <= today).sort()
  if (past.length === 0) return false
  return daysBetween(past[past.length - 1], today) >= 3
}

// Hard training on each of the last 3 days (at least 120 vigorous minutes) with sleep logged
// under 6 hours each day. Sleep that was not logged is not "little sleep".
export function restWarning(entries: LogEntry[], today: string): boolean {
  return [-2, -1, 0].every((offset) => {
    const d = addDays(today, offset)
    const day = entries.filter((e) => e.date === d)
    const vigorous = day
      .flatMap((e) => e.facts.items)
      .reduce((n, i) => (i.intensity === 'vigorous' ? n + (i.minutes ?? 0) : n), 0)
    const sleep = day.reduce((n, e) => n + e.sleepHours, 0)
    return vigorous >= 120 && sleep > 0 && sleep < 6
  })
}

// Nudges to do more are off for 14 days after an eating-related safety message.
export const nudgesOff = (eatingDates: string[], today: string): boolean =>
  eatingDates.some((d) => d <= today && daysBetween(d, today) < 14)
