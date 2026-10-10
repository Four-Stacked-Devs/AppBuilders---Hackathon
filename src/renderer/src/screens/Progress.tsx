import { useEffect, useState } from 'react'
import { Activity, Droplet, Moon, Ruler, Scale, Utensils } from 'lucide-react'
import { addDays, localDate } from '@shared/dates'
import { summarizeRange } from '@shared/calc'
import type { DaySummary } from '@shared/schemas'
import { useVox } from '../store'
import { shortDate } from '../format'
import { useTokens } from '../useTokens'
import { BarCard } from '../components/BarCard'
import { HabitInsights } from '../components/HabitInsights'
import { SkeletonCard, SkeletonChart } from '../components/Skeleton'
import { TrendsPanel } from '../components/TrendsPanel'
import { WeightChart } from '../components/WeightChart'
import { RangeChips, type RangeKey } from '../components/widgets'

const DAYS = 90
type Tab = 'body' | 'activity' | 'patterns'

// Three focused sections instead of one long page: Body (weight and measurements), Activity
// (charts for the chosen range) and Patterns (trends and habit insights).
export function Progress(): React.JSX.Element {
  const profile = useVox((s) => s.profile)
  const t = useTokens()
  const adult = profile?.mode !== 'teen'
  const energy = adult && profile?.caloriesEnabled === true
  const [tab, setTab] = useState<Tab>(adult ? 'body' : 'activity')
  const [range, setRange] = useState<RangeKey>('month')
  const [days, setDays] = useState<DaySummary[] | null>(null)
  const today = localDate()
  const from = addDays(today, -(DAYS - 1))

  useEffect(() => {
    let alive = true
    window.vox.history.range(from, today).then((d) => alive && setDays(d))
    return () => {
      alive = false
    }
  }, [from, today])

  const n = range === 'week' ? 7 : 30
  const slice = (days ?? []).slice(-n)
  const sum = summarizeRange(slice)
  const series = (pick: (d: DaySummary) => number): { label: string; value: number }[] =>
    slice.map((d) => ({ label: shortDate(d.date), value: pick(d) }))
  const latestWeighIn = [...(days ?? [])]
    .reverse()
    .find((d) => d.bodyWeightKg !== null)?.bodyWeightKg
  const tabs: { id: Tab; label: string }[] = [
    ...(adult ? [{ id: 'body' as Tab, label: 'Body' }] : []),
    { id: 'activity', label: 'Activity' },
    { id: 'patterns', label: 'Patterns' }
  ]

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Progress</h1>
          <p className="sub">A longer view of your health and fitness journey.</p>
        </div>
        {tab === 'activity' && (
          <RangeChips
            value={range === 'day' ? 'week' : range}
            only={['week', 'month']}
            onChange={setRange}
          />
        )}
      </div>
      <div className="tabs" role="tablist">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            className="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
          >
            {x.label}
          </button>
        ))}
      </div>

      {days === null ? (
        <div className="stack">
          <SkeletonChart h="16rem" />
          <SkeletonCard />
        </div>
      ) : (
        <div className="stack tab-body" key={tab}>
          {tab === 'body' && adult && (
            <>
              <WeightChart days={days} />
              <section className="panel">
                <h3 className="panel-title">Body Metrics</h3>
                <div className="metric">
                  <Ruler size={16} aria-hidden="true" /> Height{' '}
                  <span className="v">{profile?.heightCm} cm</span>
                </div>
                <div className="metric">
                  <Scale size={16} aria-hidden="true" /> Weight{' '}
                  <span className="v">{latestWeighIn ?? profile?.weightKg} kg</span>
                </div>
              </section>
            </>
          )}
          {tab === 'activity' && (
            <div className="grid-2">
              <BarCard
                icon={Activity}
                title="Active minutes"
                value={String(sum.activeMinutes)}
                unit="min total"
                data={series((d) => d.activeMinutes)}
                color={t.primary}
                compact
              />
              <BarCard
                icon={Moon}
                title="Sleep"
                value={sum.avgSleepHours === null ? '—' : `${sum.avgSleepHours} h`}
                unit="avg per night"
                data={series((d) => d.sleepHours)}
                color={t.sleep}
                compact
              />
              <BarCard
                icon={Droplet}
                title="Hydration"
                value={sum.avgWaterGlasses === null ? '—' : String(sum.avgWaterGlasses)}
                unit="glasses avg per day"
                data={series((d) => d.waterGlasses)}
                color={t.water}
                compact
              />
              {energy && (
                <BarCard
                  icon={Utensils}
                  title="Nutrition"
                  value={sum.avgKcalIn === null ? '—' : `~${sum.avgKcalIn}`}
                  unit="avg kcal eaten, estimate"
                  data={series((d) => d.kcalIn ?? 0)}
                  color={t.primary}
                  compact
                />
              )}
            </div>
          )}
          {tab === 'patterns' && (
            <>
              <HabitInsights />
              <TrendsPanel days={days} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
