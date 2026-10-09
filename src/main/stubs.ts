// TEMPORARY stand-ins for the real handlers, so the UI can be built against window.vox in
// mock mode. Each phase replaces its stub: profile/log/day/history (Phase 3-5), dev:seed (5.3).
// Every number here is a PLACEHOLDER for layout only, not nutrition or exercise data.
// Each return value is checked against its schema, so a stub can't drift from the contract.
import { randomUUID } from 'node:crypto'
import {
  ConfirmResult,
  DaySummary,
  ParsedLog,
  ParseResult,
  Profile,
  type ConfirmInput,
  type MatchedItem,
  type ProfileInput
} from '@shared/schemas'
import { generate } from './ai/llm'
import parseSchema from './ai/parse.schema.json'

let profile: Profile | null = null // in memory only until the Phase 3 store lands

export const stubProfileGet = (): Profile | null => profile

export function stubProfileSave(p: ProfileInput): Profile {
  profile = Profile.parse({
    ...p,
    mode: 'adult', // real age check arrives with Phase 2 calc / Phase 7B
    caloriesEnabled: p.sexForFormula !== 'unspecified',
    updatedAt: new Date().toISOString()
  })
  return profile
}

// Runs the (mock or real) parse call, then fakes matching: foods and exercises are all
// "matched" to stub ids, except the last food, which is left unmatched so the card's
// "Did you mean…" state can be built.
export async function stubParse(text: string): Promise<ParseResult> {
  const raw = await generate({
    system: 'Stub parse. Output the JSON.',
    user: text,
    jsonSchema: parseSchema,
    temperature: 0,
    maxTokens: 300,
    timeoutMs: 25_000
  })
  const parsed = ParsedLog.parse(JSON.parse(raw))
  const foods: MatchedItem[] = parsed.foods.map((f, i) => {
    const unmatched = i === parsed.foods.length - 1 && parsed.foods.length > 1
    return {
      kind: 'food',
      rawName: f.name,
      refId: unmatched ? null : `stub_${i}`,
      displayName: unmatched ? f.name : `${f.name} (stub)`,
      quantity: f.quantity,
      unit: f.unit,
      units: ['serving', 'cup', 'piece'],
      unitAssumed: false,
      candidates: unmatched
        ? [
            { refId: 'stub_candidate_a', name: 'Stub candidate A' },
            { refId: 'stub_candidate_b', name: 'Stub candidate B' }
          ]
        : []
    }
  })
  const exercises: MatchedItem[] = parsed.exercises.map((e, i) => ({
    kind: 'exercise',
    rawName: e.activity,
    refId: `stub_ex_${i}`,
    displayName: `${e.activity} (stub)`,
    durationMin: e.durationMin,
    effort: e.effort,
    candidates: []
  }))
  return ParseResult.parse({
    ok: true,
    parsed,
    items: [...foods, ...exercises],
    safety: null,
    safetyMessage: null
  })
}

const localDate = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function stubDay(date: string): DaySummary {
  const calories = profile?.caloriesEnabled ?? true
  return DaySummary.parse({
    date,
    ...(calories ? { kcalIn: 1000, kcalOut: 100, tdee: 2000 } : {}), // PLACEHOLDERS
    activeMinutes: 30,
    waterGlasses: 4,
    sleepHours: 7,
    bodyWeightKg: null,
    entryCount: 1,
    latestReaction: { text: 'Stub reaction (not AI).', source: 'template' },
    includesDemoData: false
  })
}

export async function stubConfirm(input: ConfirmInput): Promise<ConfirmResult> {
  const reactionText = await generate({
    system: 'Stub explain.',
    user: input.rawText,
    temperature: 0.6,
    maxTokens: 160,
    timeoutMs: 25_000
  })
  const reaction = { text: reactionText, source: 'ai' as const }
  const date = localDate()
  return ConfirmResult.parse({
    entry: {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      date,
      rawText: input.rawText,
      facts: {
        caloriesEnabled: false,
        items: input.items.map((it) => ({ displayName: `${it.refId} (stub)`, source: 'stub' })),
        dayTotals: {
          activeMinutes: 0,
          waterGlasses: input.waterGlasses,
          sleepHours: input.sleepHours
        }
      },
      sleepHours: input.sleepHours,
      waterGlasses: input.waterGlasses,
      bodyWeightKg: input.bodyWeightKg,
      reaction,
      seeded: false
    },
    reaction,
    day: stubDay(date)
  })
}

export const stubDayGet = (date: string): DaySummary => stubDay(date)

export function stubHistory(from: string, to: string): DaySummary[] {
  const out: DaySummary[] = []
  const end = new Date(`${to}T00:00:00`)
  for (
    let d = new Date(`${from}T00:00:00`);
    d <= end && out.length < 366;
    d.setDate(d.getDate() + 1)
  ) {
    out.push(stubDay(localDate(d)))
  }
  return out
}

export const stubSeed = (): { entries: number } => ({ entries: 0 })
