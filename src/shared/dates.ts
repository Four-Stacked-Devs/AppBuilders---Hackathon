// Local calendar day as "YYYY-MM-DD" (never UTC, so late-night logs land on the right day).
export const localDate = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return localDate(new Date(y, m - 1, d + days))
}

const parts = (date: string): [number, number, number] =>
  date.split('-').map(Number) as [number, number, number]

export type Period = 'day' | 'week' | 'month'

// Monday of the week containing `date` (weeks run Monday to Sunday, as in the wireframes).
export function startOfWeek(date: string): string {
  const [y, m, d] = parts(date)
  const dow = new Date(y, m - 1, d).getDay() // 0 = Sunday
  return addDays(date, -((dow + 6) % 7))
}

export function monthBounds(date: string): { from: string; to: string } {
  const [y, m] = parts(date)
  return { from: localDate(new Date(y, m - 1, 1)), to: localDate(new Date(y, m, 0)) }
}

// First day of the month `n` months away.
export function addMonths(date: string, n: number): string {
  const [y, m] = parts(date)
  return localDate(new Date(y, m - 1 + n, 1))
}

export function periodRange(period: Period, anchor: string): { from: string; to: string } {
  if (period === 'day') return { from: anchor, to: anchor }
  if (period === 'week') {
    const from = startOfWeek(anchor)
    return { from, to: addDays(from, 6) }
  }
  return monthBounds(anchor)
}

export function shiftPeriod(period: Period, anchor: string, dir: -1 | 1): string {
  if (period === 'day') return addDays(anchor, dir)
  if (period === 'week') return addDays(anchor, 7 * dir)
  return addMonths(anchor, dir)
}

// The › button: only while the next period starts on or before today.
export function canGoNext(period: Period, anchor: string, today: string): boolean {
  return periodRange(period, shiftPeriod(period, anchor, 1)).from <= today
}
