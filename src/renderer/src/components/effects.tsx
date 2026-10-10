import { useMemo } from 'react'

// A circular countdown: the ring drains as time runs out, the number sits in the middle.
export function RingTimer(props: {
  remaining: number
  total: number
  label?: string
  size?: number
}): React.JSX.Element {
  const { remaining, total, label, size = 180 } = props
  const r = 52
  const c = 2 * Math.PI * r
  const frac = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0
  return (
    <div className="ring-timer" style={{ width: `${size / 12.5}rem`, height: `${size / 12.5}rem` }}>
      <svg viewBox="0 0 120 120" role="img" aria-label={`${remaining} seconds left`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.9s linear' }}
        />
      </svg>
      <div className="ring-center">
        <b>{remaining}</b>
        {label && <span>{label}</span>}
      </div>
    </div>
  )
}

const COLORS = ['var(--primary)', 'var(--flame-spark-edge)', 'var(--flame-warm-edge)', 'var(--flame-blue-edge)', 'var(--flame-violet-edge)', 'var(--good)']

// A short burst of paper for a finished workout or a new personal record. Pure CSS; stops
// under reduced motion (the global rule hides the movement).
export function Confetti(): React.JSX.Element {
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: `${(i * 97) % 100}%`,
        delay: `${(i % 9) * 0.06}s`,
        color: COLORS[i % COLORS.length],
        rot: `${(i * 53) % 360}deg`,
        dx: `${((i * 37) % 41) - 20}vw`
      })),
    []
  )
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} style={{ left: b.left, animationDelay: b.delay, background: b.color, ['--rot' as string]: b.rot, ['--dx' as string]: b.dx }} />
      ))}
    </div>
  )
}

const FRONT: [string, React.JSX.IntrinsicElements['rect']][] = [
  ['shoulders', { x: 21, y: 34, width: 14, height: 11, rx: 5 }],
  ['shoulders', { x: 65, y: 34, width: 14, height: 11, rx: 5 }],
  ['chest', { x: 36, y: 38, width: 28, height: 18, rx: 7 }],
  ['biceps', { x: 21, y: 47, width: 10, height: 24, rx: 5 }],
  ['biceps', { x: 69, y: 47, width: 10, height: 24, rx: 5 }],
  ['core', { x: 40, y: 58, width: 20, height: 26, rx: 6 }],
  ['quads', { x: 35, y: 88, width: 13, height: 42, rx: 6 }],
  ['quads', { x: 52, y: 88, width: 13, height: 42, rx: 6 }],
  ['calves', { x: 36, y: 134, width: 11, height: 34, rx: 5 }],
  ['calves', { x: 53, y: 134, width: 11, height: 34, rx: 5 }]
]
const BACK: [string, React.JSX.IntrinsicElements['rect']][] = [
  ['shoulders', { x: 121, y: 34, width: 14, height: 11, rx: 5 }],
  ['shoulders', { x: 165, y: 34, width: 14, height: 11, rx: 5 }],
  ['back', { x: 136, y: 38, width: 28, height: 34, rx: 8 }],
  ['triceps', { x: 121, y: 47, width: 10, height: 24, rx: 5 }],
  ['triceps', { x: 169, y: 47, width: 10, height: 24, rx: 5 }],
  ['glutes', { x: 138, y: 76, width: 24, height: 14, rx: 6 }],
  ['hamstrings', { x: 135, y: 94, width: 13, height: 38, rx: 6 }],
  ['hamstrings', { x: 152, y: 94, width: 13, height: 38, rx: 6 }],
  ['calves', { x: 136, y: 136, width: 11, height: 32, rx: 5 }],
  ['calves', { x: 153, y: 136, width: 11, height: 32, rx: 5 }]
]

// A front and back figure; muscles worked this week fill in with the brand colour. The depth is
// the number of sets, never a target or a score.
export function MuscleMap({ sets }: { sets: Record<string, number> }): React.JSX.Element {
  const shade = (m: string): { fill: string; opacity: number } => {
    const n = sets[m] ?? 0
    return n === 0 ? { fill: 'var(--line)', opacity: 0.7 } : { fill: 'var(--primary)', opacity: n >= 9 ? 1 : n >= 4 ? 0.65 : 0.38 }
  }
  const draw = (rects: typeof FRONT): React.JSX.Element[] =>
    rects.map(([m, p], i) => (
      <rect key={`${m}-${i}`} {...p} {...shade(m)} className="muscle">
        <title>{`${m}: ${sets[m] ?? 0} sets this week`}</title>
      </rect>
    ))
  return (
    <svg className="muscle-map" viewBox="0 0 200 176" role="img" aria-label="Muscles worked this week">
      <circle cx="50" cy="18" r="11" fill="var(--line)" />
      <circle cx="150" cy="18" r="11" fill="var(--line)" />
      {draw(FRONT)}
      {draw(BACK)}
      <text x="50" y="174" textAnchor="middle" fontSize="8" fill="var(--muted)">Front</text>
      <text x="150" y="174" textAnchor="middle" fontSize="8" fill="var(--muted)">Back</text>
    </svg>
  )
}
