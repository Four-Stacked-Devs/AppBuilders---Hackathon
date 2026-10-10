import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useVox, type Screen } from '../store'

type Cmd = { label: string; hint: string; run: () => void }

// Ctrl+K (or Cmd+K): jump to any page or start an action without reaching for the mouse.
export function CommandPalette(): React.JSX.Element | null {
  const setScreen = useVox((s) => s.setScreen)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQ('')
        setSel(0)
      } else if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  const go = (s: Screen) => (): void => setScreen(s)
  const cmds: Cmd[] = useMemo(
    () => [
      { label: 'Home', hint: 'Go to', run: go('home') },
      { label: 'Coach', hint: 'Go to · chat and log', run: go('coach') },
      { label: 'Diary', hint: 'Go to · logs by day', run: go('diary') },
      { label: 'Calendar', hint: 'Go to · streak calendar', run: go('calendar') },
      { label: 'Progress', hint: 'Go to · trends and patterns', run: go('progress') },
      { label: 'Plans', hint: 'Go to · plans, workouts, meals', run: go('plans') },
      { label: 'Settings', hint: 'Go to', run: go('settings') }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const shown = cmds.filter(
    (c) =>
      c.label.toLowerCase().includes(q.toLowerCase()) ||
      c.hint.toLowerCase().includes(q.toLowerCase())
  )
  if (!open) return null
  return (
    <div className="palette-backdrop" onClick={() => setOpen(false)}>
      <div
        className="palette"
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="palette-input">
          <Search size={17} aria-hidden="true" />
          <input
            ref={input}
            placeholder="Go to… (Ctrl+K)"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setSel(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setSel((s) => Math.min(shown.length - 1, s + 1))
              else if (e.key === 'ArrowUp') setSel((s) => Math.max(0, s - 1))
              else if (e.key === 'Enter' && shown[sel]) {
                shown[sel].run()
                setOpen(false)
              }
            }}
          />
        </label>
        {shown.map((c, i) => (
          <button
            key={c.label}
            className="palette-item"
            data-active={i === sel}
            onMouseEnter={() => setSel(i)}
            onClick={() => {
              c.run()
              setOpen(false)
            }}
          >
            <b>{c.label}</b>
            <span>{c.hint}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
