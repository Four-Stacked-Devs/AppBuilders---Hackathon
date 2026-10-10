import { useEffect, useState } from 'react'
import { Gift, Target, Trophy } from 'lucide-react'
import { summarizeRange } from '@shared/calc'
import { addDays, localDate } from '@shared/dates'
import type { DaySummary } from '@shared/schemas'
import { Confetti } from './effects'
import { shortDay } from '../format'

// ---------- Goals: only numbers the person sets ----------
type Goals = { activeMin: number; water: number }
const readGoals = (): Goals => {
  try {
    return {
      activeMin: 150,
      water: 28,
      ...(JSON.parse(localStorage.getItem('vox.goals') ?? '{}') as Partial<Goals>)
    }
  } catch {
    return { activeMin: 150, water: 28 }
  }
}

export function GoalsCard(): React.JSX.Element {
  const [goals, setGoals] = useState<Goals>(readGoals)
  const [days, setDays] = useState<DaySummary[] | null>(null)
  const [edit, setEdit] = useState(false)
  useEffect(() => {
    let alive = true
    const t = localDate()
    window.vox.history.range(addDays(t, -6), t).then((d) => alive && setDays(d))
    return () => {
      alive = false
    }
  }, [])
  const sum = summarizeRange(days ?? [])
  const water = (days ?? []).reduce((n, d) => n + d.waterGlasses, 0)
  const save = (g: Goals): void => {
    setGoals(g)
    try {
      localStorage.setItem('vox.goals', JSON.stringify(g))
    } catch {
      /* ignore */
    }
  }
  const bar = (label: string, v: number, goal: number): React.JSX.Element => (
    <div className="goal-row">
      <div className="goal-top">
        <span>{label}</span>
        <b>
          {v} / {goal}
        </b>
      </div>
      <div className="goal-bar">
        <span style={{ width: `${Math.min(100, (v / Math.max(1, goal)) * 100)}%` }} />
      </div>
    </div>
  )
  return (
    <section className="panel">
      <div className="review-head">
        <h3 className="panel-title">
          <Target size={18} aria-hidden="true" /> My weekly goals
        </h3>
        <button className="btn sm" onClick={() => setEdit(!edit)}>
          {edit ? 'Done' : 'Edit'}
        </button>
      </div>
      {edit ? (
        <div className="goal-edit">
          <label>
            Active minutes
            <input
              type="number"
              min={10}
              max={2000}
              value={goals.activeMin}
              onChange={(e) => save({ ...goals, activeMin: Number(e.target.value) || 0 })}
            />
          </label>
          <label>
            Glasses of water
            <input
              type="number"
              min={1}
              max={200}
              value={goals.water}
              onChange={(e) => save({ ...goals, water: Number(e.target.value) || 0 })}
            />
          </label>
        </div>
      ) : (
        <>
          {bar('Active minutes this week', sum.activeMinutes, goals.activeMin)}
          {bar('Glasses of water this week', water, goals.water)}
          <p className="note">These are your own targets. Skipping a week is fine.</p>
        </>
      )}
    </section>
  )
}

// ---------- Weekly Wrapped ----------
export function WrappedButton(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>
        <Gift size={16} aria-hidden="true" /> Weekly Wrapped
      </button>
      {open && <Wrapped onClose={() => setOpen(false)} />}
    </>
  )
}

function Wrapped({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [days, setDays] = useState<DaySummary[] | null>(null)
  const [best, setBest] = useState(0)
  const [i, setI] = useState(0)
  useEffect(() => {
    let alive = true
    const t = localDate()
    window.vox.history.range(addDays(t, -6), t).then((d) => alive && setDays(d))
    window.vox.streak.get().then((s) => alive && setBest(s.days))
    return () => {
      alive = false
    }
  }, [])
  if (!days) return <div className="player" />
  const sum = summarizeRange(days)
  const top = [...days].sort((a, b) => b.activeMinutes - a.activeMinutes)[0]
  const water = days.reduce((n, d) => n + d.waterGlasses, 0)
  const slides: { big: string; text: string }[] = [
    { big: `${sum.activeMinutes}`, text: 'active minutes this week' },
    { big: `${days.filter((d) => d.activeMinutes > 0).length}`, text: 'days you moved' },
    {
      big: top && top.activeMinutes > 0 ? shortDay(top.date) : '-',
      text:
        top && top.activeMinutes > 0
          ? `was your best day, ${top.activeMinutes} minutes`
          : 'Your best day is waiting'
    },
    { big: `${water}`, text: 'glasses of water' },
    { big: `${best}`, text: best === 1 ? 'day streak. Tuloy lang!' : 'day streak. Tuloy lang!' }
  ]
  const s = slides[i]
  return (
    <div
      className="player wrapped"
      role="dialog"
      aria-label="Weekly Wrapped"
      onClick={() => (i + 1 < slides.length ? setI(i + 1) : onClose())}
    >
      <button
        className="icon-btn player-close"
        aria-label="Close"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <Trophy size={20} />
      </button>
      {i === slides.length - 1 && <Confetti />}
      <div className="player-body" key={i}>
        <p className="muted">Your week with VOX</p>
        <div className="wrapped-big">{s.big}</div>
        <h2>{s.text}</h2>
        <div className="dots">
          {slides.map((_, k) => (
            <i key={k} data-on={k === i} />
          ))}
        </div>
        <p className="muted small">Click to continue</p>
      </div>
    </div>
  )
}

// ---------- Set / rep logger ----------
type Lifts = Awaited<ReturnType<typeof window.vox.lifts.list>>
export function LiftsTab(): React.JSX.Element {
  const [data, setData] = useState<Lifts | null>(null)
  const [f, setF] = useState({ exercise: '', reps: 8, weightKg: 20 })
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  useEffect(() => {
    let alive = true
    window.vox.lifts.list().then((d) => alive && setData(d))
    return () => {
      alive = false
    }
  }, [])
  const add = async (): Promise<void> => {
    if (!f.exercise.trim()) return
    const r = await window.vox.lifts.add(f)
    setMsg(
      r.pr
        ? `New personal record! Estimated 1RM ${r.est1rm} kg`
        : `Saved. Estimated 1RM ${r.est1rm} kg`
    )
    setShow(r.pr)
    setData(await window.vox.lifts.list())
  }
  return (
    <>
      {show && <Confetti />}
      <section className="panel">
        <h3 className="panel-title">Log a set</h3>
        <div className="plan-form">
          <input
            className="unit-select plan-cue"
            placeholder="Exercise, e.g. bench press"
            value={f.exercise}
            onChange={(e) => setF({ ...f, exercise: e.target.value })}
          />
          <label className="plan-minutes">
            <input
              className="unit-select"
              type="number"
              min={1}
              max={100}
              value={f.reps}
              onChange={(e) => setF({ ...f, reps: Number(e.target.value) })}
            />
            <span className="muted small">reps</span>
          </label>
          <label className="plan-minutes">
            <input
              className="unit-select"
              type="number"
              min={0}
              max={600}
              step={2.5}
              value={f.weightKg}
              onChange={(e) => setF({ ...f, weightKg: Number(e.target.value) })}
            />
            <span className="muted small">kg</span>
          </label>
          <button className="btn sm primary" onClick={() => void add()}>
            Save set
          </button>
        </div>
        {msg && <p className="note">{msg}. 1RM uses the Epley formula and is an estimate.</p>}
      </section>
      <section className="panel" style={{ marginTop: '1rem' }}>
        <h3 className="panel-title">Personal bests</h3>
        {data && Object.keys(data.best).length === 0 && <p className="empty">Wala pang set. Buhatin na yan.</p>}
        {data &&
          Object.entries(data.best).map(([k, v]) => (
            <div className="metric" key={k}>
              {k} <span className="v">{v} kg est. 1RM</span>
            </div>
          ))}
        <h3 className="panel-title" style={{ marginTop: '1.6rem' }}>
          Recent sets
        </h3>
        {data?.recent.map((r) => (
          <div className="metric" key={r.id}>
            {r.exercise}, {r.reps} × {r.weightKg} kg <span className="v muted">{r.date}</span>
          </div>
        ))}
      </section>
    </>
  )
}
