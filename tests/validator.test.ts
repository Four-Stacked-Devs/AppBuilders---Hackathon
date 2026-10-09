import { describe, it, expect } from 'vitest'
import { validateReaction } from '../src/main/ai/validator'
import { templateReaction } from '../src/main/ai/templates'
import type { Facts } from '../src/shared/schemas'

// Synthetic facts; the numbers only exercise the validator.
const facts: Facts = {
  caloriesEnabled: true,
  items: [
    {
      displayName: 'Jogging',
      minutes: 30,
      intensity: 'vigorous',
      kcal: 280,
      source: '2024 Adult Compendium'
    }
  ],
  dayTotals: {
    kcalIn: 0,
    kcalOut: 280,
    tdee: 2550,
    activeMinutes: 30,
    waterGlasses: 3,
    sleepHours: 7.5
  }
}

describe('validateReaction', () => {
  it('passes a reply that only uses fact numbers', () =>
    expect(
      validateReaction('Ang galing, 30 minutes ng jogging! Mga 280 kcal yan.', facts, 'adult')
    ).toEqual({ ok: true }))
  it('rejects an invented number', () => {
    const r = validateReaction('Mga 500 kcal ang nagamit mo.', facts, 'adult')
    expect(r).toEqual({ ok: false, reason: 'invented number 500' })
  })
  it('matches "2,550" to 2550 in facts', () =>
    expect(validateReaction('Ang TDEE mo ay mga 2,550.', facts, 'adult').ok).toBe(true))
  it('matches decimals', () =>
    expect(validateReaction('7.5 hours tulog, ayos!', facts, 'adult').ok).toBe(true))
  it.each([
    'bad food',
    'cheat',
    'failed',
    'sobra ka',
    'i-burn',
    'burn it off',
    'punish',
    'mataba',
    'diet ka'
  ])('rejects blocked word "%s"', (w) =>
    expect(validateReaction(`Okay lang, ${w}.`, facts, 'adult').ok).toBe(false)
  )
  it.each(['calorie', 'kcal', 'timbang', 'weight', 'diet', 'magpayat'])(
    'teen-only word "%s" fails only in teen mode',
    (w) => {
      expect(validateReaction(`Tungkol sa ${w}.`, facts, 'teen').ok).toBe(false)
      expect(validateReaction(`Tungkol sa ${w}.`, facts, 'adult').ok).toBe(true)
    }
  )
  it('rejects empty and overlong replies', () => {
    expect(validateReaction('', facts, 'adult').ok).toBe(false)
    expect(validateReaction('a'.repeat(451), facts, 'adult').ok).toBe(false)
  })
})

describe('templateReaction', () => {
  const variants: Facts[] = [
    facts,
    {
      ...facts,
      items: [{ displayName: 'Rice', quantityLabel: '2 cups', kcal: 0, source: 'PhilFCT' }]
    },
    { ...facts, items: [] }
  ]
  it.each(variants.map((f, i) => [i, f] as const))(
    'variant %i always passes the validator',
    (_i, f) => {
      for (const mode of ['adult', 'teen'] as const)
        expect(validateReaction(templateReaction(f), f, mode)).toEqual({ ok: true })
    }
  )
})
