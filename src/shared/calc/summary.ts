import type { DaySummary } from '../schemas'
import { round10, roundHalf } from './rounding'

// Totals and averages for the Weekly, Monthly and Progress views. Averages count only days
// that have a value, so a day with no sleep logged does not pull the sleep average down.
export type RangeSummary = {
  days: number
  daysLogged: number
  activeMinutes: number
  avgSleepHours: number | null
  avgWaterGlasses: number | null
  avgKcalIn: number | null // null when calories are off or nothing was eaten
}

const mean = (xs: number[]): number | null =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null

export function summarizeRange(days: DaySummary[]): RangeSummary {
  const sleep = mean(days.filter((d) => d.sleepHours > 0).map((d) => d.sleepHours))
  const water = mean(days.filter((d) => d.waterGlasses > 0).map((d) => d.waterGlasses))
  const kcal = mean(days.flatMap((d) => (d.kcalIn !== undefined && d.kcalIn > 0 ? [d.kcalIn] : [])))
  return {
    days: days.length,
    daysLogged: days.filter((d) => d.entryCount > 0).length,
    activeMinutes: days.reduce((s, d) => s + d.activeMinutes, 0),
    avgSleepHours: sleep === null ? null : roundHalf(sleep),
    avgWaterGlasses: water === null ? null : roundHalf(water),
    avgKcalIn: kcal === null ? null : round10(kcal)
  }
}

const tenth = (n: number): number => Math.round(n * 10) / 10

// Latest weigh-in and its change from the first weigh-in in the range, to 0.1 kg.
export function weightChange(
  days: DaySummary[]
): { latestKg: number; changeKg: number; since: string } | null {
  const w = days.filter((d) => d.bodyWeightKg !== null)
  if (w.length === 0) return null
  const first = w[0]
  const last = w[w.length - 1]
  return {
    latestKg: tenth(last.bodyWeightKg as number),
    // From the rounded values, so the change always matches the numbers shown beside it.
    changeKg: tenth(tenth(last.bodyWeightKg as number) - tenth(first.bodyWeightKg as number)),
    since: first.date
  }
}
