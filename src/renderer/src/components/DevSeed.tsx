import { useState } from 'react'
import { Database, Loader2, Trash2, Wand2 } from 'lucide-react'

// A small floating dev tool, bottom-left like the Next.js indicator. It only exists in dev builds.
// "Seed" fills the app with about six weeks of simulated history, lifts, plans and chats.
export function DevSeed(): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  if (!import.meta.env.DEV) return null
  const run = (job: () => Promise<{ entries: number }>, done: (n: number) => string): void => {
    setBusy(true)
    setMsg('')
    job()
      .then((r) => {
        setMsg(done(r.entries))
        window.setTimeout(() => window.location.reload(), 700)
      })
      .catch(() => setMsg('That did not work.'))
      .finally(() => setBusy(false))
  }
  return (
    <div className="dev-seed" data-open={open} onMouseLeave={() => !busy && setOpen(false)}>
      {open && (
        <div className="dev-seed-menu" role="menu">
          <p className="dev-seed-title">Dev data</p>
          <button role="menuitem" disabled={busy} onClick={() => run(() => window.vox.dev.seed(), (n) => `Seeded ${n} days`)}>
            <Wand2 size={14} aria-hidden="true" /> Seed 6 weeks of data
          </button>
          <button role="menuitem" disabled={busy} onClick={() => run(() => window.vox.dev.clear(), (n) => `Cleared ${n} entries`)}>
            <Trash2 size={14} aria-hidden="true" /> Clear demo data
          </button>
          {msg && <p className="dev-seed-msg">{msg}</p>}
        </div>
      )}
      <button className="dev-seed-fab" aria-label="Dev data tools" onClick={() => setOpen(!open)} onMouseEnter={() => setOpen(true)}>
        {busy ? <Loader2 size={16} className="spin" /> : <Database size={16} aria-hidden="true" />}
      </button>
    </div>
  )
}
