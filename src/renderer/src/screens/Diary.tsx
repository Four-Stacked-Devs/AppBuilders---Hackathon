import { useEffect, useState } from 'react'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Droplet,
  MessageSquare,
  Moon,
  Utensils
} from 'lucide-react'
import { addDays, localDate, startOfWeek } from '@shared/dates'
import type { DaySummary } from '@shared/schemas'
import { useVox } from '../store'
import { longDate, shortDay } from '../format'
import { LoggedList } from '../components/LoggedList'
import { SkeletonStats } from '../components/Skeleton'
import { AnimatedNumber } from '../components/widgets'

// One day at a time: a week strip to pick the day (dots show which days have logs), that day's
// totals, and its logs with delete. The only filter on the page is the day.
export function Diary(): React.JSX.Element {
  const profile = useVox((s) => s.profile)
  const diaryDate = useVox((s) => s.diaryDate)
  const setScreen = useVox((s) => s.setScreen)
  const today = localDate()
  const [date, setDate] = useState(diaryDate ?? today)
  const [week, setWeek] = useState<DaySummary[] | null>(null)
  const [tick, setTick] = useState(0)
  const start = startOfWeek(date)

  useEffect(() => {
    let alive = true
    window.vox.history.range(start, addDays(start, 6)).then((d) => alive && setWeek(d))
    return () => {
      alive = false
    }
  }, [start, tick])

  const day = week?.find((d) => d.date === date)
  const energy = profile?.mode !== 'teen' && profile?.caloriesEnabled === true
  const go = (d: string): void => setDate(d > today ? today : d)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Diary</h1>
          <p className="sub">{longDate(date)}</p>
        </div>
        <button className="btn sm" onClick={() => setScreen('coach')}>
          <MessageSquare size={16} aria-hidden="true" /> Log with VOX
        </button>
      </div>

      <div className="date-strip" role="tablist" aria-label="Pick a day">
        <button
          className="icon-btn"
          aria-label="Previous week"
          onClick={() => go(addDays(date, -7))}
        >
          <ChevronLeft size={18} />
        </button>
        {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => {
          const s = week?.find((x) => x.date === d)
          return (
            <button
              key={d}
              role="tab"
              className="strip-day"
              aria-selected={d === date}
              data-today={d === today}
              disabled={d > today}
              onClick={() => setDate(d)}
            >
              <span>{shortDay(d)}</span>
              <b>{Number(d.slice(8))}</b>
              <i data-on={(s?.entryCount ?? 0) > 0} />
            </button>
          )
        })}
        <button
          className="icon-btn"
          aria-label="Next week"
          disabled={addDays(date, 7) > today && start >= startOfWeek(today)}
          onClick={() => go(addDays(date, 7))}
        >
          <ChevronRight size={18} />
        </button>
        {date !== today && (
          <button className="btn sm" onClick={() => setDate(today)}>
            Today
          </button>
        )}
      </div>

      {!week ? (
        <SkeletonStats n={4} />
      ) : (
        <div className="mini-stats">
          <MiniStat icon={Activity} label="active min" value={day?.activeMinutes ?? 0} />
          <MiniStat icon={Droplet} label="glasses" value={day?.waterGlasses ?? 0} tone="water" />
          <MiniStat
            icon={Moon}
            label="hours sleep"
            value={day?.sleepHours ?? 0}
            tone="sleep"
            decimals={1}
          />
          {energy && (
            <MiniStat
              icon={Utensils}
              label="kcal eaten, estimate"
              value={day?.kcalIn ?? 0}
              prefix="~"
            />
          )}
        </div>
      )}

      <LoggedList
        date={date}
        title={date === today ? 'Logged today' : 'Logged this day'}
        showWeight={profile?.mode !== 'teen'}
        onChanged={() => setTick((n) => n + 1)}
      />
    </div>
  )
}

function MiniStat(props: {
  icon: typeof Activity
  label: string
  value: number
  tone?: 'sleep' | 'water'
  prefix?: string
  decimals?: number
}): React.JSX.Element {
  const Icon = props.icon
  return (
    <div className="mini-stat" data-tone={props.tone}>
      <Icon size={18} aria-hidden="true" />
      <b>
        <AnimatedNumber value={props.value} prefix={props.prefix} decimals={props.decimals} />
      </b>
      <span>{props.label}</span>
    </div>
  )
}
