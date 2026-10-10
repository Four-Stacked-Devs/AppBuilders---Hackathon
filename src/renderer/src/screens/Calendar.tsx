import { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Flame, Trophy } from 'lucide-react'
import { addDays, addMonths, localDate, monthBounds, startOfWeek } from '@shared/dates'
import type { DaySummary } from '@shared/schemas'
import { useVox } from '../store'
import { monthLabel, shortDate } from '../format'
import { SkeletonChart } from '../components/Skeleton'
import { StreakFlame } from '../components/StreakFlame'
import { KpiCard } from '../components/widgets'
import { useStreak } from '../useStreak'

// How hard a day was, for colour only: nothing logged, logged, moved, hard day (60+ minutes).
const level = (d: DaySummary | undefined): 0 | 1 | 2 | 3 =>
  !d || d.entryCount === 0 ? 0 : d.activeMinutes >= 60 ? 3 : d.activeMinutes > 0 ? 2 : 1

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function Calendar(): React.JSX.Element {
  const openDiary = useVox((s) => s.openDiary)
  const today = localDate()
  const [anchor, setAnchor] = useState(today)
  const [month, setMonth] = useState<DaySummary[] | null>(null)
  const [heat, setHeat] = useState<DaySummary[] | null>(null)
  const [run, setRun] = useState<{ run: string[]; passes: string[] } | null>(null)
  const { streak } = useStreak(anchor)
  const { from, to } = monthBounds(anchor)
  const gridStart = startOfWeek(from)

  useEffect(() => {
    let alive = true
    const end = addDays(startOfWeek(to), 6)
    window.vox.history.range(gridStart, end > today ? today : end).then((d) => alive && setMonth(d))
    return () => {
      alive = false
    }
  }, [gridStart, to, today])

  useEffect(() => {
    let alive = true
    window.vox.history
      .range(addDays(startOfWeek(today), -77), today)
      .then((d) => alive && setHeat(d))
    window.vox.streak.run().then((r) => alive && setRun(r))
    return () => {
      alive = false
    }
  }, [today])

  const byDate = new Map((month ?? []).map((d) => [d.date, d]))
  const inRun = new Set(run?.run ?? [])
  const passes = new Set(run?.passes ?? [])
  const gridEnd = addDays(startOfWeek(to), 6)
  const cells: string[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) cells.push(d)
  const rows = Math.ceil(cells.length / 7)
  const tier =
    streak && streak.days > 0 ? (streak.tier === 'ember' ? 'spark' : streak.tier) : 'spark'
  const loggedThisMonth = (month ?? []).filter(
    (d) => d.date >= from && d.date <= to && d.entryCount > 0
  ).length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p className="sub">Your logging streak and every day you showed up.</p>
        </div>
      </div>

      <div className="kpis kpis-3">
        <KpiCard
          icon={Flame}
          tone="warm"
          value={streak?.days ?? 0}
          suffix=" days"
          label="current streak"
        />
        <KpiCard icon={Trophy} value={streak?.best ?? 0} suffix=" days" label="longest streak" />
        <KpiCard
          icon={CalendarDays}
          tone="water"
          value={loggedThisMonth}
          label={`days logged in ${monthLabel(anchor).split(' ')[0]}`}
        />
      </div>

      <section className="panel heat-panel">
        <h3 className="panel-title">
          <Flame size={18} aria-hidden="true" /> Last 12 weeks
        </h3>
        {!heat ? (
          <div className="skeleton" style={{ height: '9rem' }} />
        ) : (
          <div className="heat" role="img" aria-label="Activity over the last 12 weeks">
            {Array.from({ length: 12 * 7 }, (_, i) => {
              const d = addDays(addDays(startOfWeek(today), -77), i)
              const s = heat.find((x) => x.date === d)
              return (
                <i
                  key={d}
                  data-level={d > today ? 'x' : level(s)}
                  title={`${shortDate(d)}: ${s?.activeMinutes ?? 0} active min`}
                />
              )
            })}
          </div>
        )}
        <div className="legend">
          <span>Quiet</span>
          <i data-level="0" />
          <i data-level="1" />
          <i data-level="2" />
          <i data-level="3" />
          <span>Hard day</span>
        </div>
      </section>

      <section
        className="panel cal-panel"
        style={{ ['--run-color' as string]: `var(--flame-${tier}-edge)` }}
      >
        <div className="cal-head">
          <button
            className="icon-btn"
            aria-label="Previous month"
            onClick={() => setAnchor(addMonths(anchor, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <h3>{monthLabel(anchor)}</h3>
          <button
            className="icon-btn"
            aria-label="Next month"
            disabled={to >= today}
            onClick={() => setAnchor(addMonths(anchor, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        {!month ? (
          <SkeletonChart h="22rem" />
        ) : (
          <div className="cal-grid" style={{ ['--rows' as string]: rows }}>
            {WEEKDAYS.map((w) => (
              <span className="cal-dow" key={w}>
                {w}
              </span>
            ))}
            {cells.map((d, i) => {
              const s = byDate.get(d)
              const run1 = inRun.has(d) || passes.has(d)
              const col = i % 7
              const prev = col > 0 && (inRun.has(addDays(d, -1)) || passes.has(addDays(d, -1)))
              const next = col < 6 && (inRun.has(addDays(d, 1)) || passes.has(addDays(d, 1)))
              return (
                <button
                  key={d}
                  className="cal-cell"
                  data-level={d > today ? 'x' : level(s)}
                  data-outside={d < from || d > to}
                  data-today={d === today}
                  data-run={run1}
                  data-pass={passes.has(d)}
                  data-left={run1 && !prev}
                  data-right={run1 && !next}
                  disabled={d > today}
                  onClick={() => openDiary(d)}
                  aria-label={`${shortDate(d)}${s && s.entryCount ? `, ${s.activeMinutes} active minutes` : ''}`}
                >
                  <b>{Number(d.slice(8))}</b>
                  {passes.has(d) ? (
                    <em>rest</em>
                  ) : s && s.activeMinutes > 0 ? (
                    <em>{s.activeMinutes}m</em>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
        <p className="note">
          <StreakFlame tier={tier} size={14} /> The coloured band is your current streak. A rest day
          keeps it going once a week.
        </p>
      </section>
    </div>
  )
}
