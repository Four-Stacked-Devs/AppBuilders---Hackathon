import { describe, it, expect } from 'vitest'
import { itemCalc, itemFacts, summarizeDay } from '../src/main/facts'
import { createMatcher } from '../src/main/matching/match'
import type { LogEntry, Profile } from '../src/shared/schemas'

// Synthetic rows and profile: made-up numbers that check the arithmetic and rounding only.
const matcher = createMatcher(
  [
    {
      id: 'f',
      name: 'Food',
      aliases: ['f'],
      kcalPer100g: 130,
      portions: { cup: 158 },
      defaultUnit: 'cup',
      foodGroup: 'test',
      source: 'PhilFCT synthetic',
      portionSource: 'synthetic test'
    }
  ],
  [
    {
      id: 'a',
      name: 'Activity',
      aliases: ['a'],
      compendiumCode: '00000',
      met: 8,
      source: 'synthetic test'
    }
  ],
  {}
)

describe('itemFacts', () => {
  it('computes and rounds food and exercise kcal', () => {
    const facts = itemFacts(
      [
        { kind: 'food', refId: 'f', quantity: 2, unit: 'cup' },
        { kind: 'exercise', refId: 'a', durationMin: 30.4, effort: 'unknown' }
      ],
      { matcher, weightKg: 70, caloriesEnabled: true }
    )
    // 2 × 158 g × 130/100 = 410.8 -> 410;  8 × 70 × 30/60 = 280
    expect(facts).toEqual([
      { displayName: 'Food', quantityLabel: '2 cups', kcal: 410, source: 'PhilFCT' },
      {
        displayName: 'Activity',
        minutes: 30,
        intensity: 'vigorous',
        kcal: 280,
        source: '2024 Adult Compendium'
      }
    ])
  })
  it('leaves out every kcal field when calories are off', () => {
    const facts = itemFacts(
      [{ kind: 'exercise', refId: 'a', durationMin: 30, effort: 'unknown' }],
      { matcher, weightKg: 70, caloriesEnabled: false }
    )
    expect(facts[0]).not.toHaveProperty('kcal')
  })
  it('falls back to the default unit when the unit has no portion', () => {
    const [f] = itemFacts([{ kind: 'food', refId: 'f', quantity: 1, unit: 'bowl' }], {
      matcher,
      weightKg: 70,
      caloriesEnabled: true
    })
    expect(f.quantityLabel).toBe('1 cup')
  })
})

describe('summarizeDay', () => {
  const profile: Profile = {
    nickname: 'T',
    birthDate: '2001-01-01',
    sexForFormula: 'male',
    heightCm: 170,
    weightKg: 70,
    activityLevel: 'moderate',
    goal: 'g',
    mode: 'adult',
    caloriesEnabled: true,
    updatedAt: '2026-10-10T00:00:00.000Z'
  }
  const entry = (p: Partial<LogEntry>): LogEntry => ({
    id: Math.random().toString(),
    createdAt: '2026-10-10T01:00:00.000Z',
    date: '2026-10-10',
    rawText: 'x',
    facts: {
      caloriesEnabled: true,
      items: [],
      dayTotals: { activeMinutes: 0, waterGlasses: 0, sleepHours: 0 }
    },
    sleepHours: 0,
    waterGlasses: 0,
    bodyWeightKg: 0,
    reaction: { text: 'r', source: 'template' },
    seeded: false,
    ...p
  })
  it('sums the day and adds tdee', () => {
    const entries = [
      entry({
        facts: {
          caloriesEnabled: true,
          items: [
            { displayName: 'A', minutes: 30, kcal: 280, source: 's' },
            { displayName: 'F', quantityLabel: '1 cup', kcal: 200, source: 's' }
          ],
          dayTotals: { activeMinutes: 0, waterGlasses: 0, sleepHours: 0 }
        },
        waterGlasses: 3
      }),
      entry({ waterGlasses: 2, sleepHours: 7, seeded: true }),
      entry({ date: '2026-10-09', waterGlasses: 9 })
    ]
    // bmr(male, 70, 170, 25) = 1642.5; × 1.55 = 2545.9 -> 2550
    expect(summarizeDay('2026-10-10', entries, profile, 25)).toMatchObject({
      kcalIn: 200,
      kcalOut: 280,
      tdee: 2550,
      activeMinutes: 30,
      waterGlasses: 5,
      sleepHours: 7,
      entryCount: 2,
      includesDemoData: true,
      bodyWeightKg: null
    })
  })
  it('omits energy fields when calories are off', () => {
    const s = summarizeDay('2026-10-10', [entry({})], { ...profile, caloriesEnabled: false }, 25)
    expect(s).not.toHaveProperty('kcalIn')
    expect(s).not.toHaveProperty('tdee')
  })
})

describe('itemCalc', () => {
  const items = [
    { kind: 'food' as const, refId: 'f', quantity: 2, unit: 'cup' },
    { kind: 'exercise' as const, refId: 'a', durationMin: 30.4, effort: 'unknown' as const }
  ]
  it('carries the inputs and gives the same kcal as itemFacts', () => {
    const ctx = { matcher, weightKg: 70, caloriesEnabled: true }
    const calc = itemCalc(items, ctx)
    const facts = itemFacts(items, ctx)
    expect(calc.map((c) => c.kcal)).toEqual(facts.map((f) => f.kcal))
    expect(calc[0]).toMatchObject({
      kind: 'food',
      refId: 'f',
      quantity: 2,
      unit: 'cup',
      grams: 316,
      kcalPer100g: 130
    })
    expect(calc[1]).toMatchObject({
      kind: 'exercise',
      refId: 'a',
      minutes: 30,
      met: 8,
      weightKg: 70,
      compendiumCode: '00000',
      intensity: 'vigorous'
    })
  })
  it('leaves out kcal and weight when calories are off', () => {
    const calc = itemCalc(items, { matcher, weightKg: 70, caloriesEnabled: false })
    for (const c of calc) expect(c).not.toHaveProperty('kcal')
    expect(calc[1]).not.toHaveProperty('weightKg')
    expect(calc[0]).not.toHaveProperty('kcalPer100g')
  })
})

describe('removeEntry', () => {
  it('drops the entry and its minutes from the day', async () => {
    const { removeEntry } = await import('../src/main/facts')
    const base = {
      createdAt: '2026-10-10T01:00:00.000Z',
      date: '2026-10-10',
      rawText: 'x',
      sleepHours: 0,
      waterGlasses: 0,
      bodyWeightKg: 0,
      reaction: { text: 'r', source: 'template' as const },
      seeded: false
    }
    const facts = (minutes: number): LogEntry['facts'] => ({
      caloriesEnabled: false,
      items: [{ displayName: 'A', minutes, source: 's' }],
      dayTotals: { activeMinutes: 0, waterGlasses: 0, sleepHours: 0 }
    })
    const entries: LogEntry[] = [
      { ...base, id: 'keep', facts: facts(20) },
      { ...base, id: 'drop', facts: facts(30) }
    ]
    const out = removeEntry(entries, 'drop')
    expect(out.deleted).toBe(true)
    expect(summarizeDay('2026-10-10', out.entries, null, 30).activeMinutes).toBe(20)
    expect(removeEntry(entries, 'missing')).toEqual({ entries, deleted: false })
  })
})
