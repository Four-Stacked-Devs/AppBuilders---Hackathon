// Logging streak for the hot streak flame. Pure: every date and the hour come in as
// parameters (see tests/insights.purity.test.ts).
//
// Rules, chosen so the streak motivates without punishing:
// - a streak day is any day with at least one confirmed log (food, water, sleep or exercise),
//   so rest days count;
// - one rest pass per 7 days covers a single missed day; two missed days in a row end it;
// - today never breaks the streak while it is still open; from 19:00 it is "at risk";
// - hidden for 14 days after an eating-related safety message, so it never pressures logging.

export type StreakTier = 'ember' | 'spark' | 'warm' | 'hot' | 'blue' | 'violet' | 'legend'

export const TIERS: StreakTier[] = ['ember', 'spark', 'warm', 'hot', 'blue', 'violet', 'legend']

export type Streak = {
  days: number
  tier: StreakTier
  atRisk: boolean
  passUsed: boolean // a rest pass covers a missed day in the last 7 days of this streak
  best: number
  hidden: boolean
}

const PASS_EVERY_DAYS = 7
const AT_RISK_HOUR = 19
const HIDE_AFTER_EATING_DAYS = 14

// Days since 1970-01-01 for a "YYYY-MM-DD" calendar day.
const dayNum = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function tierFor(days: number): StreakTier {
  if (days >= 100) return 'legend'
  if (days >= 30) return 'violet'
  if (days >= 14) return 'blue'
  if (days >= 7) return 'hot'
  if (days >= 3) return 'warm'
  if (days >= 1) return 'spark'
  return 'ember'
}

// Longest run in the whole history, using the same pass rule, walking forward.
function bestRun(logged: number[]): number {
  let best = 0
  let run = 0
  let lastPass = -Infinity
  for (let i = 0; i < logged.length; i++) {
    const gap = i === 0 ? 1 : logged[i] - logged[i - 1]
    if (gap === 1) run++
    else if (gap === 2 && logged[i] - 1 - lastPass >= PASS_EVERY_DAYS) {
      lastPass = logged[i] - 1
      run++
    } else {
      run = 1
      lastPass = -Infinity
    }
    best = Math.max(best, run)
  }
  return best
}

export function computeStreak(
  dates: string[],
  today: string,
  hour: number,
  eatingHitDates: string[]
): Streak {
  const t = dayNum(today)
  const logged = [...new Set(dates.map(dayNum))].filter((n) => n <= t).sort((a, b) => a - b)
  const has = new Set(logged)
  const loggedToday = has.has(t)

  // Walk back from today (or yesterday, while today is still open).
  let cur = loggedToday ? t : t - 1
  let days = 0
  let lastPass: number | null = null
  for (;;) {
    if (has.has(cur)) {
      days++
      cur--
    } else if (has.has(cur - 1) && (lastPass === null || lastPass - cur >= PASS_EVERY_DAYS)) {
      lastPass = cur
      cur--
    } else break
  }
  if (days === 0) lastPass = null

  const hidden = eatingHitDates.some((d) => {
    const n = dayNum(d)
    return n <= t && t - n < HIDE_AFTER_EATING_DAYS
  })

  return {
    days,
    tier: tierFor(days),
    atRisk: days > 0 && !loggedToday && hour >= AT_RISK_HOUR,
    passUsed: lastPass !== null && t - lastPass < PASS_EVERY_DAYS,
    best: Math.max(bestRun(logged), days),
    hidden
  }
}
