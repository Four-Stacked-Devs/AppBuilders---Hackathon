// Display text only; no new numbers are calculated here (hours are minutes shown as hours).
import type { CalcItem, LogEntry } from '@shared/schemas'

export const greeting = (hour: number): string =>
  hour >= 5 && hour < 12
    ? 'Good morning'
    : hour >= 12 && hour < 18
      ? 'Good afternoon'
      : 'Good evening'

const at = (date: string): Date => new Date(`${date}T00:00:00`)

export const longDate = (date: string): string =>
  at(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
export const shortDate = (date: string): string =>
  at(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const shortDay = (date: string): string =>
  at(date).toLocaleDateString('en-US', { weekday: 'short' })
export const monthLabel = (date: string): string =>
  at(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

const hours = (minutes: number): string => `${Math.round((minutes / 60) * 100) / 100} h`

// "PhilFCT A020" when the source names a PhilFCT food id, otherwise "product label".
const foodSource = (source: string): string => {
  const id = /^PhilFCT\b.*?\b([A-Z]\d{3})\b/.exec(source)
  return id ? `PhilFCT ${id[1]}` : /^PhilFCT/.test(source) ? 'PhilFCT' : 'product label'
}

const ROUNDED = 'rounded to the nearest 10. An estimate.'

// One line of the "How was this calculated?" breakdown, from the stored inputs only.
export function calcLine(c: CalcItem): string {
  if (c.kind === 'exercise') {
    const ref = `${c.source} ${c.compendiumCode}`
    if (c.kcal === undefined || c.weightKg === undefined)
      return `${c.name}: ${c.minutes} min, ${c.intensity} (${c.met} MET, ${ref}).`
    return `${c.name}: ${c.met} MET (${ref}) × ${c.weightKg} kg × ${hours(c.minutes)} ≈ ${c.kcal} kcal, ${ROUNDED}`
  }
  const amount = `${c.quantity} ${c.unit} = ${c.grams} g`
  if (c.kcal === undefined || c.kcalPer100g === undefined)
    return `${c.name}: ${amount} (${foodSource(c.source)}).`
  return `${c.name}: ${amount} × ${c.kcalPer100g} kcal per 100 g (${foodSource(c.source)}) ≈ ${c.kcal} kcal, ${ROUNDED}`
}

// "08:42" in local time.
export const timeOfDay = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

// What a saved log counted, without energy numbers: "Jogging 30 min · 3 glasses water".
export function entrySummary(e: LogEntry, showWeight: boolean): string {
  const parts = e.facts.items.map((i) =>
    i.minutes !== undefined
      ? `${i.displayName} ${i.minutes} min`
      : `${i.displayName} ${i.quantityLabel ?? ''}`.trim()
  )
  if (e.waterGlasses > 0)
    parts.push(`${e.waterGlasses} ${e.waterGlasses === 1 ? 'glass' : 'glasses'} water`)
  if (e.sleepHours > 0) parts.push(`${e.sleepHours} h sleep`)
  if (showWeight && e.bodyWeightKg > 0) parts.push(`${e.bodyWeightKg} kg`)
  return parts.length ? parts.join(' · ') : 'Nothing to count'
}

// What was said, quoted; demo entries just say they are demo data.
export const sayingOf = (e: { rawText: string; seeded: boolean }): string =>
  e.seeded ? '(demo data)' : `“${e.rawText}”`
