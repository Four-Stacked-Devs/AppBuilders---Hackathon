// Measures the rule-based Taglish layer (no language model): accuracy on a fixed sentence set,
// how often it fully understands a sentence on its own, and how fast it is. Not part of `npm test`.
// Run: npx vitest run tests/bench.app.golden.test.ts
import { writeFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import { parseRules } from '../src/main/nlu/parseRules'
import { classifyIntent, type Intent } from '../src/main/chat/intent'

type Want = { foods?: number; minutes?: number; sleep?: number; water?: number }
const LOGS: [string, Want][] = [
  ['nag-jog ako ng 30 minutes kanina', { minutes: 30 }],
  ['kumain ako ng 2 cups kanin at adobo', { foods: 2 }],
  ['7 hrs tulog ko kagabi', { sleep: 7 }],
  ['uminom ako ng 5 baso ng tubig', { water: 5 }],
  ['nag-bike ako ng 45 minuto', { minutes: 45 }],
  ['kumain ako ng sinigang at kanin', { foods: 2 }],
  ['almusal ko 2 pandesal at kape', { foods: 2 }],
  ['nag zumba ako ng isang oras', { minutes: 60 }],
  ['nagbasketball kami ng 1 oras', { minutes: 60 }],
  ['natulog ako ng 8 oras', { sleep: 8 }],
  ['uminom ako ng tatlong baso ng tubig', { water: 3 }],
  ['kumain ako ng 3 lumpia', { foods: 1 }],
  ['nag-yoga ako ng 20 minutes', { minutes: 20 }],
  ['nagjogging ako ng kalahating oras', { minutes: 30 }],
  ['tanghalian ko adobo at kanin', { foods: 2 }],
  ['kumain ako ng saging', { foods: 1 }],
  ['nag-swimming ako ng 40 minutes', { minutes: 40 }],
  ['nag-walk ako ng 15 minutes', { minutes: 15 }],
  ['6 na oras lang tulog ko', { sleep: 6 }],
  ['uminom ako ng 8 baso ng tubig', { water: 8 }]
]

const INTENTS: [string, Intent][] = [
  ['Ilang minuto ako gumalaw this week?', 'stats'],
  ['Gawan mo ako ng workout plan', 'workout_plan'],
  ['Gumawa ng meal plan, walang baboy', 'meal_plan'],
  ['Kumain ako ng 2 itlog at kanin', 'log'],
  ['hello', 'chitchat'],
  ['Ano kaya mo gawin?', 'help'],
  ['Ilang calories ang sinigang?', 'food'],
  ['Ano ang magandang warm up?', 'advice'],
  ['salamat', 'chitchat'],
  ['Nag-jog ako ng 30 minutes', 'log']
]

const now = (): number => Number(process.hrtime.bigint()) / 1e6

describe('rule layer benchmark', () => {
  it('measures accuracy, coverage and speed', () => {
    parseRules('warm up') // builds the index once, like app start
    let right = 0
    let complete = 0
    const misses: string[] = []
    for (const [text, want] of LOGS) {
      const r = parseRules(text)
      const minutes = r.parsed.exercises.reduce((n, e) => n + e.durationMin, 0)
      const ok =
        (want.foods === undefined || r.parsed.foods.length === want.foods) &&
        (want.minutes === undefined || minutes === want.minutes) &&
        (want.sleep === undefined || r.parsed.sleepHours === want.sleep) &&
        (want.water === undefined || r.parsed.waterGlasses === want.water)
      if (ok) right++
      else misses.push(text)
      if (r.complete) complete++
    }
    let iRight = 0
    const iMiss: string[] = []
    for (const [text, want] of INTENTS) {
      if (classifyIntent(text).intent === want) iRight++
      else iMiss.push(`${text} -> ${classifyIntent(text).intent}`)
    }
    const RUNS = 2000
    const t0 = now()
    for (let i = 0; i < RUNS; i++) parseRules(LOGS[i % LOGS.length][0])
    const parseMs = (now() - t0) / RUNS
    const t1 = now()
    for (let i = 0; i < RUNS; i++) classifyIntent(INTENTS[i % INTENTS.length][0])
    const intentMs = (now() - t1) / RUNS
    writeFileSync(
      'bench.app.out.json',
      JSON.stringify(
        {
          logSentences: LOGS.length,
          parseCorrect: right,
          fullyUnderstoodWithoutAI: complete,
          parseMsPerSentence: Number(parseMs.toFixed(3)),
          intentSentences: INTENTS.length,
          intentCorrect: iRight,
          intentMsPerMessage: Number(intentMs.toFixed(3)),
          parseMisses: misses,
          intentMisses: iMiss
        },
        null,
        2
      )
    )
  }, 120_000)
})
