import { describe, it, expect } from 'vitest'
import {
  needsComeback,
  nudgesOff,
  planStatus,
  restWarning,
  shrink
} from '../src/shared/insights/plans'
import { COMEBACK_TEXT, REST_TEXT } from '../src/shared/insights/copy'
import { validateReaction } from '../src/main/ai/validator'
import { addDays } from '../src/shared/dates'
import type { Commitment, LogEntry } from '../src/shared/schemas'

const TODAY = '2026-10-10'
const day = (offset: number): string => addDays(TODAY, offset)

// Synthetic entries and plans: only the fields the rules read are meaningful.
const entry = (date: string, p: Partial<LogEntry> = {}): LogEntry => ({
  id: `${date}-${Math.random()}`,
  createdAt: `${date}T10:00:00.000Z`,
  date,
  rawText: 'x',
  facts: {
    caloriesEnabled: false,
    items: [],
    dayTotals: { activeMinutes: 0, waterGlasses: 0, sleepHours: 0 }
  },
  sleepHours: 0,
  waterGlasses: 0,
  bodyWeightKg: 0,
  reaction: { text: 'r', source: 'template' },
  seeded: false,
  ...p
})
const walked = (date: string, minutes: number, refId = 'walk'): LogEntry =>
  entry(date, {
    calc: [
      {
        kind: 'exercise',
        refId,
        name: 'Walking',
        minutes,
        met: 3.8,
        intensity: 'moderate',
        compendiumCode: '17190',
        source: 's'
      }
    ]
  })
const vigorous = (date: string, minutes: number, sleep: number): LogEntry =>
  entry(date, {
    sleepHours: sleep,
    facts: {
      caloriesEnabled: false,
      items: [{ displayName: 'Run', minutes, intensity: 'vigorous', source: 's' }],
      dayTotals: { activeMinutes: 0, waterGlasses: 0, sleepHours: 0 }
    }
  })
const plan = (date: string, minutes = 20, p: Partial<Commitment> = {}): Commitment => ({
  id: 'p',
  date,
  activityRefId: 'walk',
  activityName: 'Walking',
  minutes,
  createdAt: `${date}T00:00:00.000Z`,
  ...p
})

describe('planStatus', () => {
  it('is kept when a matching exercise reaches half the planned minutes', () => {
    expect(planStatus(plan(day(0), 20), [walked(day(0), 10)], TODAY)).toBe('kept')
    expect(planStatus(plan(day(0), 20), [walked(day(0), 9)], TODAY)).toBe('pending')
  })
  it('adds up several logs of the same activity on the day', () => {
    expect(planStatus(plan(day(0), 20), [walked(day(0), 6), walked(day(0), 5)], TODAY)).toBe(
      'kept'
    )
  })
  it('ignores other activities and other days', () => {
    expect(planStatus(plan(day(0), 20), [walked(day(0), 30, 'jog')], TODAY)).toBe('pending')
    expect(planStatus(plan(day(0), 20), [walked(day(-1), 30)], TODAY)).toBe('pending')
  })
  it('is pending today or later, missed before today', () => {
    expect(planStatus(plan(day(1)), [], TODAY)).toBe('pending')
    expect(planStatus(plan(day(-1)), [], TODAY)).toBe('missed')
  })
  it('is resolved once a missed plan was dealt with, but kept still wins', () => {
    const dropped = plan(day(-1), 20, { resolution: 'dropped' })
    expect(planStatus(dropped, [], TODAY)).toBe('resolved')
    expect(planStatus(dropped, [walked(day(-1), 20)], TODAY)).toBe('kept')
  })
})

describe('shrink', () => {
  it.each([
    [40, 20],
    [20, 10],
    [15, 10],
    [10, 5],
    [5, 5]
  ])('%i -> %i', (from, to) => expect(shrink(from)).toBe(to))
})

describe('needsComeback', () => {
  it('needs 3 or more days since the last log', () => {
    expect(needsComeback([day(-2)], TODAY)).toBe(false)
    expect(needsComeback([day(-3)], TODAY)).toBe(true)
    expect(needsComeback([day(-9), day(-3)], TODAY)).toBe(true)
  })
  it('is false when something was logged today, or nothing was ever logged', () => {
    expect(needsComeback([day(-5), day(0)], TODAY)).toBe(false)
    expect(needsComeback([], TODAY)).toBe(false)
  })
})

describe('restWarning', () => {
  const hard = (sleep = 5): LogEntry[] => [
    vigorous(day(-2), 130, sleep),
    vigorous(day(-1), 120, sleep),
    vigorous(day(0), 150, sleep)
  ]
  it('fires when all 3 days are hard and short on sleep', () =>
    expect(restWarning(hard(), TODAY)).toBe(true))
  it('needs every condition on every day', () => {
    expect(restWarning(hard(6), TODAY)).toBe(false) // enough sleep
    expect(restWarning(hard(0), TODAY)).toBe(false) // sleep not logged is not little sleep
    expect(restWarning([vigorous(day(-2), 119, 5), ...hard().slice(1)], TODAY)).toBe(false)
    expect(restWarning(hard().slice(1), TODAY)).toBe(false) // only 2 days
  })
})

describe('nudgesOff', () => {
  it('is on for 14 days after an eating safety message', () => {
    expect(nudgesOff([day(-13)], TODAY)).toBe(true)
    expect(nudgesOff([day(-14)], TODAY)).toBe(false)
    expect(nudgesOff([], TODAY)).toBe(false)
  })
})

describe('fixed nudge text', () => {
  const facts = {
    caloriesEnabled: false,
    items: [],
    dayTotals: { activeMinutes: 0, waterGlasses: 0, sleepHours: 0 }
  }
  it.each([
    ['comeback', COMEBACK_TEXT],
    ['rest', REST_TEXT]
  ])('%s passes the reply validator in both modes', (_name, text) => {
    expect(validateReaction(text, facts, 'adult')).toEqual({ ok: true })
    expect(validateReaction(text, facts, 'teen')).toEqual({ ok: true })
  })
})
