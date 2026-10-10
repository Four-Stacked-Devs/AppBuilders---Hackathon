import { useCallback, useEffect, useState } from 'react'
import { Dumbbell, Play, RefreshCw } from 'lucide-react'
import {
  MUSCLES,
  type Equipment,
  type Goal,
  type Level,
  type Muscle,
  type WorkoutPlan
} from '@shared/workouts/types'
import { useVox } from '../store'
import { MuscleMap } from './effects'
import { SessionPlayer } from './SessionPlayer'
import { CustomWorkout } from './CustomBuilders'
import { SkeletonCard } from './Skeleton'

const GOALS: { id: Goal; label: string; sub: string }[] = [
  { id: 'habit', label: 'Build a habit', sub: 'Short, easy sessions' },
  { id: 'fitter', label: 'Get fitter', sub: 'Shorter rests, some cardio' },
  { id: 'stronger', label: 'Get stronger', sub: 'Fewer reps, longer rests' }
]
const EQUIP: { id: Equipment; label: string }[] = [
  { id: 'none', label: 'No equipment' },
  { id: 'dumbbell', label: 'Dumbbells' },
  { id: 'gym', label: 'Gym' }
]

// Workout plans: pick a goal, days and equipment, get a week of sessions built by rules (not by
// the AI), then play a session with timers. Finished sessions are logged like any other entry.
export function WorkoutsTab(): React.JSX.Element {
  const teen = useVox((s) => s.profile?.mode === 'teen')
  const [plan, setPlan] = useState<WorkoutPlan | null | undefined>(undefined)
  const [sets, setSets] = useState<Record<string, number>>({})
  const [form, setForm] = useState<{ goal: Goal; days: number; equipment: Equipment; level: Level; rest: Muscle[] }>({
    goal: 'habit',
    days: 3,
    equipment: 'none',
    level: 'beginner',
    rest: []
  })
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [custom, setCustom] = useState(false)
  const [all, setAll] = useState<WorkoutPlan[]>([])

  const load = useCallback(() => {
    void window.vox.workout.active().then(setPlan)
    void window.vox.workout.muscles().then(setSets)
    void window.vox.workout.list().then(setAll)
  }, [])

  useEffect(() => {
    let alive = true
    window.vox.workout.active().then((p) => alive && setPlan(p))
    window.vox.workout.muscles().then((m) => alive && setSets(m))
    window.vox.workout.list().then((l) => alive && setAll(l))
    return () => {
      alive = false
    }
  }, [])

  const create = async (): Promise<void> => {
    setBusy(true)
    try {
      setPlan(
        await window.vox.workout.generate({
          goal: form.goal,
          daysPerWeek: form.days,
          equipment: form.equipment,
          level: form.level,
          rest: form.rest
        })
      )
      setCreating(false)
    } finally {
      setBusy(false)
    }
  }

  if (plan === undefined) return <SkeletonCard lines={4} />

  const pill = (on: boolean, label: string, click: () => void, sub?: string): React.JSX.Element => (
    <button key={label} className="choice-pill" aria-pressed={on} onClick={click}>
      <b>{label}</b>
      {sub && <span>{sub}</span>}
    </button>
  )

  if (custom)
    return (
      <CustomWorkout
        onCancel={() => setCustom(false)}
        onDone={(p) => {
          setPlan(p)
          setCustom(false)
          load()
        }}
      />
    )

  if (!plan || creating)
    return (
      <section className="panel workout-form">
        <h3 className="panel-title">
          <Dumbbell size={18} aria-hidden="true" /> Make a workout plan
        </h3>
        <div className="form-row">
          <span className="label">Goal</span>
          <div className="pills">{GOALS.map((g) => pill(form.goal === g.id, g.label, () => setForm({ ...form, goal: g.id }), g.sub))}</div>
        </div>
        {!teen && (
          <>
            <div className="form-row">
              <span className="label">Days a week</span>
              <div className="pills">{[2, 3, 4, 5, 6].map((d) => pill(form.days === d, String(d), () => setForm({ ...form, days: d })))}</div>
            </div>
            <div className="form-row">
              <span className="label">Equipment</span>
              <div className="pills">{EQUIP.map((e) => pill(form.equipment === e.id, e.label, () => setForm({ ...form, equipment: e.id })))}</div>
            </div>
          </>
        )}
        <div className="form-row">
          <span className="label">Experience</span>
          <div className="pills">
            {pill(form.level === 'beginner', 'Beginner', () => setForm({ ...form, level: 'beginner' }), 'New or coming back')}
            {pill(form.level === 'intermediate', 'Intermediate', () => setForm({ ...form, level: 'intermediate' }), 'Training for months')}
          </div>
        </div>
        <details className="form-row">
          <summary>Leave out sore muscles (optional)</summary>
          <div className="pills" style={{ marginTop: '0.8rem' }}>
            {MUSCLES.map((m) =>
              pill(form.rest.includes(m), m, () =>
                setForm({ ...form, rest: form.rest.includes(m) ? form.rest.filter((x) => x !== m) : [...form.rest, m] })
              )
            )}
          </div>
        </details>
        {teen && <p className="note">Teen plans use no equipment and three days a week.</p>}
        <div className="form-actions">
          <button className="btn" onClick={() => setCustom(true)}>Build my own instead</button>
          <button className="btn primary" disabled={busy} onClick={() => void create()}>
            {busy ? 'Building…' : 'Create my plan'}
          </button>
          {plan && (
            <button className="link" onClick={() => setCreating(false)}>
              Cancel
            </button>
          )}
        </div>
      </section>
    )

  return (
    <>
      <section className="panel">
        <div className="review-head">
          <h3 className="panel-title">
            <Dumbbell size={18} aria-hidden="true" /> {plan.title}
          </h3>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            {all.length > 1 && (
              <select className="unit-select" aria-label="Switch plan" value={plan.id} onChange={(e) => void window.vox.workout.setActive(e.target.value).then((x) => { setPlan(x); load() })}>
                {all.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            )}
            <button className="btn sm" onClick={() => setCustom(true)}>Build my own</button>
            <button className="btn sm" onClick={() => setCreating(true)}>
              <RefreshCw size={14} aria-hidden="true" /> New plan
            </button>
          </div>
        </div>
        <ul className="plan-notes">
          {plan.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      <div className="grid-2">
        {plan.days.map((d, i) => (
          <section className="panel day-card" key={d.name + i}>
            <div className="review-head">
              <div>
                <h3>{d.name}</h3>
                <p className="muted small">
                  {d.focus} · about {d.estMinutes} min
                </p>
              </div>
              <button className="btn sm primary" onClick={() => setPlaying(i)}>
                <Play size={14} aria-hidden="true" /> Start
              </button>
            </div>
            <ol className="ex-list">
              {d.exercises.map((e) => (
                <li key={e.exerciseId}>
                  <span>
                    {e.name}
                    <em>{e.muscles.filter((m) => m !== 'cardio').join(', ')}</em>
                  </span>
                  <b>
                    {e.sets} × {e.reps}
                  </b>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <section className="panel">
        <h3 className="panel-title">Muscles worked this week</h3>
        <div className="muscle-wrap">
          <MuscleMap sets={sets} />
          <p className="muted small">Darker means more sets in the last 7 days. Finish a workout to fill it in.</p>
        </div>
      </section>

      {playing !== null && (
        <SessionPlayer plan={plan} dayIndex={playing} onClose={() => setPlaying(null)} onLogged={load} />
      )}
    </>
  )
}
