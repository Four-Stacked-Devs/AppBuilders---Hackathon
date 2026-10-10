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
import { addLift, listLifts } from '../extras'
import { addMessage, createConversation, listConversations, renameConversation } from '../chat/repo'
import { createMealPlan } from '../meals'
import { addPlan } from '../plans'
import { activePlan, createPlan } from '../workouts'

// Extras for the demo: lifts with a visible progression, plans, saved workout and meal plans,
// and a few chat sessions. Each step is skipped if it already exists or fails.
const CHATS: [string, [string, string][]][] = [
  ['Ilang minuto ako gumalaw?', [['Ilang minuto ako gumalaw this week?', 'Ngayong linggo, may mga araw na gumalaw ka. Tuloy lang, maliit na hakbang araw-araw ang mahalaga.']]],
  ['Workout plan', [['Gawan mo ako ng workout plan', 'Nagawa ko na ang plan mo. Nasa Plans > Workouts na ito.']]],
  ['Meal prep ngayong linggo', [['Gumawa ng meal plan, walang baboy', 'Meal plan na para sa 5 araw, kasama ang grocery list at prep schedule.']]],
  ['Tulog at pagod', [['Lagi akong pagod, ano gagawin?', 'Subukang matulog at gumising nang halos pareho ang oras araw-araw. Malaking tulong ang tahimik at madilim na kwarto.']]],
  ['Warm up', [['Ano ang magandang warm up?', 'Magsimula sa 5 minutong dahan-dahang galaw: ikot ng balikat, balakang at tuhod, tapos unti-unting bilisan.']]]
]

function seedExtras(): void {
  const today = localDate()
  try {
    if (listLifts().recent.length === 0) {
      const lifts: [string, number, number][] = [['bench press', 8, 30], ['squat', 8, 40], ['deadlift', 5, 50], ['overhead press', 8, 20]]
      for (let w = 6; w >= 0; w--)
        for (const [name, reps, kg] of lifts)
          addLift({ exercise: name, reps, weightKg: kg + (6 - w) * 2.5 }, addDays(today, -w * 7 - 1))
    }
  } catch { /* skip */ }
  try {
    if (!activePlan()) createPlan({ goal: 'stronger', daysPerWeek: 3, equipment: 'dumbbell', level: 'beginner', rest: [] })
  } catch { /* skip */ }
  try { createMealPlan({ days: 5, slots: ['breakfast', 'lunch', 'dinner'], people: 2, avoid: [] }) } catch { /* skip */ }
  for (const [d, acts] of [[1, 'walking_brisk'], [1, 'yoga_hatha'], [0, 'jogging_general']] as [number, string][])
    try { addPlan({ date: addDays(today, d), activityRefId: acts, minutes: 25, cue: 'pagkagising' }) } catch { /* skip */ }
  try {
    if (listConversations().length < 3)
      for (const [title, msgs] of CHATS) {
        const id = createConversation(title)
        renameConversation(id, title)
        for (const [q, a] of msgs) {
          addMessage(id, 'user', { type: 'text', text: q })
          addMessage(id, 'vox', { type: 'text', text: a })
        }
      }
  } catch { /* skip */ }
}

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

const DAYS = 46
const MINUTES = [30, 0, 45, 20, 60, 0, 30] // demo pattern, repeats weekly
// Demo activities (ids from data/activities.json) and meals (PhilFCT Food IDs), rotated by day.
const ACTIVITY_IDS = [
  'jogging_general',
  'walking_brisk',
  'weight_training_general',
  'basketball_general',
  'zumba_group',
  'bicycling_general',
  'calisthenics_moderate',
  'yoga_hatha'
]
const MEALS: { id: string; quantity: number }[][] = [
  [
    { id: 'a042', quantity: 2 },
    { id: 'h004', quantity: 1 },
    { id: 'q011', quantity: 1 },
    { id: 'a020', quantity: 1 },
    { id: 'r050', quantity: 1 }
  ],
  [
    { id: 'a020', quantity: 1.5 },
    { id: 'g076', quantity: 1 },
    { id: 'e011', quantity: 1 },
    { id: 'a183', quantity: 1 }
  ],
  [
    { id: 'a021', quantity: 1 },
    { id: 'f257', quantity: 2 },
    { id: 'r102', quantity: 1 },
    { id: 'q011', quantity: 1 },
    { id: 'a020', quantity: 1 },
    { id: 'g105', quantity: 1 }
  ]
]

export function seedDemoHistory(): { entries: number } {
  // Seeding needs a profile; if none exists, a clearly named demo profile is created.
  const profile = db().get().profile ?? saveProfile(DEMO_PROFILE)
  const today = localDate()
  const kept = db()
    .get()
    .entries.filter((e) => !e.seeded)
  const seeded: LogEntry[] = []

  for (let i = DAYS; i >= 1; i--) {
    if (i === 22 || i === 23) continue // a two-day gap, so the calendar shows an earlier streak and the current one
    const date = addDays(today, -i)
    const minutes = MINUTES[i % MINUTES.length]
    const activity =
      ACTIVITIES.find((a) => a.id === ACTIVITY_IDS[i % ACTIVITY_IDS.length]) ?? ACTIVITIES[0]
    const items: ConfirmItem[] = []
    if (minutes > 0)
      items.push({ kind: 'exercise', refId: activity.id, durationMin: minutes, effort: 'unknown' })
    for (const m of MEALS[i % MEALS.length]) {
      const f = FOODS.find((x) => x.id === m.id)
      if (f) items.push({ kind: 'food', refId: f.id, quantity: m.quantity, unit: f.defaultUnit })
    }

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
    const day = summarizeDay(date, [base], profile, ageYears(profile.birthDate, new Date()))
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
  seedExtras()
  return { entries: seeded.length }
}

export function clearDemoHistory(): { entries: number } {
  const before = db().get().entries.length
  const after = db().update((d) => ({ ...d, entries: d.entries.filter((e) => !e.seeded) })).entries
    .length
  return { entries: before - after }
}
