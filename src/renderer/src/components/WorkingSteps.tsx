import { useEffect, useState } from 'react'
import { SLOW_AFTER_MS, SLOW_NOTE, STEPS, TIPS, TIP_EVERY_MS, stepAt, type WorkKind } from '../tips'

// What the on-device AI is doing right now, shown in the VOX bubble while a log is parsed or
// confirmed. Only the current step is announced; the rotating tip is not a live region.
export function WorkingSteps({ kind }: { kind: WorkKind }): React.JSX.Element {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const started = Date.now()
    const timer = window.setInterval(() => setElapsed(Date.now() - started), 500)
    return () => window.clearInterval(timer)
  }, [])

  const step = STEPS[kind][stepAt(kind, elapsed)]
  const tip = TIPS[Math.floor(elapsed / TIP_EVERY_MS) % TIPS.length]
  const slow = elapsed >= SLOW_AFTER_MS

  return (
    <div className="vox thinking working">
      <div role="status">{step.text}</div>
      {slow && <div className="meta">{SLOW_NOTE}</div>}
      <div className="meta">{tip}</div>
    </div>
  )
}
