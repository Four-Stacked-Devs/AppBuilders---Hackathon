import { useEffect, useState } from 'react'
import { Activity, Droplet, Moon, Ruler, Scale } from 'lucide-react'
import { addDays, localDate } from '@shared/dates'
import { summarizeRange } from '@shared/calc'
import type { DaySummary } from '@shared/schemas'
import { useVox } from '../store'
import { shortDate } from '../format'
import { useTokens } from '../useTokens'
import { BarCard } from '../components/BarCard'
import { TrendsPanel } from '../components/TrendsPanel'
import { WeightChart } from '../components/WeightChart'

const DAYS = 90

export function Progress(): React.JSX.Element {
  const profile = useVox((s) => s.profile)
  const t = useTokens()
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

  const adult = profile?.mode !== 'teen'
  const last30 = (days ?? []).slice(-30)
  const sum = summarizeRange(last30)
  const series = (pick: (d: DaySummary) => number): { label: string; value: number }[] =>
    last30.map((d) => ({ label: shortDate(d.date), value: pick(d) }))
  const latestWeighIn = [...(days ?? [])]
    .reverse()
    .find((d) => d.bodyWeightKg !== null)?.bodyWeightKg

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Progress</h1>
          <p className="sub">A longer view of your health and fitness journey.</p>
        </div>
      </div>
      {days === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="stack">
          {adult && <WeightChart days={days} />}
          {adult && (
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
          )}
          <TrendsPanel days={days} />
          <p className="sub">Last 30 days</p>
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
          </div>
        </div>
      )}
    </div>
  )
}
