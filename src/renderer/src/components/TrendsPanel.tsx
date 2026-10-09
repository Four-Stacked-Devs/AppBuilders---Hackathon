import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Droplet, Moon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { trend, type Trend } from '@shared/insights/trend'
import type { DaySummary } from '@shared/schemas'

const WINDOW = 14

const WORDS: Record<Exclude<Trend, 'insufficient'>, { text: string; icon: LucideIcon }> = {
  up: { text: 'Going up', icon: ArrowUpRight },
  steady: { text: 'Steady', icon: ArrowRight },
  down: { text: 'Lower than before', icon: ArrowDownRight }
}

// How the last two weeks compare with how they started. Needs at least 6 days with data, and
// never shows a zero or a verdict when there isn't enough to say. Neutral colours only.
export function TrendsPanel({ days }: { days: DaySummary[] }): React.JSX.Element {
  const recent = days.slice(-WINDOW)
  const rows: { icon: LucideIcon; label: string; result: Trend }[] = [
    {
      icon: Activity,
      label: 'Active minutes',
      // Rest days count as zero, but only on days something was logged.
      result: trend(recent.filter((d) => d.entryCount > 0).map((d) => d.activeMinutes))
    },
    {
      icon: Moon,
      label: 'Sleep',
      result: trend(recent.filter((d) => d.sleepHours > 0).map((d) => d.sleepHours))
    },
    {
      icon: Droplet,
      label: 'Water',
      result: trend(recent.filter((d) => d.waterGlasses > 0).map((d) => d.waterGlasses))
    }
  ]
  return (
    <section className="panel">
      <h3 className="panel-title">Last two weeks</h3>
      {rows.map(({ icon: Icon, label, result }) => {
        const word = result === 'insufficient' ? null : WORDS[result]
        const Arrow = word?.icon
        return (
          <div className="metric" key={label}>
            <Icon size={16} aria-hidden="true" /> {label}
            <span className="v">
              {word && Arrow ? (
                <span className="trend-word">
                  <Arrow size={16} aria-hidden="true" /> {word.text}
                </span>
              ) : (
                <span className="muted small">Log a few more days to see a trend</span>
              )}
            </span>
          </div>
        )
      })}
    </section>
  )
}
