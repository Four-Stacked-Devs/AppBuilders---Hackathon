import { useId } from 'react'
import type { StreakTier } from '@shared/insights/streak'

// Lucide's flame outline (ISC), filled with a two-stop gradient per streak tier. Colours are
// the --flame-* tokens, so they follow light and dark themes. Strokes never use currentColor,
// because stat cards colour their icons with the brand red.
const FLAME =
  'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'

const STOPS: Record<Exclude<StreakTier, 'ember'>, [string, string]> = {
  spark: ['--flame-spark-core', '--flame-spark-edge'],
  warm: ['--flame-warm-core', '--flame-warm-edge'],
  hot: ['--flame-hot-core', '--flame-hot-edge'],
  blue: ['--flame-blue-core', '--flame-blue-edge'],
  violet: ['--flame-violet-core', '--flame-violet-edge'],
  legend: ['--flame-violet-core', '--flame-violet-edge']
}

export function StreakFlame(props: {
  tier: StreakTier
  size: number
  outline?: boolean // at risk: the flame is drawn but not lit
  flicker?: boolean // one-time celebration when the tier goes up
}): React.JSX.Element {
  const { tier, size, outline = false, flicker = false } = props
  const id = useId()
  const cls = `streak-flame${flicker ? ' flicker' : ''}`

  if (tier === 'ember')
    return (
      <svg
        className={cls}
        data-tier={tier}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d={FLAME}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeDasharray="2 3"
        />
      </svg>
    )

  const [core, edge] = STOPS[tier]
  return (
    <svg
      className={cls}
      data-tier={tier}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" style={{ stopColor: `var(${core})` }} />
          <stop offset="100%" style={{ stopColor: `var(${edge})` }} />
        </linearGradient>
      </defs>
      <path
        d={FLAME}
        fill={outline ? 'none' : `url(#${id})`}
        stroke={`var(${edge})`}
        strokeWidth={outline ? 2 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}
