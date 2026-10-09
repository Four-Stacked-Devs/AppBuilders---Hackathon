import { randomUUID } from 'node:crypto'
import { addDays, localDate } from '@shared/dates'
import { roundHalf } from '@shared/calc'
import type { ConfirmItem, LogEntry, ProfileInput } from '@shared/schemas'
import { templateReaction } from '../ai/templates'
import { computeItems, currentWeightKg, summarizeDay } from '../facts'
import { ACTIVITIES, FOODS, matcher } from '../matching/match'
import { saveProfile } from '../profile'
import { db } from '../store/db'
import { ageYears } from '@shared/calc'

// DEMO DATA, dev only. Writes 21 days of plausible history so the charts aren't empty.
// Every entry is marked seeded: true and the Today view labels it. Kcal values are built
// with the same calc functions and sourced tables as real logs; nothing is hand-typed.
// The activity choice, minutes, water, sleep and weigh-ins are a fixed demo pattern,
// not measurements of anyone.

const DEMO_PROFILE: ProfileInput = {
  nickname: 'Demo',
  birthDate: '1998-06-15',
  sexForFormula: 'female',
  heightCm: 160,
  weightKg: 60,
  activityLevel: 'light',
  goal: 'Build a habit'
}

const DAYS = 21
const MINUTES = [30, 0, 45, 20, 60, 0, 30] // demo pattern, repeats weekly

export function seedDemoHistory(): { entries: number } {
  // Seeding needs a profile; if none exists, a clearly named demo profile is created.
  const profile = db().get().profile ?? saveProfile(DEMO_PROFILE)
  const today = localDate()
  const kept = db()
    .get()
    .entries.filter((e) => !e.seeded)
  const seeded: LogEntry[] = []

  for (let i = DAYS; i >= 1; i--) {
    const date = addDays(today, -i)
    const minutes = MINUTES[i % MINUTES.length]
    const activity = ACTIVITIES[i % ACTIVITIES.length]
    const items: ConfirmItem[] = []
    if (minutes > 0)
      items.push({ kind: 'exercise', refId: activity.id, durationMin: minutes, effort: 'unknown' })
    for (const f of FOODS.slice(0, 3))
      items.push({ kind: 'food', refId: f.id, quantity: 1, unit: f.defaultUnit })

    const weighIn = profile.mode === 'adult' && i % 3 === 0
    const bodyWeightKg = weighIn ? roundHalf(profile.weightKg + 0.5 * Math.sin(i / 3)) : 0
    const weightKg = bodyWeightKg || currentWeightKg([...kept, ...seeded], profile, date)
    const { facts: factItems, calc } = computeItems(items, {
      matcher,
      weightKg,
      caloriesEnabled: profile.caloriesEnabled
    })
    const base: LogEntry = {
      id: randomUUID(),
      createdAt: new Date(`${date}T19:00:00`).toISOString(),
      date,
      rawText: '(demo data)',
      facts: {
        caloriesEnabled: profile.caloriesEnabled,
        items: factItems,
        dayTotals: { activeMinutes: 0, waterGlasses: 0, sleepHours: 0 }
      },
      sleepHours: 6 + (i % 3),
      waterGlasses: 4 + (i % 4),
      bodyWeightKg,
      reaction: { text: '', source: 'template' },
      seeded: true,
      calc
    }
    const day = summarizeDay(date, [base], profile, ageYears(profile.birthDate))
    const facts = {
      ...base.facts,
      dayTotals: {
        ...(profile.caloriesEnabled
          ? { kcalIn: day.kcalIn, kcalOut: day.kcalOut, tdee: day.tdee }
          : {}),
        activeMinutes: day.activeMinutes,
        waterGlasses: day.waterGlasses,
        sleepHours: day.sleepHours
      }
    }
    seeded.push({ ...base, facts, reaction: { text: templateReaction(facts), source: 'template' } })
  }
  db().update((d) => ({
    ...d,
    entries: [...kept, ...seeded].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
  }))
  return { entries: seeded.length }
}

export function clearDemoHistory(): { entries: number } {
  const before = db().get().entries.length
  const after = db().update((d) => ({ ...d, entries: d.entries.filter((e) => !e.seeded) })).entries
    .length
  return { entries: before - after }
}
