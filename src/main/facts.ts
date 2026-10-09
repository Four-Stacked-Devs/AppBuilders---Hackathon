import { bmr, exerciseKcal, foodKcal, intensity, round10, roundHalf, tdee } from '@shared/calc'
import type {
  ConfirmItem,
  DaySummary,
  FactItem,
  LogEntry,
  Profile,
  Reaction
} from '@shared/schemas'
import type { Matcher } from './matching/match'

// Every number here comes from src/shared/calc and the sourced tables, and is rounded
// BEFORE the LLM sees it (kcal to 10, minutes to whole numbers, hours and glasses to 0.5),
// so the model can't create a mismatch by rounding differently.

type FactCtx = { matcher: Matcher; weightKg: number; caloriesEnabled: boolean }

// Short labels only: full source strings carry dates and codes that would widen the set
// of numbers the validator allows.
const foodSourceLabel = (s: string): string => (/^PhilFCT/i.test(s) ? 'PhilFCT' : 'product label')

const plural = (n: number, unit: string): string =>
  n === 1 || unit === 'serving' ? unit : unit === 'glass' ? 'glasses' : `${unit}s`

export function itemFacts(items: ConfirmItem[], ctx: FactCtx): FactItem[] {
  const out: FactItem[] = []
  for (const it of items) {
    if (it.kind === 'food') {
      const row = ctx.matcher.food(it.refId)
      if (!row) throw new Error(`unknown food ${it.refId}`)
      const unit = row.portions[it.unit as keyof typeof row.portions] ? it.unit : row.defaultUnit
      const grams = (row.portions[unit as keyof typeof row.portions] ?? 0) * it.quantity
      out.push({
        displayName: row.name,
        quantityLabel: `${it.quantity} ${plural(it.quantity, unit)}`,
        ...(ctx.caloriesEnabled ? { kcal: round10(foodKcal(grams, row.kcalPer100g)) } : {}),
        source: foodSourceLabel(row.source)
      })
    } else {
      const row = ctx.matcher.activity(it.refId)
      if (!row) throw new Error(`unknown activity ${it.refId}`)
      const minutes = Math.round(it.durationMin)
      out.push({
        displayName: row.name,
        minutes,
        intensity: intensity(row.met),
        ...(ctx.caloriesEnabled
          ? { kcal: round10(exerciseKcal(row.met, ctx.weightKg, minutes)) }
          : {}),
        source: '2024 Adult Compendium'
      })
    }
  }
  return out
}

// Latest logged body weight on or before `date`, else the profile weight.
export function currentWeightKg(
  entries: LogEntry[],
  profile: Profile | null,
  date: string
): number {
  const logged = entries
    .filter((e) => e.date <= date && e.bodyWeightKg > 0)
    .sort((a, b) => (a.date + a.createdAt < b.date + b.createdAt ? -1 : 1))
    .at(-1)
  return logged?.bodyWeightKg ?? profile?.weightKg ?? 0
}

export function profileTdee(profile: Profile, weightKg: number, age: number): number | undefined {
  if (!profile.caloriesEnabled || profile.sexForFormula === 'unspecified') return undefined
  return round10(
    tdee(bmr(profile.sexForFormula, weightKg, profile.heightCm, age), profile.activityLevel)
  )
}

export function summarizeDay(
  date: string,
  entries: LogEntry[],
  profile: Profile | null,
  age: number
): DaySummary {
  const day = entries.filter((e) => e.date === date)
  const calories = profile?.caloriesEnabled ?? false
  let kcalIn = 0
  let kcalOut = 0
  let activeMinutes = 0
  for (const e of day)
    for (const i of e.facts.items) {
      if (i.minutes !== undefined) {
        activeMinutes += i.minutes
        kcalOut += i.kcal ?? 0
      } else kcalIn += i.kcal ?? 0
    }
  const weighIns = day.filter((e) => e.bodyWeightKg > 0)
  const latest = [...day].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)).at(-1)
  const t =
    profile && calories
      ? profileTdee(profile, currentWeightKg(entries, profile, date), age)
      : undefined
  return {
    date,
    ...(calories ? { kcalIn, kcalOut, ...(t !== undefined ? { tdee: t } : {}) } : {}),
    activeMinutes,
    waterGlasses: roundHalf(day.reduce((n, e) => n + e.waterGlasses, 0)),
    sleepHours: roundHalf(day.reduce((n, e) => n + e.sleepHours, 0)),
    bodyWeightKg: profile?.mode === 'teen' ? null : (weighIns.at(-1)?.bodyWeightKg ?? null),
    entryCount: day.length,
    latestReaction: (latest?.reaction as Reaction | undefined) ?? null,
    includesDemoData: day.some((e) => e.seeded)
  }
}
