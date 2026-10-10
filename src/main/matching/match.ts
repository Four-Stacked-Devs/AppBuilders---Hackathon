import Fuse from 'fuse.js'
import type { Candidate, MatchedItem, ParsedLog } from '@shared/schemas'
import { ActivityRow, Combos, FoodRow, type PortionUnit } from '@shared/refdata'
import foodsJson from '../../../data/foods.ph.json'
import activitiesJson from '../../../data/activities.json'
import combosJson from '../../../data/combos.json'

// Lowercase, strip accents, and turn hyphens and punctuation into single spaces, so
// "Nag-Jog!" and "nag jog" compare equal.
export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const UNIT_WORDS: Record<string, PortionUnit> = {
  cup: 'cup',
  cups: 'cup',
  tasa: 'cup',
  piece: 'piece',
  pieces: 'piece',
  pc: 'piece',
  pcs: 'piece',
  piraso: 'piece',
  slice: 'piece',
  hiwa: 'piece',
  balot: 'piece',
  bote: 'can',
  bottle: 'can',
  gram: 'gram',
  grams: 'gram',
  gramo: 'gram',
  g: 'gram',
  glass: 'glass',
  glasses: 'glass',
  baso: 'glass',
  bowl: 'bowl',
  bowls: 'bowl',
  mangkok: 'bowl',
  plate: 'plate',
  plates: 'plate',
  plato: 'plate',
  can: 'can',
  cans: 'can',
  lata: 'can',
  serving: 'serving',
  servings: 'serving',
  order: 'serving',
  orders: 'serving'
}

// The model keeps units as the user said them; this maps them to portion keys (plan 3.4).
export const normalizeUnit = (raw: string): PortionUnit => UNIT_WORDS[norm(raw)] ?? 'serving'

const WATER_WORD = /\b(tubig|water)\b/
const CONTAINER = new Set(['baso', 'glass', 'glasses'])

// Water is logged as glasses, never as a food (plan 3.5). Catches "tubig", "baso ng tubig",
// and a bare "baso" (glass) when the note itself mentions water, which Qwen2.5-3B returned
// for "3 baso ng tubig".
export function applyWaterRule(p: ParsedLog, rawText = ''): ParsedLog {
  const noteHasWater = WATER_WORD.test(norm(rawText))
  const isWater = (name: string): boolean =>
    WATER_WORD.test(norm(name)) || (noteHasWater && CONTAINER.has(norm(name)))
  const water = p.foods.filter((f) => isWater(f.name))
  if (water.length === 0) return p
  const glasses = p.waterGlasses || water.reduce((n, f) => n + f.quantity, 0)
  return {
    ...p,
    foods: p.foods.filter((f) => !isWater(f.name)),
    waterGlasses: Math.min(glasses, 30)
  }
}

type Row = { id: string; name: string; aliases: string[] }
type Match<T> = { matched: boolean; ref: T | null; candidates: T[] }

const THRESHOLD = 0.35

function index<T extends Row>(rows: T[]): (name: string) => Match<T> {
  const exact = new Map<string, T>()
  for (const r of rows) for (const a of [r.name, ...r.aliases]) exact.set(norm(a), r)
  const fuse = new Fuse(
    rows.map((r) => ({ row: r, keys: [r.name, ...r.aliases].map(norm) })),
    { keys: ['keys'], threshold: THRESHOLD, ignoreLocation: true, includeScore: true }
  )
  return (name) => {
    const hit = exact.get(norm(name))
    if (hit) return { matched: true, ref: hit, candidates: [] }
    const hits = fuse.search(norm(name), { limit: 3 })
    if (hits[0] && (hits[0].score ?? 1) < THRESHOLD)
      return {
        matched: true,
        ref: hits[0].item.row,
        candidates: hits.slice(1).map((h) => h.item.row)
      }
    return { matched: false, ref: null, candidates: hits.map((h) => h.item.row) }
  }
}

const toCandidates = (rows: Row[]): Candidate[] =>
  rows.slice(0, 3).map((r) => ({ refId: r.id, name: r.name }))

export type Matcher = {
  matchFood: (name: string) => Match<FoodRow>
  matchActivity: (name: string) => Match<ActivityRow>
  matchAll: (p: ParsedLog) => MatchedItem[]
  food: (id: string) => FoodRow | undefined
  activity: (id: string) => ActivityRow | undefined
}

// Words the person taught VOX: normalised alias -> row. Filled from the database at startup.
export const taught = new Map<string, { kind: 'food' | 'activity'; refId: string }>()

const withGrams = (f: FoodRow): FoodRow => ({ ...f, portions: { ...f.portions, gram: 1 } })

export function createMatcher(
  foods: FoodRow[],
  activities: ActivityRow[],
  combos: Combos
): Matcher {
  const foodIndex = index(foods)
  const activityIndex = index(activities)
  const matchFood = (name: string): Match<FoodRow> => {
    const t = taught.get(norm(name))
    const ref = t?.kind === 'food' ? foods.find((f) => f.id === t.refId) : undefined
    return ref ? { matched: true, ref, candidates: [] } : foodIndex(name)
  }
  const matchActivity = (name: string): Match<ActivityRow> => {
    const t = taught.get(norm(name))
    const ref = t?.kind === 'activity' ? activities.find((a) => a.id === t.refId) : undefined
    return ref ? { matched: true, ref, candidates: [] } : activityIndex(name)
  }
  foods = foods.map(withGrams)
  const foodById = new Map(foods.map((f) => [f.id, f]))
  const comboByName = new Map(
    Object.entries(combos).map(([k, v]) => [norm(k), { name: k, parts: v }])
  )

  function foodItem(
    rawName: string,
    quantity: number,
    rawUnit: string,
    ref: FoodRow | null,
    candidates: FoodRow[],
    fromCombo?: string
  ): MatchedItem {
    // No unit said: use the food's usual one (2 itlog = 2 pieces), without flagging it.
    const unit = rawUnit.trim() === '' ? (ref?.defaultUnit ?? 'serving') : normalizeUnit(rawUnit)
    const units = ref ? (Object.keys(ref.portions) as PortionUnit[]) : []
    const hasUnit = ref ? ref.portions[unit] !== undefined : true
    return {
      kind: 'food',
      rawName,
      refId: ref?.id ?? null,
      displayName: ref?.name ?? rawName,
      quantity,
      unit: ref && !hasUnit ? ref.defaultUnit : unit,
      units,
      unitAssumed: !hasUnit,
      ...(fromCombo ? { fromCombo } : {}),
      candidates: toCandidates(candidates)
    }
  }

  function matchAll(p: ParsedLog): MatchedItem[] {
    const items: MatchedItem[] = []
    for (const f of p.foods) {
      const combo = comboByName.get(norm(f.name))
      const parts = combo?.parts.map((id) => foodById.get(id)).filter((r) => r !== undefined)
      if (combo && parts && parts.length > 0) {
        // Each part uses its own sourced row and default portion.
        for (const part of parts)
          items.push(foodItem(f.name, f.quantity, part.defaultUnit, part, [], combo.name))
        continue
      }
      const m = matchFood(f.name)
      items.push(foodItem(f.name, f.quantity, f.unit, m.ref, m.candidates))
    }
    for (const e of p.exercises) {
      const m = matchActivity(e.activity)
      items.push({
        kind: 'exercise',
        rawName: e.activity,
        refId: m.ref?.id ?? null,
        displayName: m.ref?.name ?? e.activity,
        durationMin: e.durationMin,
        effort: e.effort,
        candidates: toCandidates(m.candidates)
      })
    }
    return items
  }

  return {
    matchFood,
    matchActivity,
    matchAll,
    food: (id: string) => foodById.get(id),
    activity: (id: string) => activities.find((a) => a.id === id)
  }
}

// The app's matcher over the checked-in, sourced tables. Rows are validated on load, so a
// bad row fails at startup instead of producing a wrong number later.
export const FOODS = (foodsJson as unknown[]).map((r) => FoodRow.parse(r))
export const ACTIVITIES = activitiesJson.map((r) => ActivityRow.parse(r))
export const COMBOS = Combos.parse(combosJson)
export const matcher = createMatcher(FOODS, ACTIVITIES, COMBOS)
