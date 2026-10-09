import { describe, it, expect } from 'vitest'
import { computeStreak, tierFor } from '../src/shared/insights/streak'
import { addDays } from '../src/shared/dates'

const TODAY = '2026-10-10'
// The last `n` days ending `endOffset` days before today, e.g. run(3) = today and the 2 days before.
const run = (n: number, endOffset = 0): string[] =>
  Array.from({ length: n }, (_, i) => addDays(TODAY, -(endOffset + i)))

const streak = (
  dates: string[],
  hour = 12,
  eating: string[] = []
): ReturnType<typeof computeStreak> => computeStreak(dates, TODAY, hour, eating)

describe('computeStreak', () => {
  it('counts consecutive logged days ending today', () => {
    expect(streak(run(5))).toMatchObject({ days: 5, atRisk: false, passUsed: false, best: 5 })
  })

  it('keeps a streak that ended yesterday while today is still open', () => {
    expect(streak(run(4, 1))).toMatchObject({ days: 4, atRisk: false })
  })

  it('is at risk from 19:00 when nothing is logged today', () => {
    expect(streak(run(4, 1), 18).atRisk).toBe(false)
    expect(streak(run(4, 1), 19).atRisk).toBe(true)
    expect(streak(run(4), 21).atRisk).toBe(false)
  })

  it('covers one missed day with a rest pass', () => {
    // today, yesterday logged; 2 days ago missed; 3-5 days ago logged
    const dates = [...run(2), ...run(3, 3)]
    expect(streak(dates)).toMatchObject({ days: 5, passUsed: true })
  })

  it('a missed yesterday is covered while today is still open', () => {
    expect(streak(run(3, 2))).toMatchObject({ days: 3, passUsed: true })
  })

  it('ends on two missed days in a row', () => {
    const dates = [...run(2), ...run(3, 4)] // 2 and 3 days ago missed
    expect(streak(dates).days).toBe(2)
  })

  it('allows only one pass per 7 days', () => {
    // gaps at 2 and 5 days ago: the second pass would be within 7 days of the first
    const dates = [...run(2), ...run(2, 3), ...run(3, 6)]
    expect(streak(dates).days).toBe(4)
    // gaps at 2 and 10 days ago are far enough apart
    const far = [...run(2), ...run(7, 3), ...run(2, 11)]
    expect(streak(far).days).toBe(11)
  })

  it('reports the best run, even after the current one ended', () => {
    const dates = run(12, 20) // a 12-day run that ended 20 days ago
    expect(streak(dates)).toMatchObject({ days: 0, best: 12 })
    expect(streak([]).best).toBe(0)
  })

  it('ignores dates after today and duplicates', () => {
    expect(streak([...run(3), TODAY, addDays(TODAY, 1)]).days).toBe(3)
  })

  it('is hidden for 14 days after an eating safety hit', () => {
    expect(streak(run(5), 12, [addDays(TODAY, -13)]).hidden).toBe(true)
    expect(streak(run(5), 12, [addDays(TODAY, -14)]).hidden).toBe(false)
  })
})

describe('tierFor', () => {
  it.each([
    [0, 'ember'],
    [1, 'spark'],
    [2, 'spark'],
    [3, 'warm'],
    [6, 'warm'],
    [7, 'hot'],
    [13, 'hot'],
    [14, 'blue'],
    [29, 'blue'],
    [30, 'violet'],
    [99, 'violet'],
    [100, 'legend']
  ])('%i days -> %s', (days, tier) => expect(tierFor(days)).toBe(tier))
})
