import type { ParsedLog } from '@shared/schemas'
import { ACTIVITIES, COMBOS, FOODS, matcher, taught } from '../matching/match'
import {
  CLAUSE_SPLIT,
  DISTANCE_UNITS,
  EFFORT_WORDS,
  FOOD_UNITS,
  FUTURE_WORDS,
  HOUR_UNITS,
  MINUTE_UNITS,
  POUND_UNITS,
  SLEEP_WORDS,
  STOP,
  WATER_UNITS,
  WATER_WORDS,
  WEIGHT_UNITS,
  YESTERDAY
} from './lexicon'
import { NUM_LINKERS, clauses, foldNumbers, tokenize, type Tok } from './normalize'

// A rule-based Taglish reader: finds foods, activities, durations, quantities, water, sleep and
// weight without calling the language model. Words it can't place are reported, never dropped.
// When everything is explained the model is skipped entirely (a few milliseconds).

export type NluResult = {
  parsed: ParsedLog
  dayOffset: number // 0 today, -1 yesterday (kahapon, kagabi) ...
  future: boolean // "mamaya", "bukas": has not happened yet
  unexplained: string[]
  complete: boolean // every content word was understood and something was found
}

type Entry = { kind: 'food' | 'activity'; alias: string }
type Index = { map: Map<string, Entry>; maxLen: number }

const key = (alias: string): string => tokenize(alias).join(' ')

export function buildIndex(extra: { alias: string; kind: 'food' | 'activity' }[] = []): Index {
  const map = new Map<string, Entry>()
  const add = (alias: string, kind: Entry['kind'], canonical: string, overwrite = false): void => {
    const k = key(alias)
    if (k && (overwrite || !map.has(k))) map.set(k, { kind, alias: canonical })
  }
  for (const a of extra) add(a.alias, a.kind, a.alias, true)
  for (const a of ACTIVITIES) {
    add(a.name, 'activity', a.aliases[0] ?? a.name)
    for (const al of a.aliases) add(al, 'activity', al)
  }
  for (const name of Object.keys(COMBOS)) add(name, 'food', name)
  for (const f of FOODS) for (const al of f.aliases) add(al, 'food', al)
  let maxLen = 1
  for (const k of map.keys()) maxLen = Math.max(maxLen, k.split(' ').length)
  return { map, maxLen: Math.min(maxLen, 8) }
}

let defaultIndex: Index | null = null
const getIndex = (): Index =>
  (defaultIndex ??= buildIndex([...taught.entries()].map(([alias, t]) => ({ alias, kind: t.kind }))))
export const resetNluIndex = (): void => {
  defaultIndex = null
}

type Span = { kind: Entry['kind']; alias: string; start: number; end: number }

function findSpans(toks: Tok[], used: boolean[], index: Index): Span[] {
  const spans: Span[] = []
  for (let len = index.maxLen; len >= 1; len--) {
    for (let s = 0; s + len <= toks.length; s++) {
      if (used.slice(s, s + len).some(Boolean) || toks.slice(s, s + len).some((t) => t.n !== undefined))
        continue
      const hit = index.map.get(toks.slice(s, s + len).map((t) => t.t).join(' '))
      if (!hit) continue
      spans.push({ ...hit, start: s, end: s + len })
      for (let i = s; i < s + len; i++) used[i] = true
    }
  }
  // glued verb forms: "nagjog", "magbike", "nagbasketball"
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i].t
    if (used[i] || toks[i].n !== undefined || w.length < 6) continue
    const m = /^(nag|mag|pag)(.{3,})$/.exec(w)
    const hit = m ? index.map.get(m[2]) : undefined
    if (hit) {
      spans.push({ ...hit, start: i, end: i + 1 })
      used[i] = true
    }
  }
  return spans.sort((a, b) => a.start - b.start)
}

// number followed (after optional linkers) by a unit word in `units`
function numberUnit(toks: Tok[], used: boolean[], units: (w: string) => number | null): { n: number; at: number[] }[] {
  const out: { n: number; at: number[] }[] = []
  for (let i = 0; i < toks.length; i++) {
    if (used[i] || toks[i].n === undefined) continue
    let j = i + 1
    while (j < toks.length && NUM_LINKERS.has(toks[j].t)) j++
    const mult = j < toks.length && !used[j] ? units(toks[j].t) : null
    if (mult !== null) out.push({ n: (toks[i].n as number) * mult, at: [i, j] })
  }
  return out
}

const minutesOf = (w: string): number | null =>
  MINUTE_UNITS.has(w) ? 1 : HOUR_UNITS.has(w) ? 60 : null

function parseClause(toks: Tok[], index: Index, out: ParsedLog, notes: string[]): void {
  const used = toks.map(() => false)

  // --- sleep ---
  const sleepAt = toks.findIndex((t) => SLEEP_WORDS.has(t.t))
  if (sleepAt >= 0) {
    used[sleepAt] = true
    const hrs = numberUnit(toks, used, (w) => (HOUR_UNITS.has(w) ? 1 : MINUTE_UNITS.has(w) ? 1 / 60 : null))
    const pick = hrs[0] ?? ((): { n: number; at: number[] } | undefined => {
      const i = toks.findIndex((t, k) => !used[k] && t.n !== undefined && t.n > 0 && t.n <= 24)
      return i >= 0 ? { n: toks[i].n as number, at: [i] } : undefined
    })()
    if (pick) {
      out.sleepHours = Math.min(24, out.sleepHours + pick.n)
      pick.at.forEach((i) => (used[i] = true))
    }
  }

  // --- water ---
  const waterAt = toks.findIndex((t, i) => !used[i] && WATER_WORDS.has(t.t))
  if (waterAt >= 0) {
    used[waterAt] = true
    const pairs = numberUnit(toks, used, (w) => WATER_UNITS[w] ?? null)
    if (pairs.length) {
      out.waterGlasses = Math.min(30, out.waterGlasses + pairs.reduce((s, p) => s + p.n, 0))
      pairs.forEach((p) => p.at.forEach((i) => (used[i] = true)))
    } else {
      const unitAt = toks.findIndex((t, i) => !used[i] && WATER_UNITS[t.t] !== undefined)
      const numAt = toks.findIndex((t, i) => !used[i] && t.n !== undefined)
      const mult = unitAt >= 0 ? WATER_UNITS[toks[unitAt].t] : 1
      out.waterGlasses = Math.min(30, out.waterGlasses + (numAt >= 0 ? (toks[numAt].n as number) : 1) * mult)
      if (unitAt >= 0) used[unitAt] = true
      if (numAt >= 0) used[numAt] = true
    }
  }

  // --- foods and activities ---
  const spans = findSpans(toks, used, index)
  const hasFood = spans.some((s) => s.kind === 'food')

  // --- body weight: "72.5 kilos" with nothing to eat in the clause ---
  if (!hasFood) {
    for (const p of numberUnit(toks, used, (w) => (WEIGHT_UNITS.has(w) ? 1 : null))) {
      out.bodyWeightKg = p.n
      p.at.forEach((i) => (used[i] = true))
    }
    for (const p of numberUnit(toks, used, (w) => (POUND_UNITS.has(w) ? 1 : null))) {
      notes.push(`${p.n} lbs: please say your weight in kilos`)
      p.at.forEach((i) => (used[i] = true))
    }
  }

  // --- activities: duration and effort ---
  const acts = spans.filter((s) => s.kind === 'activity')
  if (acts.length) {
    const durs = numberUnit(toks, used, minutesOf)
    const minutes = durs.reduce((s, d) => s + d.n, 0)
    durs.forEach((d) => d.at.forEach((i) => (used[i] = true)))
    const dist = numberUnit(toks, used, (w) => (DISTANCE_UNITS.has(w) ? 1 : null))
    dist.forEach((d) => d.at.forEach((i) => (used[i] = true)))
    let effort: ParsedLog['exercises'][number]['effort'] = 'unknown'
    toks.forEach((t, i) => {
      const e = EFFORT_WORDS[t.t]
      if (e && !used[i]) {
        effort = e
        used[i] = true
      }
    })
    // "kalahating oras" and the like are folded to numbers already; "mga 30" with no unit:
    let duration = minutes
    if (!duration) {
      const bare = toks.findIndex((t, i) => !used[i] && t.n !== undefined && t.n >= 5 && t.n <= 300)
      if (bare >= 0 && dist.length === 0) {
        duration = toks[bare].n as number
        used[bare] = true
      }
    }
    for (const a of acts) {
      if (!duration) notes.push(`${a.alias}: how many minutes? I used 30, please check`)
      out.exercises.push({
        activity: a.alias,
        durationMin: Math.min(600, duration || 30),
        effort
      })
    }
    if (dist.length) notes.push(`${dist.map((d) => d.n).join(', ')} km noted, VOX logs minutes`)
  }

  // --- foods: quantity and unit around each span ---
  for (const f of spans.filter((s) => s.kind === 'food')) {
    let qty: number | null = null
    let unit = ''
    let i = f.start - 1
    while (i >= 0 && !used[i] && NUM_LINKERS.has(toks[i].t)) i--
    if (i >= 0 && !used[i] && FOOD_UNITS[toks[i].t] && toks[i].n === undefined) {
      unit = FOOD_UNITS[toks[i].t]
      used[i] = true
      i--
    }
    if (i >= 0 && !used[i] && toks[i].n !== undefined) {
      qty = toks[i].n as number
      used[i] = true
    } else if (unit === '') {
      let j = f.end
      while (j < toks.length && !used[j] && NUM_LINKERS.has(toks[j].t)) j++
      if (j < toks.length && !used[j] && toks[j].n !== undefined) {
        qty = toks[j].n as number
        used[j] = true
        const k = j + 1
        if (k < toks.length && !used[k] && FOOD_UNITS[toks[k].t]) {
          unit = FOOD_UNITS[toks[k].t]
          used[k] = true
        }
      }
    }
    const max = unit === 'gram' ? 5000 : 20
    out.foods.push({ name: f.alias, quantity: Math.min(max, qty && qty > 0 ? qty : 1), unit })
  }

  // --- anything left: try a fuzzy match (typos), else report it ---
  let i = 0
  while (i < toks.length) {
    if (used[i] || toks[i].n !== undefined || STOP.has(toks[i].t) || NUM_LINKERS.has(toks[i].t)) {
      i++
      continue
    }
    let j = i
    while (j < toks.length && !used[j] && toks[j].n === undefined && !STOP.has(toks[j].t)) j++
    const phrase = toks.slice(i, j).map((t) => t.t).join(' ')
    const food = phrase.length >= 4 ? matcher.matchFood(phrase) : null
    const act = phrase.length >= 4 ? matcher.matchActivity(phrase) : null
    if (act?.matched && act.ref) {
      out.exercises.push({ activity: phrase, durationMin: 30, effort: 'unknown' })
      notes.push(`${phrase}: how many minutes? I used 30, please check`)
    } else if (food?.matched && food.ref) {
      out.foods.push({ name: phrase, quantity: 1, unit: '' })
    } else out.unclear.push(phrase)
    for (let k = i; k < j; k++) used[k] = true
    i = j
  }
}

export function parseRules(raw: string): NluResult {
  const tokens = foldNumbers(tokenize(raw))
  const out: ParsedLog = {
    foods: [],
    exercises: [],
    sleepHours: 0,
    waterGlasses: 0,
    bodyWeightKg: 0,
    unclear: []
  }
  const notes: string[] = []
  const words = tokens.map((t) => t.t)

  let dayOffset = 0
  if (words.some((w) => YESTERDAY.has(w))) dayOffset = -1
  const ago = words.indexOf('ago')
  if (ago > 1 && tokens[ago - 2].n !== undefined && /^days?$/.test(words[ago - 1]))
    dayOffset = -Math.min(7, tokens[ago - 2].n as number)
  const future = dayOffset === 0 && words.some((w) => FUTURE_WORDS.has(w))

  const index = getIndex()
  for (const clause of clauses(tokens, CLAUSE_SPLIT)) parseClause(clause, index, out, notes)

  const unexplained = [...out.unclear]
  const found =
    out.foods.length + out.exercises.length + (out.sleepHours > 0 ? 1 : 0) +
    (out.waterGlasses > 0 ? 1 : 0) + (out.bodyWeightKg > 0 ? 1 : 0)
  out.unclear = [...out.unclear, ...notes]
  return {
    parsed: out,
    dayOffset,
    future,
    unexplained,
    complete: unexplained.length === 0 && found > 0
  }
}
