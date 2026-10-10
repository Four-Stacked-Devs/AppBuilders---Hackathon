import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'

// Small visual building blocks shared by Home, Diary, Calendar, Progress and the chat.

// A number that counts up to its value (about 0.6 s), so cards feel alive when data arrives.
export function AnimatedNumber(props: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}): React.JSX.Element {
  const { value, prefix = '', suffix = '', decimals = 0 } = props
  const [shown, setShown] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = value
      const t = window.setTimeout(() => setShown(value), 0)
      return () => window.clearTimeout(t)
    }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (now: number): void => {
      const p = Math.min(1, (now - start) / 600)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(a + (value - a) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return (
    <span>
      {prefix}
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  )
}

// A tiny line with a soft fill, drawn in plain SVG. Colour comes from the card (currentColor).
export function Sparkline(props: {
  values: number[]
  w?: number
  h?: number
}): React.JSX.Element | null {
  const { values, w = 120, h = 34 } = props
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const step = w / (values.length - 1)
  const pts = values.map((v, i) => [i * step, h - 3 - (v / max) * (h - 8)] as const)
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,${h} ${line} ${w},${h}`
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <polygon points={area} fill="currentColor" opacity="0.14" />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="currentColor" />
    </svg>
  )
}

export type RangeKey = 'day' | 'week' | 'month'
const RANGES: { id: RangeKey; label: string }[] = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: '7 days' },
  { id: 'month', label: '30 days' }
]

// One filter for the whole page: a segmented control with a sliding highlight.
export function RangeChips(props: {
  value: RangeKey
  onChange: (r: RangeKey) => void
  only?: RangeKey[]
}): React.JSX.Element {
  const list = props.only ? RANGES.filter((r) => props.only?.includes(r.id)) : RANGES
  const idx = list.findIndex((r) => r.id === props.value)
  return (
    <div className="range-chips" role="tablist" aria-label="Time range">
      <span
        className="range-pill"
        style={{
          width: `${100 / list.length}%`,
          transform: `translateX(${Math.max(0, idx) * 100}%)`
        }}
      />
      {list.map((r) => (
        <button
          key={r.id}
          role="tab"
          aria-selected={props.value === r.id}
          onClick={() => props.onChange(r.id)}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

// A KPI: icon, animated value, label, optional change against the previous period, sparkline.
export function KpiCard(props: {
  icon: LucideIcon
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  label: string
  tone?: 'sleep' | 'water' | 'warm'
  delta?: number | null // percent change vs the previous period
  spark?: number[]
}): React.JSX.Element {
  const Icon = props.icon
  const d = props.delta
  return (
    <div className="panel kpi" data-tone={props.tone}>
      <div className="kpi-top">
        <Icon size={20} aria-hidden="true" />
        {d !== undefined && d !== null && (
          <span className="kpi-delta" data-dir={d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}>
            {d > 0 ? '↑' : d < 0 ? '↓' : '→'} {Math.abs(Math.round(d))}%
          </span>
        )}
      </div>
      <div className="kpi-value">
        <AnimatedNumber
          value={props.value}
          prefix={props.prefix}
          suffix={props.suffix}
          decimals={props.decimals}
        />
      </div>
      <div className="kpi-label">{props.label}</div>
      {props.spark && <Sparkline values={props.spark} />}
    </div>
  )
}

export function TypingDots(): React.JSX.Element {
  return (
    <span className="typing" role="status" aria-label="VOX is typing">
      <i />
      <i />
      <i />
    </span>
  )
}
