import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Scale } from 'lucide-react'
import { movingAverage, weightChange } from '@shared/calc'
import type { DaySummary } from '@shared/schemas'
import { shortDate } from '../format'
import { useTokens } from '../useTokens'

// Adults only; callers check profile.mode before rendering.
export function WeightChart({ days }: { days: DaySummary[] }): React.JSX.Element {
  const t = useTokens()
  const weights = days
    .filter((d) => d.bodyWeightKg !== null)
    .map((d) => ({ date: d.date, value: d.bodyWeightKg as number }))
  const avg = movingAverage(weights, 7)
  const data = weights.map((w, i) => ({
    label: shortDate(w.date),
    kg: w.value,
    avg: Math.round(avg[i].value * 10) / 10
  }))
  const change = weightChange(days)
  return (
    <section className="panel">
      <div className="weight-head">
        <h3 className="panel-title">
          <Scale size={18} aria-hidden="true" />
          Weight Trend
        </h3>
        {change && (
          <div className="weight-figure">
            <div className="value">{change.latestKg} kg</div>
            <div className="muted small">
              {change.changeKg > 0 ? '+' : ''}
              {change.changeKg} kg since {shortDate(change.since)}
            </div>
          </div>
        )}
      </div>
      {data.length === 0 ? (
        <p className="empty">
          Say your weight in a log, like “68 kilos ako ngayong umaga”, to see a trend here.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.primary} stopOpacity={0.18} />
                <stop offset="100%" stopColor={t.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={t.line} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: t.muted }}
            />
            <YAxis
              domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fontSize: 11, fill: t.muted }}
            />
            <Tooltip />
            <Area
              dataKey="avg"
              name="7-day average (kg)"
              stroke={t.primary}
              strokeWidth={2}
              fill="url(#wfill)"
              dot={false}
              isAnimationActive
            />
            <Line
              dataKey="kg"
              name="Weigh-in (kg)"
              stroke={t.primary}
              strokeWidth={0}
              dot={{ r: 3, fill: t.primary }}
              isAnimationActive
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
