import { z } from 'zod'

// Shared contract between main and renderer. Every IPC payload is checked against these.
// Each schema notes the plan section it comes from.

const LocalDate = z.iso.date() // "YYYY-MM-DD", the user's local calendar day

// ---------- Profile (Phase 5.1, 7B) ----------

export const ActivityLevel = z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active'])
export type ActivityLevel = z.infer<typeof ActivityLevel>

export const ProfileInput = z.object({
  nickname: z.string().trim().min(1).max(30),
  birthDate: LocalDate,
  // Only used by the BMR formula; 'unspecified' turns calories off (Phase 7B).
  sexForFormula: z.enum(['male', 'female', 'unspecified']),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(25).max(300),
  activityLevel: ActivityLevel,
  goal: z.string().trim().min(1).max(40) // options are chosen in the UI; teen mode limits them
})
export type ProfileInput = z.infer<typeof ProfileInput>

export const Profile = ProfileInput.extend({
  // Derived in main from birthDate and sexForFormula; never sent by the renderer.
  mode: z.enum(['adult', 'teen']),
  caloriesEnabled: z.boolean(),
  updatedAt: z.iso.datetime()
})
export type Profile = z.infer<typeof Profile>

// ---------- Parse (Phase 3.2) ----------

export const Effort = z.enum(['light', 'moderate', 'hard', 'unknown'])
export type Effort = z.infer<typeof Effort>

export const ParsedLog = z.object({
  foods: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        quantity: z.number().positive().max(5000),
        unit: z.string().max(20)
      })
    )
    .max(15),
  exercises: z
    .array(
      z.object({
        activity: z.string().min(1).max(60),
        durationMin: z.number().positive().max(600),
        effort: Effort
      })
    )
    .max(10),
  sleepHours: z.number().min(0).max(24),
  waterGlasses: z.number().min(0).max(30),
  bodyWeightKg: z.number().min(0).max(300),
  unclear: z.array(z.string())
})
export type ParsedLog = z.infer<typeof ParsedLog>

// ---------- Match (Phase 3.4, 3.5) ----------

export const Candidate = z.object({ refId: z.string(), name: z.string() })
export type Candidate = z.infer<typeof Candidate>

// One row of the confirmation card. refId is null when nothing matched;
// unmatched items are never guessed and show their candidates instead.
export const MatchedItem = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('food'),
    rawName: z.string(),
    refId: z.string().nullable(),
    displayName: z.string(),
    quantity: z.number().positive().max(5000),
    unit: z.string(), // canonical unit, e.g. 'cup', 'piece', 'serving'
    units: z.array(z.string()), // portion keys of the matched food, for the unit dropdown
    unitAssumed: z.boolean(), // true: card shows "assumed 1 serving, tap to change"
    fromCombo: z.string().optional(), // e.g. 'tapsilog' when expanded from combos.json
    candidates: z.array(Candidate).max(3)
  }),
  z.object({
    kind: z.literal('exercise'),
    rawName: z.string(),
    refId: z.string().nullable(),
    displayName: z.string(),
    durationMin: z.number().positive().max(600),
    effort: Effort,
    candidates: z.array(Candidate).max(3)
  })
])
export type MatchedItem = z.infer<typeof MatchedItem>

// Safety hit from the keyword rules that run before the LLM (Phase 7A).
export const SafetyHit = z.enum(['crisis', 'medical', 'eating'])
export type SafetyHit = z.infer<typeof SafetyHit>

export const ParseResult = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    parsed: ParsedLog,
    items: z.array(MatchedItem),
    // 'medical' and 'eating' still parse; the renderer shows safetyMessage first.
    safety: SafetyHit.exclude(['crisis']).nullable(),
    safetyMessage: z.string().nullable(),
    dayOffset: z.number().int().min(-7).max(0).optional(), // kahapon, kagabi: log for an earlier day
    future: z.boolean().optional() // mamaya, bukas: it has not happened yet
  }),
  z.object({
    ok: z.literal(false),
    // 'crisis': nothing was parsed or logged; show only the crisis card.
    safety: z.literal('crisis').nullable(),
    reason: z.string() // fixed user-facing text
  })
])
export type ParseResult = z.infer<typeof ParseResult>

// ---------- Confirm (Phase 3.6, 4) ----------

// What the user confirmed. Unmatched or skipped rows are not sent.
export const ConfirmItem = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('food'),
    refId: z.string().min(1),
    quantity: z.number().positive().max(5000),
    unit: z.string().min(1).max(20)
  }),
  z.object({
    kind: z.literal('exercise'),
    refId: z.string().min(1),
    durationMin: z.number().positive().max(600),
    effort: Effort
  })
])
export type ConfirmItem = z.infer<typeof ConfirmItem>

export const ConfirmInput = z.object({
  rawText: z.string().min(1).max(500),
  items: z.array(ConfirmItem).max(25),
  sleepHours: z.number().min(0).max(24),
  waterGlasses: z.number().min(0).max(30),
  bodyWeightKg: z.number().min(0).max(300),
  safety: SafetyHit.exclude(['crisis']).nullable(), // 'eating' hides calories for this entry
  dayOffset: z.number().int().min(-7).max(0).optional() // log for an earlier day
})
export type ConfirmInput = z.infer<typeof ConfirmInput>

// Everything the explain step may mention. All numbers are computed and rounded by
// src/shared/calc before the LLM sees them; kcal fields are absent when calories are off.
export const FactItem = z.object({
  displayName: z.string(),
  quantityLabel: z.string().optional(), // foods, e.g. "2 cups"
  minutes: z.number().optional(), // exercises
  intensity: z.enum(['light', 'moderate', 'vigorous']).optional(),
  kcal: z.number().optional(),
  source: z.string()
})
export type FactItem = z.infer<typeof FactItem>
export const Facts = z.object({
  caloriesEnabled: z.boolean(),
  items: z.array(FactItem),
  dayTotals: z.object({
    kcalIn: z.number().optional(),
    kcalOut: z.number().optional(),
    tdee: z.number().optional(),
    activeMinutes: z.number(),
    waterGlasses: z.number(),
    sleepHours: z.number()
  })
})
export type Facts = z.infer<typeof Facts>

export const Reaction = z.object({
  text: z.string(),
  source: z.enum(['ai', 'template']),
  rejectedReason: z.string().optional() // why the AI reply was replaced (debug panel)
})
export type Reaction = z.infer<typeof Reaction>

// The inputs behind each saved number, for the "How was this calculated?" breakdown. Kept apart
// from Facts on purpose: the explain step never sees these, so they don't widen the numbers the
// validator allows. kcal, kcalPer100g and weightKg are absent when calories were off.
export const CalcItem = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('food'),
    refId: z.string(),
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    grams: z.number(),
    kcalPer100g: z.number().optional(),
    kcal: z.number().optional(),
    source: z.string()
  }),
  z.object({
    kind: z.literal('exercise'),
    refId: z.string(),
    name: z.string(),
    minutes: z.number(),
    met: z.number(),
    intensity: z.enum(['light', 'moderate', 'vigorous']),
    compendiumCode: z.string(),
    weightKg: z.number().optional(),
    kcal: z.number().optional(),
    source: z.string()
  })
])
export type CalcItem = z.infer<typeof CalcItem>

export const LogEntry = z.object({
  id: z.string(),
  createdAt: z.iso.datetime(),
  date: LocalDate,
  rawText: z.string(),
  facts: Facts,
  sleepHours: z.number(),
  waterGlasses: z.number(),
  bodyWeightKg: z.number(),
  reaction: Reaction,
  seeded: z.boolean(), // true only for demo history from dev:seed (Phase 5.3)
  calc: z.array(CalcItem).optional(), // absent on entries saved before the breakdown existed
  safety: SafetyHit.exclude(['crisis']).nullable().optional() // 'eating' pauses nudges and streaks
})
export type LogEntry = z.infer<typeof LogEntry>

// ---------- Day and history (Phase 5.2) ----------

export const DaySummary = z.object({
  date: LocalDate,
  kcalIn: z.number().optional(), // omitted when calories are off
  kcalOut: z.number().optional(),
  tdee: z.number().optional(),
  activeMinutes: z.number(),
  waterGlasses: z.number(),
  sleepHours: z.number(),
  bodyWeightKg: z.number().nullable(), // latest weigh-in that day
  entryCount: z.number().int(),
  latestReaction: Reaction.nullable(),
  includesDemoData: z.boolean()
})
export type DaySummary = z.infer<typeof DaySummary>

export const ConfirmResult = z.object({
  entry: LogEntry,
  reaction: Reaction,
  day: DaySummary
})
export type ConfirmResult = z.infer<typeof ConfirmResult>

// ---------- Plans: "Plano ko bukas" ----------

// An if-then plan the person made for a day, e.g. 20 minutes of walking after waking up.
export const Commitment = z.object({
  id: z.string(),
  date: LocalDate, // the day the plan is for
  activityRefId: z.string(),
  activityName: z.string(),
  minutes: z.number().int().min(5).max(300),
  cue: z.string().max(40).optional(), // e.g. "pagkagising"
  createdAt: z.iso.datetime(),
  resolution: z.enum(['retried', 'shrunk', 'dropped']).optional() // set once a missed plan is dealt with
})
export type Commitment = z.infer<typeof Commitment>

export const PlanStatus = z.enum(['kept', 'pending', 'missed', 'resolved'])
export type PlanStatus = z.infer<typeof PlanStatus>

export const PlanItem = Commitment.extend({ status: PlanStatus })
export type PlanItem = z.infer<typeof PlanItem>

export const PlanList = z.object({
  plans: z.array(PlanItem), // yesterday, today and tomorrow
  comeback: z.boolean(), // 3 or more days with nothing logged
  rest: z.boolean(), // hard days with little sleep, 3 days running
  nudgesOff: z.boolean() // an eating-related safety message was shown in the last 14 days
})
export type PlanList = z.infer<typeof PlanList>

export const PlanAddInput = z.object({
  date: LocalDate,
  activityRefId: z.string().min(1).max(60),
  minutes: z.number().int().min(5).max(300),
  cue: z.string().trim().max(40).optional()
})
export type PlanAddInput = z.infer<typeof PlanAddInput>

export const PlanAction = z.enum(['retry', 'shrink', 'drop'])
export type PlanAction = z.infer<typeof PlanAction>

// ---------- Habit insights ----------

export const FindingId = z.enum(['active-days', 'short-sleep', 'best-day'])
export type FindingId = z.infer<typeof FindingId>

// A pattern found by plain rules over the saved logs, with the logs that show it.
export const Finding = z.object({
  id: FindingId,
  text: z.string(),
  evidence: z.array(
    z.object({ id: z.string(), date: LocalDate, rawText: z.string(), seeded: z.boolean() })
  )
})
export type Finding = z.infer<typeof Finding>

export const InsightList = z.object({
  enough: z.boolean(), // false until at least 3 of the last 7 days have a log
  findings: z.array(Finding)
})
export type InsightList = z.infer<typeof InsightList>

// ---------- IPC argument schemas ----------

export const LogText = z.string().trim().min(1).max(500)
export const DateArg = LocalDate
