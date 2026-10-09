import { useEffect, useState } from 'react'
import { ListChecks } from 'lucide-react'
import type { LogEntry } from '@shared/schemas'
import { SkeletonRows } from './Skeleton'
import { entrySummary, sayingOf, timeOfDay } from '../format'

// The day's logs, each deletable after a confirm step. Deleting removes the entry from this
// computer; the day's totals are rebuilt from the remaining entries by main.
export function LoggedList(props: {
  date: string
  title: string
  showWeight: boolean
  onChanged: () => void
}): React.JSX.Element {
  const { date, title, showWeight, onChanged } = props
  const [loaded, setLoaded] = useState<{ date: string; entries: LogEntry[] } | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    window.vox.day.entries(date).then((entries) => alive && setLoaded({ date, entries }))
    return () => {
      alive = false
    }
  }, [date])

  const entries = loaded?.date === date ? loaded.entries : null

  const remove = async (id: string): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      await window.vox.entry.delete(id)
      setConfirming(null)
      setLoaded({ date, entries: await window.vox.day.entries(date) })
      onChanged()
    } catch {
      setError('That log could not be deleted. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel" style={{ marginTop: '1rem' }}>
      <h3 className="panel-title">
        <ListChecks size={18} aria-hidden="true" />
        {title}
      </h3>
      {entries === null ? (
        <SkeletonRows n={2} />
      ) : entries.length === 0 ? (
        <p className="empty">Nothing logged yet.</p>
      ) : (
        <div className="logged">
          {entries.map((e) => (
            <div className="metric logged-row" key={e.id}>
              <span className="logged-time">{timeOfDay(e.createdAt)}</span>
              <div className="logged-text">
                <div>{sayingOf(e)}</div>
                <div className="muted small">{entrySummary(e, showWeight)}</div>
              </div>
              {confirming === e.id ? (
                <div className="logged-confirm" role="group" aria-label="Confirm delete">
                  <span className="small">Delete this log from this computer?</span>
                  <button
                    className="btn sm primary"
                    disabled={busy}
                    onClick={() => void remove(e.id)}
                  >
                    Delete
                  </button>
                  <button className="link" disabled={busy} onClick={() => setConfirming(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className="btn sm" onClick={() => setConfirming(e.id)}>
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
