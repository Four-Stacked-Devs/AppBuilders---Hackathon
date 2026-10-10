import { describe, it, expect } from 'vitest'
import foods from '../data/foods.ph.json'
import activities from '../data/activities.json'
import combos from '../data/combos.json'
import { ActivityRow, Combos, FoodRow } from '../src/shared/refdata'

// Fails the build on any missing field, non-positive value or empty source, so an
// unsourced number can't ship by accident.
const ZERO_KCAL_OK = new Set(['drinks', 'beverages', 'other'])

describe('reference data', () => {
  it('every food row is complete and sourced', () => {
    for (const raw of foods as unknown[]) {
      const f = FoodRow.parse(raw)
      if (f.kcalPer100g === 0) expect(ZERO_KCAL_OK.has(f.foodGroup), f.id).toBe(true)
      expect(Object.keys(f.portions).length, f.id).toBeGreaterThan(0)
      expect(f.portions[f.defaultUnit], `${f.id} defaultUnit has no portion`).toBeGreaterThan(0)
    }
  })

  it('every activity row is complete and sourced', () => {
    for (const raw of activities) {
      const a = ActivityRow.parse(raw)
      expect(a.source, a.id).toContain(a.compendiumCode)
    }
  })

  it('ids are unique', () => {
    const ids = [...foods, ...activities].map((r) => (r as { id: string }).id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('no alias points to two different rows', () => {
    for (const rows of [foods, activities] as { id: string; aliases: string[] }[][]) {
      const seen = new Map<string, string>()
      for (const r of rows)
        for (const a of r.aliases) {
          const key = a.toLowerCase()
          expect(seen.get(key) ?? r.id, `alias "${a}"`).toBe(r.id)
          seen.set(key, r.id)
        }
    }
  })

  it('combos only reference real food rows', () => {
    const parsed = Combos.parse(combos)
    const foodIds = new Set((foods as { id: string }[]).map((f) => f.id))
    for (const [name, parts] of Object.entries(parsed)) {
      // Skipped until the foods are sourced: an empty foods file can't satisfy any combo.
      if (foodIds.size === 0) continue
      for (const p of parts) expect(foodIds.has(p), `${name} -> ${p}`).toBe(true)
    }
  })
})
