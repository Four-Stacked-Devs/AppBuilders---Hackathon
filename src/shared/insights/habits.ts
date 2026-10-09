import { addDays } from '../dates'
import type { FindingId, LogEntry } from '../schemas'

// Habit patterns from the last week of logs, by plain rules (no AI). Each one lists the entries
// behind it so the person can check it. Neutral on purpose: nothing about food, weight or
// calories, and nothing that counts a quiet day against anyone. Pure: `today` is passed in.

export type RawFinding = { id: FindingId; text: string; entryIds: string[] }

const MIN_LOGGED_DAYS = 3
const WEEKDAYS = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays'
]

const weekday = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

const exerciseMinutes = (e: LogEntry): number =>
  e.facts.items.reduce((n, i) => n + (i.minutes ?? 0), 0)

const dayRange = (today: string, days: number): string[] =>
  Array.from({ length: days }, (_, i) => addDays(today, -(days - 1 - i)))

export function habitFindings(
  entries: LogEntry[],
  today: string,
  dismissed: string[]
): { enough: boolean; findings: RawFinding[] } {
  const week = new Set(dayRange(today, 7))
  const inWeek = entries.filter((e) => week.has(e.date))
  const loggedDays = new Set(inWeek.map((e) => e.date))
  if (loggedDays.size < MIN_LOGGED_DAYS) return { enough: false, findings: [] }

  const found: RawFinding[] = []

  // 1. How many of the last 7 days included exercise.
  const moved = inWeek.filter((e) => exerciseMinutes(e) > 0)
  const movedDays = new Set(moved.map((e) => e.date)).size
  if (movedDays > 0)
    found.push({
      id: 'active-days',
      text: `You moved on ${movedDays} of the last 7 days.`,
      entryIds: moved.map((e) => e.id)
    })

  // 2. Short sleep on at least 3 of the last 5 nights that have sleep logged.
  const sleepByDay = new Map<string, number>()
  for (const e of inWeek)
    if (e.sleepHours > 0) sleepByDay.set(e.date, (sleepByDay.get(e.date) ?? 0) + e.sleepHours)
  const nights = [...sleepByDay.keys()].sort().slice(-5)
  const shortNights = nights.filter((d) => (sleepByDay.get(d) ?? 0) < 6)
  if (nights.length >= 3 && shortNights.length >= 3)
    found.push({
      id: 'short-sleep',
      text: `Your sleep was under 6 hours on ${shortNights.length} of your last ${nights.length} logged nights.`,
      entryIds: inWeek
        .filter((e) => e.sleepHours > 0 && shortNights.includes(e.date))
        .map((e) => e.id)
    })

  // 3. The weekday with clearly the most active days over the last 4 weeks.
  const month = new Set(dayRange(today, 28))
  const activeByDate = new Map<string, string[]>()
  for (const e of entries)
    if (month.has(e.date) && exerciseMinutes(e) > 0)
      activeByDate.set(e.date, [...(activeByDate.get(e.date) ?? []), e.id])
  const perWeekday = new Array<number>(7).fill(0)
  for (const d of activeByDate.keys()) perWeekday[weekday(d)]++
  const top = Math.max(...perWeekday)
  const best = perWeekday.indexOf(top)
  const second = Math.max(...perWeekday.filter((_, i) => i !== best))
  if (top >= 3 && top - second >= 2)
    found.push({
      id: 'best-day',
      text: `You tend to be most active on ${WEEKDAYS[best]}.`,
      entryIds: [...activeByDate.entries()]
        .filter(([d]) => weekday(d) === best)
        .flatMap(([, ids]) => ids)
    })

  return { enough: true, findings: found.filter((f) => !dismissed.includes(f.id)) }
}
