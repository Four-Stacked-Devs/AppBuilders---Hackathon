import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { movingAverage } from '@shared/calc'
import { addDays, localDate } from '@shared/dates'
import type { DaySummary } from '@shared/schemas'
import { useVox } from '../store'

const INK = '#16302a'
const MANGO = '#f2b705'
const GRID = '#e6ece8'

const shortDay = (date: string): string =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { weekday: 'short' })
const shortDate = (date: string): string =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

type Loaded = [DaySummary, DaySummary[], DaySummary[]]

function fetchToday(): Promise<Loaded> {
  const d = localDate()
  return Promise.all([
    window.vox.day.get(d),
    window.vox.history.range(addDays(d, -6), d),
    window.vox.history.range(addDays(d, -29), d)
  ])
}

// Read-only summary. Energy numbers are always marked as estimates; no "over budget" states.
export function TodayScreen(): React.JSX.Element {
  const profile = useVox((s) => s.profile)
  const [today, setToday] = useState<DaySummary | null>(null)
  const [week, setWeek] = useState<DaySummary[]>([])
  const [month, setMonth] = useState<DaySummary[]>([])
  const [seeding, setSeeding] = useState(false)

  const apply = useCallback(([t, w, m]: Loaded) => {
    setToday(t)
    setWeek(w)
    setMonth(m)
  }, [])

  useEffect(() => {
    let alive = true
    fetchToday().then((r) => alive && apply(r))
    return () => {
      alive = false
    }
  }, [apply])

  if (!today) return <div className="page muted">Loading…</div>

  const adult = profile?.mode !== 'teen'
  const energy = today.kcalIn !== undefined
  const demo = month.some((d) => d.includesDemoData)
  const weights = month
    .filter((d) => d.bodyWeightKg !== null)
    .map((d) => ({ date: d.date, value: d.bodyWeightKg as number }))
  const avg = movingAverage(weights, 7)
  const weightData = weights.map((w, i) => ({
    label: shortDate(w.date),
    kg: w.value,
    avg: Math.round(avg[i].value * 10) / 10
  }))
  const weekData = week.map((d) => ({ label: shortDay(d.date), activeMinutes: d.activeMinutes }))

  const seed = async (): Promise<void> => {
    setSeeding(true)
    try {
      await window.vox.dev.seed()
      apply(await fetchToday())
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="page">
      <div className="today-head">
        <h1>Today</h1>
        <span className="small muted">
          {demo && 'Includes demo data. '}
          {new Date().toLocaleDateString('en-PH', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </span>
      </div>

      <div className="tiles">
        {energy && (
          <>
            <Tile value={`~${today.kcalIn}`} label="kcal eaten, estimate" />
            <Tile value={`~${today.kcalOut}`} label="kcal from exercise, estimate" />
          </>
        )}
        <Tile value={today.activeMinutes} label="active minutes" />
        <Tile value={today.waterGlasses} label="glasses of water" />
        <Tile value={today.sleepHours} label="hours of sleep" />
      </div>
      {energy && today.tdee !== undefined && (
        <p className="small muted">
          Your body uses around {today.tdee} kcal on a typical day (Mifflin–St Jeor estimate).
        </p>
      )}

      {today.latestReaction && (
        <div className="section">
          <h2>Latest from Vox</h2>
          <div className="vox">{today.latestReaction.text}</div>
        </div>
      )}

      <div className="section">
        <h2>Active minutes, last 7 days</h2>
        <div className="chart">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
              <Tooltip cursor={{ fill: GRID }} />
              <Bar dataKey="activeMinutes" name="Active minutes" fill={INK} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {adult && (
        <div className="section">
          <h2>Weight, last 30 days</h2>
          {weightData.length === 0 ? (
            <p className="muted">
              Say your weight in a log, like “68 kilos ako ngayong umaga”, to see a trend here.
            </p>
          ) : (
            <div className="chart">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weightData}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    domain={[
                      (min: number) => Math.floor(min - 1),
                      (max: number) => Math.ceil(max + 1)
                    ]}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip />
                  <Line
                    dataKey="kg"
                    name="Weigh-in (kg)"
                    stroke={INK}
                    strokeWidth={0}
                    dot={{ r: 3, fill: INK }}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="avg"
                    name="7-day average (kg)"
                    stroke={MANGO}
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {import.meta.env.DEV && (
        <p className="section small muted">
          Dev tool:{' '}
          <button className="link" disabled={seeding} onClick={seed}>
            {seeding ? 'Adding demo history…' : 'Add 3 weeks of labelled demo history'}
          </button>
        </p>
      )}
    </div>
  )
}

function Tile({ value, label }: { value: string | number; label: string }): React.JSX.Element {
  return (
    <div className="tile">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  )
}
