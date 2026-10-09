import { describe, it, expect } from 'vitest'
import { applyWaterRule, createMatcher, normalizeUnit } from '../src/main/matching/match'
import type { ActivityRow, FoodRow } from '../src/shared/refdata'
import type { ParsedLog } from '../src/shared/schemas'

// Synthetic rows that exercise the matching logic only. The numbers are made up and are
// NOT nutrition or exercise data; real rows live in data/*.json with sources.
const food = (
  id: string,
  name: string,
  aliases: string[],
  portions: FoodRow['portions'],
  defaultUnit: FoodRow['defaultUnit']
): FoodRow => ({
  id,
  name,
  aliases,
  kcalPer100g: 100,
  portions,
  defaultUnit,
  foodGroup: 'test',
  source: 'synthetic test row',
  portionSource: 'synthetic test row'
})
const FOODS: FoodRow[] = [
  food('rice_white_cooked', 'White rice, cooked', ['kanin', 'rice'], { cup: 100 }, 'cup'),
  food('rice_garlic', 'Garlic fried rice', ['sinangag', 'garlic rice'], { cup: 100 }, 'cup'),
  food('tapa_beef', 'Beef tapa', ['tapa'], { serving: 100 }, 'serving'),
  food('egg_fried', 'Egg, fried', ['itlog', 'fried egg'], { piece: 50 }, 'piece'),
  food(
    'chicken_adobo',
    'Chicken adobo',
    ['adobong manok', 'chicken adobo'],
    { serving: 100 },
    'serving'
  ),
  food('pork_adobo', 'Pork adobo', ['adobong baboy', 'adobo'], { serving: 100 }, 'serving')
]
const ACTIVITIES: ActivityRow[] = [
  {
    id: 'jogging_general',
    name: 'Jogging, general',
    aliases: ['jog', 'nag-jog'],
    compendiumCode: '00000',
    met: 1,
    source: 'synthetic test row'
  },
  {
    id: 'walking_moderate',
    name: 'Walking, moderate pace',
    aliases: ['walk', 'lakad'],
    compendiumCode: '00001',
    met: 1,
    source: 'synthetic test row'
  }
]
const COMBOS = { tapsilog: ['tapa_beef', 'rice_garlic', 'egg_fried'] }

const m = createMatcher(FOODS, ACTIVITIES, COMBOS)

const parsed = (p: Partial<ParsedLog>): ParsedLog => ({
  foods: [],
  exercises: [],
  sleepHours: 0,
  waterGlasses: 0,
  bodyWeightKg: 0,
  unclear: [],
  ...p
})

describe('normalizeUnit', () => {
  it.each([
    ['cups', 'cup'],
    ['tasa', 'cup'],
    ['pcs', 'piece'],
    ['piraso', 'piece'],
    ['baso', 'glass'],
    ['mangkok', 'bowl'],
    ['plato', 'plate'],
    ['lata', 'can'],
    ['order', 'serving'],
    ['', 'serving'],
    ['Cup', 'cup']
  ])('%s -> %s', (raw, want) => expect(normalizeUnit(raw)).toBe(want))
})

describe('water rule', () => {
  it('moves a tubig food into waterGlasses when waterGlasses is 0', () => {
    const out = applyWaterRule(parsed({ foods: [{ name: 'tubig', quantity: 5, unit: 'baso' }] }))
    expect(out.foods).toEqual([])
    expect(out.waterGlasses).toBe(5)
  })
  it('keeps the parser value and drops the food when waterGlasses is set', () => {
    const out = applyWaterRule(
      parsed({ foods: [{ name: 'Water', quantity: 2, unit: 'glass' }], waterGlasses: 3 })
    )
    expect(out.foods).toEqual([])
    expect(out.waterGlasses).toBe(3)
  })
  it('leaves other foods alone', () => {
    const out = applyWaterRule(parsed({ foods: [{ name: 'kanin', quantity: 1, unit: 'cup' }] }))
    expect(out.foods).toHaveLength(1)
  })
})

describe('matchFood', () => {
  it('matches an alias exactly, ignoring case and punctuation', () => {
    expect(m.matchFood('Adobong Manok').ref?.id).toBe('chicken_adobo')
    expect(m.matchFood('KANIN!').ref?.id).toBe('rice_white_cooked')
  })
  it('fuzzy-matches a near spelling', () => {
    expect(m.matchFood('adobong manuk').ref?.id).toBe('chicken_adobo')
  })
  it('never guesses an unknown food', () => {
    const r = m.matchFood('sinigang na hipon')
    expect(r.matched).toBe(false)
    expect(r.ref).toBeNull()
  })
})

describe('matchActivity', () => {
  it('treats hyphens like spaces', () =>
    expect(m.matchActivity('nag jog').ref?.id).toBe('jogging_general'))
  it('fuzzy-matches', () => expect(m.matchActivity('jogging').ref?.id).toBe('jogging_general'))
})

describe('matchAll', () => {
  it('builds card rows with canonical units', () => {
    const items = m.matchAll(parsed({ foods: [{ name: 'kanin', quantity: 2, unit: 'cups' }] }))
    expect(items).toEqual([
      expect.objectContaining({
        kind: 'food',
        refId: 'rice_white_cooked',
        quantity: 2,
        unit: 'cup',
        units: ['cup'],
        unitAssumed: false
      })
    ])
  })
  it('falls back to the default unit and flags it', () => {
    const [item] = m.matchAll(parsed({ foods: [{ name: 'adobo', quantity: 1, unit: 'plato' }] }))
    expect(item).toMatchObject({ refId: 'pork_adobo', unit: 'serving', unitAssumed: true })
  })
  it('expands a combo meal into its parts', () => {
    const items = m.matchAll(
      parsed({ foods: [{ name: 'Tapsilog', quantity: 1, unit: 'serving' }] })
    )
    expect(items.map((i) => i.refId)).toEqual(['tapa_beef', 'rice_garlic', 'egg_fried'])
    expect(items.every((i) => i.kind === 'food' && i.fromCombo === 'tapsilog')).toBe(true)
  })
  it('shows an unmatched food with candidates and no ref', () => {
    const [item] = m.matchAll(
      parsed({ foods: [{ name: 'adobong pusit', quantity: 1, unit: 'serving' }] })
    )
    expect(item).toMatchObject({ kind: 'food', refId: null, displayName: 'adobong pusit' })
    if (item.kind === 'food') expect(item.candidates.length).toBeLessThanOrEqual(3)
  })
  it('matches exercises', () => {
    const items = m.matchAll(
      parsed({ exercises: [{ activity: 'walk', durationMin: 30, effort: 'light' }] })
    )
    expect(items[0]).toMatchObject({ kind: 'exercise', refId: 'walking_moderate', durationMin: 30 })
  })
  it('a combo with no sourced parts stays unmatched', () => {
    const empty = createMatcher([], ACTIVITIES, COMBOS)
    const [item] = empty.matchAll(
      parsed({ foods: [{ name: 'tapsilog', quantity: 1, unit: 'serving' }] })
    )
    expect(item).toMatchObject({ kind: 'food', refId: null })
  })
})
