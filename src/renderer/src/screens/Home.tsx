import { useEffect, useState } from 'react'
import { Activity, CalendarCheck, Droplet, Flame, Lightbulb, Moon, Utensils } from 'lucide-react'
import { summarizeRange } from '@shared/calc'
import { addDays, localDate } from '@shared/dates'
import { COMEBACK_TEXT } from '@shared/insights/copy'
import type { DaySummary } from '@shared/schemas'
import { useVox } from '../store'
import { greeting, longDate } from '../format'
import { Banner } from '../components/Banner'
import { SkeletonCard, SkeletonStats } from '../components/Skeleton'
import { StreakCard } from '../components/StreakCard'
import { KpiCard, RangeChips, type RangeKey } from '../components/widgets'
import { usePlans } from '../usePlans'

const DAYS: Record<RangeKey, number> = { day: 1, week: 7, month: 30 }
const WORD: Record<RangeKey, string> = { day: 'today', week: 'last 7 days', month: 'last 30 days' }

const pct = (cur: number, prev: number): number | null =>
  prev > 0 ? ((cur - prev) / prev) * 100 : null

export function Home(): React.JSX.Element {
  const profile = useVox((s) => s.profile)
  const setScreen = useVox((s) => s.setScreen)
  const [range, setRange] = useState<RangeKey>('day')
  const [data, setData] = useState<{ key: RangeKey; cur: DaySummary[]; prev: DaySummary[] } | null>(
    null
  )
  const plans = usePlans(range)

  useEffect(() => {
    let alive = true
    const today = localDate()
    const n = DAYS[range]
    const from = addDays(today, -(n - 1))
    Promise.all([
      window.vox.history.range(from, today),
      window.vox.history.range(addDays(from, -n), addDays(from, -1))
    ]).then(([cur, prev]) => alive && setData({ key: range, cur, prev }))
    return () => {
      alive = false
    }
  }, [range])

  const loaded = data && data.key === range ? data : null
  const adult = profile?.mode !== 'teen'
  const energy = adult && profile?.caloriesEnabled === true
  const n = DAYS[range]
  const cur = loaded?.cur ?? []
  const prev = loaded?.prev ?? []
  const sum = summarizeRange(cur)
  const prevSum = summarizeRange(prev)
  const today = cur[cur.length - 1]
  const total = (xs: DaySummary[], pick: (d: DaySummary) => number): number =>
    xs.reduce((a, d) => a + pick(d), 0)
  const upcoming = plans?.plans
    .filter((p) => p.status === 'pending')
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0]
  const comeback = plans?.comeback && (today?.entryCount ?? 0) === 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Home</h1>
          <p className="sub">{longDate(localDate())}</p>
        </div>
        <RangeChips value={range} onChange={setRange} />
      </div>

      <Banner icon={Flame} title={`${greeting(new Date().getHours())}, ${profile?.nickname}!`}>
        {comeback
          ? COMEBACK_TEXT
          : (today?.entryCount ?? 0) > 0 || range !== 'day'
            ? `Here is your ${WORD[range]}.`
            : 'Nothing logged yet today. Tell VOX what you did.'}
      </Banner>

      {!loaded ? (
        <>
          <SkeletonStats n={4} />
          <div className="grid-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </>
      ) : (
        <>
          <div className="kpis">
            <KpiCard
              icon={Activity}
              value={sum.activeMinutes}
              suffix=" min"
              label={`active minutes, ${WORD[range]}`}
              delta={n > 1 ? pct(sum.activeMinutes, prevSum.activeMinutes) : undefined}
              spark={n > 1 ? cur.map((d) => d.activeMinutes) : undefined}
            />
            <KpiCard
              icon={Droplet}
              tone="water"
              value={total(cur, (d) => d.waterGlasses)}
              label={`glasses of water, ${WORD[range]}`}
              delta={
                n > 1
                  ? pct(
                      total(cur, (d) => d.waterGlasses),
                      total(prev, (d) => d.waterGlasses)
                    )
                  : undefined
              }
              spark={n > 1 ? cur.map((d) => d.waterGlasses) : undefined}
            />
            <KpiCard
              icon={Moon}
              tone="sleep"
              value={n === 1 ? (today?.sleepHours ?? 0) : (sum.avgSleepHours ?? 0)}
              decimals={1}
              suffix=" h"
              label={n === 1 ? 'hours of sleep' : 'average sleep per night'}
              spark={n > 1 ? cur.map((d) => d.sleepHours) : undefined}
            />
            {energy && (
              <KpiCard
                icon={Utensils}
                tone="warm"
                value={n === 1 ? (today?.kcalIn ?? 0) : (sum.avgKcalIn ?? 0)}
                prefix="~"
                label={n === 1 ? 'kcal eaten, estimate' : 'avg kcal eaten per day, estimate'}
                spark={n > 1 ? cur.map((d) => d.kcalIn ?? 0) : undefined}
              />
            )}
          </div>

          <div className="grid-2">
            <StreakCard refreshKey={loaded} />
            <section className="panel next-plan">
              <h3 className="panel-title">
                <CalendarCheck size={18} aria-hidden="true" />
                Next plan
              </h3>
              {upcoming ? (
                <>
                  <p className="next-plan-text">
                    {upcoming.minutes} min {upcoming.activityName.split(',')[0].toLowerCase()}
                    {upcoming.cue ? `, ${upcoming.cue}` : ''}
                  </p>
                  <p className="muted small">
                    {upcoming.date === localDate() ? 'Today' : 'Tomorrow'}
                  </p>
                </>
              ) : (
                <p className="muted">No plan yet. Pick something small to do.</p>
              )}
              <button className="btn sm" onClick={() => setScreen('plans')}>
                {upcoming ? 'Open plans' : 'Make a plan'}
              </button>
            </section>
          </div>

          {today?.latestReaction && (
            <section className="insight">
              <h3>
                <Lightbulb size={18} aria-hidden="true" />
                VOX Insight
              </h3>
              <p>{today.latestReaction.text}</p>
            </section>
          )}
        </>
      )}
    </div>
  )
}
