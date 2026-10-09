import { randomUUID } from 'node:crypto'
import { ageYears } from '@shared/calc'
import { addDays, localDate } from '@shared/dates'
import type { ConfirmInput, ConfirmResult, DaySummary, Facts, LogEntry } from '@shared/schemas'
import { explain } from './ai/explain'
import { computeItems, currentWeightKg, removeEntry, summarizeDay } from './facts'
import { matcher } from './matching/match'
import { checkSafety } from './safety/rules'
import { db } from './store/db'

const age = (): number => {
  const p = db().get().profile
  return p ? ageYears(p.birthDate) : 0
}

// Builds facts with the calc functions, runs explain, saves the entry.
export async function confirmLog(input: ConfirmInput): Promise<ConfirmResult> {
  // The text may have been edited after parsing: crisis text is still never logged.
  if (checkSafety(input.rawText) === 'crisis') throw new Error('crisis text is not logged')

  const { profile, entries } = db().get()
  const mode = profile?.mode ?? 'adult'
  const date = localDate()
  // 'eating' hides every calorie number for this entry.
  const caloriesEnabled = (profile?.caloriesEnabled ?? false) && input.safety !== 'eating'
  const bodyWeightKg = mode === 'teen' ? 0 : input.bodyWeightKg
  const weightKg = bodyWeightKg || currentWeightKg(entries, profile, date)

  const { facts: items, calc } = computeItems(input.items, { matcher, weightKg, caloriesEnabled })
  const draft: LogEntry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    date,
    rawText: input.rawText,
    facts: {
      caloriesEnabled,
      items,
      dayTotals: { activeMinutes: 0, waterGlasses: 0, sleepHours: 0 }
    },
    sleepHours: input.sleepHours,
    waterGlasses: input.waterGlasses,
    bodyWeightKg,
    reaction: { text: '', source: 'template' },
    seeded: false,
    calc,
    safety: input.safety
  }
  const day = summarizeDay(date, [...entries, draft], profile, age())
  const facts: Facts = {
    caloriesEnabled,
    items,
    dayTotals: {
      ...(caloriesEnabled
        ? { kcalIn: day.kcalIn, kcalOut: day.kcalOut, ...(day.tdee ? { tdee: day.tdee } : {}) }
        : {}),
      activeMinutes: day.activeMinutes,
      waterGlasses: day.waterGlasses,
      sleepHours: day.sleepHours
    }
  }
  const reaction = await explain(facts, mode)
  const entry: LogEntry = { ...draft, facts, reaction }
  const saved = db().update((d) => ({ ...d, entries: [...d.entries, entry] }))
  return { entry, reaction, day: summarizeDay(date, saved.entries, saved.profile, age()) }
}

export const getDay = (date: string): DaySummary => {
  const { entries, profile } = db().get()
  return summarizeDay(date, entries, profile, age())
}

export function getHistory(from: string, to: string): DaySummary[] {
  const out: DaySummary[] = []
  for (let d = from; d <= to && out.length < 366; d = addDays(d, 1)) out.push(getDay(d))
  return out
}

// One day's entries, oldest first, for the "Logged today" list.
export const getEntries = (date: string): LogEntry[] =>
  db()
    .get()
    .entries.filter((e) => e.date === date)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

// Deletes one entry from this computer. Day summaries are always rebuilt from entries, so the
// totals drop with it.
export function deleteEntry(id: string): { deleted: boolean } {
  let deleted = false
  db().update((d) => {
    const out = removeEntry(d.entries, id)
    deleted = out.deleted
    return { ...d, entries: out.entries }
  })
  return { deleted }
}
