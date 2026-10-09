import { useEffect, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import type { FindingId, InsightList } from '@shared/schemas'
import { sayingOf, shortDate } from '../format'

// Patterns found by plain rules over the saved logs. Each can show the logs behind it, and
// "This isn't right" hides it for good. Neutral wording; never about food, weight or calories.
export function HabitInsights(): React.JSX.Element | null {
  const [list, setList] = useState<InsightList | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    window.vox.insights.get().then((l) => alive && setList(l))
    return () => {
      alive = false
    }
  }, [tick])

  if (!list) return null
  if (!list.enough)
    return (
      <section className="panel">
        <h3 className="panel-title">
          <Lightbulb size={18} aria-hidden="true" />
          Your patterns
        </h3>
        <p className="empty">Log a few more days to see your patterns.</p>
      </section>
    )
  if (list.findings.length === 0) return null

  const dismiss = async (id: FindingId): Promise<void> => {
    await window.vox.insights.dismiss(id)
    setTick((n) => n + 1)
  }

  return (
    <>
      {list.findings.map((f) => (
        <section className="insight" key={f.id}>
          <h3>
            <Lightbulb size={18} aria-hidden="true" />
            Your patterns
          </h3>
          <p>{f.text}</p>
          <details>
            <summary>Show the logs behind this</summary>
            <ul className="calc-lines">
              {f.evidence.map((e) => (
                <li key={e.id}>
                  {shortDate(e.date)}: {sayingOf(e)}
                </li>
              ))}
            </ul>
          </details>
          <div className="plan-actions">
            <button className="link" onClick={() => void dismiss(f.id)}>
              This isn’t right
            </button>
          </div>
        </section>
      ))}
    </>
  )
}
