import { describe, it, expect } from 'vitest'
import { summarizeRange, weightChange } from '../src/shared/calc'
import type { DaySummary } from '../src/shared/schemas'

// Synthetic days that check the arithmetic only. Not real logs.
const day = (date: string, p: Partial<DaySummary> = {}): DaySummary => ({
  date,
  activeMinutes: 0,
  waterGlasses: 0,
  sleepHours: 0,
  bodyWeightKg: null,
  entryCount: 0,
  latestReaction: null,
  includesDemoData: false,
  ...p
})

describe('summarizeRange', () => {
  it('counts logged days and totals active minutes', () => {
    const s = summarizeRange([
      day('2026-10-05', { entryCount: 2, activeMinutes: 30 }),
      day('2026-10-06'),
      day('2026-10-07', { entryCount: 1, activeMinutes: 45 })
    ])
    expect(s).toMatchObject({ days: 3, daysLogged: 2, activeMinutes: 75 })
  })
  it('averages only days that have a value, rounded for display', () => {
    const s = summarizeRange([
      day('2026-10-05', { entryCount: 1, sleepHours: 7, waterGlasses: 6, kcalIn: 1840 }),
      day('2026-10-06', { entryCount: 1, sleepHours: 8, waterGlasses: 0, kcalIn: 2013 }),
      day('2026-10-07')
    ])
    expect(s.avgSleepHours).toBe(7.5)
    expect(s.avgWaterGlasses).toBe(6)
    expect(s.avgKcalIn).toBe(1930) // (1840 + 2013) / 2 = 1926.5 -> nearest 10
  })
  it('returns null averages when nothing was logged or calories are off', () => {
    const s = summarizeRange([day('2026-10-05', { entryCount: 1, activeMinutes: 20 })])
    expect(s.avgSleepHours).toBeNull()
    expect(s.avgWaterGlasses).toBeNull()
    expect(s.avgKcalIn).toBeNull()
    expect(summarizeRange([]).daysLogged).toBe(0)
  })
})

describe('weightChange', () => {
  it('compares the latest weigh-in with the first one in range', () => {
    expect(
      weightChange([
        day('2026-09-01', { bodyWeightKg: 70.2 }),
        day('2026-09-02'),
        day('2026-09-20', { bodyWeightKg: 69.05 })
      ])
    ).toEqual({ latestKg: 69.1, changeKg: -1.2, since: '2026-09-01' })
  })
  it('is null with no weigh-ins', () => {
    expect(weightChange([day('2026-09-01')])).toBeNull()
  })
})
