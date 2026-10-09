import { describe, it, expect } from 'vitest'
import { habitFindings } from '../src/shared/insights/habits'
import { addDays } from '../src/shared/dates'
import type { LogEntry } from '../src/shared/schemas'

const TODAY = '2026-10-10' // a Saturday
const day = (offset: number): string => addDays(TODAY, offset)

// Synthetic entries: only exercise minutes and sleep matter to these rules.
let n = 0
const entry = (date: string, minutes: number, sleep = 0): LogEntry => ({
  id: `e${n++}`,
  createdAt: `${date}T10:00:00.000Z`,
  date,
  rawText: 'x',
  facts: {
    caloriesEnabled: false,
    items: minutes ? [{ displayName: 'Run', minutes, source: 's' }] : [],
    dayTotals: { activeMinutes: 0, waterGlasses: 0, sleepHours: 0 }
  },
  sleepHours: sleep,
  waterGlasses: 0,
  bodyWeightKg: 0,
  reaction: { text: 'r', source: 'template' },
  seeded: false
})
const ids = (r: ReturnType<typeof habitFindings>): string[] => r.findings.map((f) => f.id)

describe('habitFindings', () => {
  it('needs 3 logged days in the last week before saying anything', () => {
    const r = habitFindings([entry(day(0), 30), entry(day(-1), 30)], TODAY, [])
    expect(r).toEqual({ enough: false, findings: [] })
  })

  it('counts active days and lists the logs behind it', () => {
    const entries = [entry(day(0), 30), entry(day(-1), 0), entry(day(-2), 20), entry(day(-3), 10)]
    const f = habitFindings(entries, TODAY, []).findings.find((x) => x.id === 'active-days')
    expect(f?.text).toBe('You moved on 3 of the last 7 days.')
    expect(f?.entryIds).toHaveLength(3)
  })

  it('flags short sleep only on 3 of the last 5 logged nights', () => {
    const base = [entry(day(0), 0, 5), entry(day(-1), 0, 5), entry(day(-2), 0, 5)]
    const r = habitFindings([...base, entry(day(-3), 0, 8), entry(day(-4), 0, 8)], TODAY, [])
    expect(r.findings.find((x) => x.id === 'short-sleep')?.text).toBe(
      'Your sleep was under 6 hours on 3 of your last 5 logged nights.'
    )
    const two = habitFindings(
      [base[0], base[1], entry(day(-2), 0, 8), entry(day(-3), 0, 8)],
      TODAY,
      []
    )
    expect(ids(two)).not.toContain('short-sleep')
  })

  it('names a clearly most active weekday over 4 weeks', () => {
    // Saturdays (day 0, -7, -14, -21) are active; one Tuesday too. 4 vs 1.
    const sats = [0, -7, -14, -21].map((o) => entry(day(o), 30))
    const r = habitFindings(
      [...sats, entry(day(-4), 20), entry(day(-1), 0), entry(day(-2), 0)],
      TODAY,
      []
    )
    expect(r.findings.find((x) => x.id === 'best-day')?.text).toBe(
      'You tend to be most active on Saturdays.'
    )
    // spread evenly, no clear winner
    const even = [0, -1, -2, -7, -8, -9].map((o) => entry(day(o), 30))
    expect(ids(habitFindings(even, TODAY, []))).not.toContain('best-day')
  })

  it('leaves out insights the person dismissed', () => {
    const entries = [entry(day(0), 30), entry(day(-1), 30), entry(day(-2), 30)]
    expect(ids(habitFindings(entries, TODAY, []))).toContain('active-days')
    expect(ids(habitFindings(entries, TODAY, ['active-days']))).not.toContain('active-days')
  })
})
