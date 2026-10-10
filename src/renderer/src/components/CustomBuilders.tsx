import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { MealPlanView, RecipeView, Slot } from '@shared/meals/types'
import type { WorkoutPlan } from '@shared/workouts/types'

type Lib = { id: string; name: string; muscles: string[]; equipment: string }

// Build your own workout: name it, add as many moves as you like with sets and reps.
export function CustomWorkout(props: { onDone: (p: WorkoutPlan) => void; onCancel: () => void }): React.JSX.Element {
  const [lib, setLib] = useState<Lib[]>([])
  const [title, setTitle] = useState('My workout')
  const [rows, setRows] = useState<{ exerciseId: string; sets: number; reps: string }[]>([])
  const [pick, setPick] = useState('')
  useEffect(() => {
    let alive = true
    window.vox.workout.library().then((l) => {
      if (!alive) return
      setLib(l)
      setPick(l[0]?.id ?? '')
    })
    return () => {
      alive = false
    }
  }, [])
  const name = (id: string): string => lib.find((l) => l.id === id)?.name ?? id
  return (
    <section className="panel workout-form">
      <h3 className="panel-title">Build my own workout</h3>
      <div className="plan-form">
        <input className="unit-select plan-cue" aria-label="Workout name" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="plan-form">
        <select className="unit-select plan-cue" aria-label="Exercise" value={pick} onChange={(e) => setPick(e.target.value)}>
          {lib.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.equipment})
            </option>
          ))}
        </select>
        <button className="btn sm" onClick={() => pick && setRows([...rows, { exerciseId: pick, sets: 3, reps: '10' }])}>
          <Plus size={14} aria-hidden="true" /> Add
        </button>
      </div>
      {rows.map((r, i) => (
        <div className="metric" key={i}>
          <span style={{ flex: 1 }}>{name(r.exerciseId)}</span>
          <input className="unit-select" style={{ width: '6rem' }} type="number" min={1} max={10} aria-label="Sets" value={r.sets} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, sets: Number(e.target.value) } : x)))} />
          <span className="muted small">sets ×</span>
          <input className="unit-select" style={{ width: '8rem' }} aria-label="Reps" value={r.reps} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, reps: e.target.value } : x)))} />
          <button className="icon-btn" aria-label="Remove" onClick={() => setRows(rows.filter((_, k) => k !== i))}>
            <X size={14} />
          </button>
        </div>
      ))}
      <div className="form-actions">
        <button
          className="btn primary"
          disabled={rows.length === 0}
          onClick={() =>
            void window.vox.workout
              .custom({ title, days: [{ name: title, exercises: rows.map((r) => ({ ...r, restSec: 60 })) }] })
              .then(props.onDone)
          }
        >
          Save workout
        </button>
        <button className="link" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    </section>
  )
}

const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner', 'snack']

// Build your own meal day: pick any recipes for each meal.
export function CustomMeal(props: { onDone: (v: MealPlanView) => void; onCancel: () => void }): React.JSX.Element {
  const [recipes, setRecipes] = useState<RecipeView[]>([])
  const [sel, setSel] = useState<Record<Slot, string[]>>({ breakfast: [], lunch: [], dinner: [], snack: [] })
  useEffect(() => {
    let alive = true
    window.vox.meals.recipes().then((r) => alive && setRecipes(r))
    return () => {
      alive = false
    }
  }, [])
  const toggle = (slot: Slot, id: string): void =>
    setSel({ ...sel, [slot]: sel[slot].includes(id) ? sel[slot].filter((x) => x !== id) : [...sel[slot], id] })
  const meals = SLOTS.filter((s) => sel[s].length).map((s) => ({ slot: s, recipeIds: sel[s] }))
  return (
    <section className="panel workout-form">
      <h3 className="panel-title">Build my own meal day</h3>
      {SLOTS.map((s) => (
        <div className="form-row" key={s}>
          <span className="label" style={{ textTransform: 'capitalize' }}>{s}</span>
          <div className="pills">
            {recipes.map((r) => (
              <button key={r.id} className="choice-pill" aria-pressed={sel[s].includes(r.id)} onClick={() => toggle(s, r.id)}>
                <b>{r.name}</b>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="form-actions">
        <button className="btn primary" disabled={meals.length === 0} onClick={() => void window.vox.meals.custom({ meals, people: 2 }).then(props.onDone)}>
          Save meal day
        </button>
        <button className="link" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    </section>
  )
}
