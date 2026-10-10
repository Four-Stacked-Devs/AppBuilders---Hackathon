import { summarizeRange } from '@shared/calc'
import { addDays, localDate } from '@shared/dates'
import type { DaySummary } from '@shared/schemas'
import type { MsgBody } from '@shared/chat'
import { strip } from '../nlu/normalize'
import { getHistory, getStreak } from '../confirm'
import { db } from '../store/db'

// Answers "how am I doing" questions entirely in code: the numbers come from the saved logs and
// the calc functions, and the sentence is built from them. The language model is not involved.

type Range = { from: string; to: string; label: string; days: number }

function rangeOf(t: string): Range {
  const today = localDate()
  if (/\b(kahapon|yesterday)\b/.test(t)) {
    const d = addDays(today, -1)
    return { from: d, to: d, label: 'yesterday', days: 1 }
  }
  if (/\b(ngayong buwan|this month|month|buwan)\b/.test(t))
    return { from: addDays(today, -29), to: today, label: 'the last 30 days', days: 30 }
  if (/\b(ngayong linggo|this week|week|linggo|7 days|7 araw)\b/.test(t))
    return { from: addDays(today, -6), to: today, label: 'the last 7 days', days: 7 }
  return { from: today, to: today, label: 'today', days: 1 }
}

const series = (days: DaySummary[], pick: (d: DaySummary) => number): { label: string; value: number }[] =>
  days.map((d) => ({ label: d.date.slice(5), value: pick(d) }))

export function answerStats(raw: string): MsgBody[] {
  const t = strip(raw)
  const profile = db().get().profile
  const teen = profile?.mode === 'teen'
  const r = rangeOf(t)
  const days = getHistory(r.from, r.to)
  const sum = summarizeRange(days)
  const energyOn = !teen && profile?.caloriesEnabled === true

  if (/\b(streak|flame|tuloy)\b/.test(t)) {
    const s = getStreak()
    return [
      {
        type: 'stats',
        title: 'Logging streak',
        value: `${s.days} ${s.days === 1 ? 'day' : 'days'}`,
        sub: s.best > s.days ? `Best so far: ${s.best} days` : 'This is your best so far'
      }
    ]
  }
  if (/\b(calories?|kcal|nakain|kinain|nasunog|burned)\b/.test(t)) {
    if (!energyOn)
      return [{ type: 'text', text: teen ? 'Sa teen mode, hindi ko pinag-uusapan ang calories. Pwede kitang tulungan sa activity, tubig at tulog!' : 'Naka-off ang calorie estimates sa profile mo.' }]
    const burned = /\b(nasunog|burned|exercise)\b/.test(t)
    const total = days.reduce((n, d) => n + ((burned ? d.kcalOut : d.kcalIn) ?? 0), 0)
    return [
      {
        type: 'stats',
        title: `${burned ? 'Calories from exercise' : 'Calories eaten'}, ${r.label}`,
        value: `~${total} kcal`,
        sub: 'An estimate from the published food and activity tables',
        series: r.days > 1 ? series(days, (d) => (burned ? d.kcalOut : d.kcalIn) ?? 0) : undefined
      }
    ]
  }
  if (/\b(tubig|water|baso|nainom|hydrat)\b/.test(t))
    return [{ type: 'stats', title: `Water, ${r.label}`, value: `${days.reduce((n, d) => n + d.waterGlasses, 0)} glasses`, sub: r.days > 1 ? `About ${sum.avgWaterGlasses ?? 0} a day on days you logged it` : undefined, series: r.days > 1 ? series(days, (d) => d.waterGlasses) : undefined }]
  if (/\b(tulog|sleep|natulog)\b/.test(t))
    return [{ type: 'stats', title: `Sleep, ${r.label}`, value: sum.avgSleepHours === null ? 'Not logged' : `${sum.avgSleepHours} h`, sub: 'Average per night you logged', series: r.days > 1 ? series(days, (d) => d.sleepHours) : undefined }]
  if (/\b(timbang|weight|kilos?|bigat)\b/.test(t)) {
    if (teen) return [{ type: 'text', text: 'Sa teen mode, hindi ko sinusubaybayan ang timbang. Focus tayo sa galaw, tulog at tubig.' }]
    const weighed = days.filter((d) => d.bodyWeightKg !== null)
    const last = weighed[weighed.length - 1]
    return [{ type: 'stats', title: `Weight, ${r.label}`, value: last ? `${last.bodyWeightKg} kg` : 'No weigh-in', sub: last ? `Last weigh-in ${last.date}` : 'Say your weight in a log to track it', series: weighed.length > 1 ? series(weighed, (d) => d.bodyWeightKg as number) : undefined }]
  }
  if (/\b(log|logged|araw)\b/.test(t) && /\b(ilang|ilan|how many)\b/.test(t))
    return [{ type: 'stats', title: `Days logged, ${r.label}`, value: `${sum.daysLogged} of ${sum.days}`, sub: 'Any log counts, even just water' }]

  // default: active minutes (gumalaw, exercise, minutes)
  return [
    {
      type: 'stats',
      title: `Active minutes, ${r.label}`,
      value: `${sum.activeMinutes} min`,
      sub: r.days > 1 ? `Active on ${days.filter((d) => d.activeMinutes > 0).length} of ${sum.days} days` : undefined,
      series: r.days > 1 ? series(days, (d) => d.activeMinutes) : undefined
    }
  ]
}
