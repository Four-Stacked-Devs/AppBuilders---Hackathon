import { describe, it, expect } from 'vitest'
import { parseThemePref } from '../src/renderer/src/theme'
import { greeting } from '../src/renderer/src/format'

describe('parseThemePref', () => {
  it('keeps valid values', () => {
    expect(parseThemePref('light')).toBe('light')
    expect(parseThemePref('dark')).toBe('dark')
    expect(parseThemePref('system')).toBe('system')
  })
  it('falls back to system for missing or junk values', () => {
    expect(parseThemePref(null)).toBe('system')
    expect(parseThemePref('blue')).toBe('system')
    expect(parseThemePref(42)).toBe('system')
  })
})

describe('greeting', () => {
  it('follows local time of day', () => {
    expect(greeting(5)).toBe('Good morning')
    expect(greeting(11)).toBe('Good morning')
    expect(greeting(12)).toBe('Good afternoon')
    expect(greeting(17)).toBe('Good afternoon')
    expect(greeting(18)).toBe('Good evening')
    expect(greeting(0)).toBe('Good evening')
  })
})

describe('working steps', () => {
  it('advances by elapsed time and stays on the last step', async () => {
    const { stepAt, STEPS } = await import('../src/renderer/src/tips')
    expect(stepAt('parse', 0)).toBe(0)
    expect(stepAt('parse', 1999)).toBe(0)
    expect(stepAt('parse', 2000)).toBe(1)
    expect(stepAt('parse', 60_000)).toBe(STEPS.parse.length - 1)
    expect(stepAt('confirm', 1000)).toBe(1)
  })
})

describe('calcLine', () => {
  it('shows the exercise formula when calories are on', async () => {
    const { calcLine } = await import('../src/renderer/src/format')
    expect(
      calcLine({
        kind: 'exercise',
        refId: 'b',
        name: 'Basketball, general',
        minutes: 120,
        met: 7.5,
        intensity: 'vigorous',
        compendiumCode: '15055',
        weightKg: 70,
        kcal: 1050,
        source: '2024 Adult Compendium'
      })
    ).toBe(
      'Basketball, general: 7.5 MET (2024 Adult Compendium 15055) × 70 kg × 2 h ≈ 1050 kcal, rounded to the nearest 10. An estimate.'
    )
  })
  it('never shows kcal or weight when calories are off', async () => {
    const { calcLine } = await import('../src/renderer/src/format')
    const line = calcLine({
      kind: 'exercise',
      refId: 'w',
      name: 'Walking, moderate pace',
      minutes: 45,
      met: 3.8,
      intensity: 'moderate',
      compendiumCode: '17190',
      source: '2024 Adult Compendium'
    })
    expect(line).toBe(
      'Walking, moderate pace: 45 min, moderate (3.8 MET, 2024 Adult Compendium 17190).'
    )
    expect(line).not.toMatch(/kcal|kg/)
  })
  it('shows the food formula with the PhilFCT food id', async () => {
    const { calcLine } = await import('../src/renderer/src/format')
    expect(
      calcLine({
        kind: 'food',
        refId: 'r',
        name: 'White rice, cooked',
        quantity: 2,
        unit: 'cup',
        grams: 316,
        kcalPer100g: 129,
        kcal: 410,
        source:
          'PhilFCT (DOST-FNRI, Release 1 December 2019), A020 "Rice, well-milled, boiled", i.fnri.dost.gov.ph/fct/library/report/2982, accessed 2026-10-10'
      })
    ).toBe(
      'White rice, cooked: 2 cup = 316 g × 129 kcal per 100 g (PhilFCT A020) ≈ 410 kcal, rounded to the nearest 10. An estimate.'
    )
  })
  it('food without calories shows the amount only', async () => {
    const { calcLine } = await import('../src/renderer/src/format')
    expect(
      calcLine({
        kind: 'food',
        refId: 'r',
        name: 'Pandesal',
        quantity: 2,
        unit: 'piece',
        grams: 60,
        source: 'Product label, accessed 2026-10-10'
      })
    ).toBe('Pandesal: 2 piece = 60 g (product label).')
  })
})

describe('entrySummary', () => {
  const entry = {
    id: 'e', createdAt: '2026-10-10T01:00:00.000Z', date: '2026-10-10', rawText: 'x',
    facts: {
      caloriesEnabled: true,
      items: [
        { displayName: 'Jogging, general', minutes: 30, intensity: 'vigorous' as const, kcal: 230, source: 's' },
        { displayName: 'Rice', quantityLabel: '2 cups', kcal: 410, source: 's' }
      ],
      dayTotals: { activeMinutes: 0, waterGlasses: 0, sleepHours: 0 }
    },
    sleepHours: 7, waterGlasses: 3, bodyWeightKg: 70.5,
    reaction: { text: 'r', source: 'template' as const }, seeded: false
  }
  it('lists items and extras without kcal', async () => {
    const { entrySummary } = await import('../src/renderer/src/format')
    expect(entrySummary(entry, true)).toBe('Jogging, general 30 min · Rice 2 cups · 3 glasses water · 7 h sleep · 70.5 kg')
    expect(entrySummary(entry, false)).not.toMatch(/kg/)
  })
  it('says when nothing was saved', async () => {
    const { entrySummary } = await import('../src/renderer/src/format')
    expect(entrySummary({ ...entry, facts: { ...entry.facts, items: [] }, sleepHours: 0, waterGlasses: 0, bodyWeightKg: 0 }, true)).toBe('Nothing to count')
  })
})
