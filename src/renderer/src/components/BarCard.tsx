import { Bar, BarChart, ResponsiveContainer, XAxis } from 'recharts'
import type { LucideIcon } from 'lucide-react'
import { useTokens } from '../useTokens'

export type BarPoint = { label: string; value: number | null }

export function BarCard(props: {
  icon: LucideIcon
  title: string
  value: string
  unit: string
  data: BarPoint[]
  color: string
  compact?: boolean
}): React.JSX.Element {
  const { icon: Icon, title, value, unit, data, color, compact = false } = props
  const t = useTokens()
  return (
    <section className="panel bar-card" data-compact={compact}>
      <div className="bar-card-head">
        <h3 className="panel-title">
          <Icon size={18} style={{ color }} aria-hidden="true" />
          {title}
        </h3>
        <div className="figure">
          <div className="value">{value}</div>
          <div className="unit">{unit}</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={compact ? 64 : 120}>
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          {!compact && (
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={{ fontSize: 11, fill: t.muted }}
            />
          )}
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} isAnimationActive />
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}
