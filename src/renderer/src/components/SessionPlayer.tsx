import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, SkipForward, X } from 'lucide-react'
import type { ConfirmResult } from '@shared/schemas'
import type { PlannedExercise, WorkoutDay, WorkoutPlan } from '@shared/workouts/types'
import { Confetti, RingTimer } from './effects'
import { ReactionView } from './ReactionView'

type Step = { kind: 'work' | 'rest'; ex: PlannedExercise; set: number; seconds: number }

function buildSteps(day: WorkoutDay): Step[] {
  const steps: Step[] = []
  day.exercises.forEach((ex, ei) => {
    for (let s = 1; s <= ex.sets; s++) {
      steps.push({ kind: 'work', ex, set: s, seconds: ex.timed ? parseInt(ex.reps, 10) || 30 : 0 })
      const last = ei === day.exercises.length - 1 && s === ex.sets
      if (!last) steps.push({ kind: 'rest', ex, set: s, seconds: ex.restSec })
    }
  })
  return steps
}

// A full-window workout: one move at a time with a ring timer for holds and rests, set counter,
// pause, and a finish screen that logs the session like any other entry.
export function SessionPlayer(props: {
  plan: WorkoutPlan
  dayIndex: number
  onClose: () => void
  onLogged: () => void
}): React.JSX.Element {
  const { plan, dayIndex, onClose, onLogged } = props
  const day = plan.days[dayIndex]
  const steps = useMemo(() => buildSteps(day), [day])
  const [i, setI] = useState(0)
  const [left, setLeft] = useState(steps[0]?.seconds ?? 0)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<ConfirmResult | null>(null)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0) // seconds since the workout began
  const step = steps[i]

  const next = (): void => {
    if (i + 1 >= steps.length) return setDone(true)
    setI(i + 1)
    setLeft(steps[i + 1].seconds)
  }

  useEffect(() => {
    if (done) return
    const timer = window.setInterval(() => setElapsed((n) => n + 1), 1000)
    return () => window.clearInterval(timer)
  }, [done])

  useEffect(() => {
    if (done || paused || !step || step.seconds === 0) return
    const timer = window.setInterval(() => setLeft((n) => n - 1), 1000)
    return () => window.clearInterval(timer)
  }, [done, paused, step])

  useEffect(() => {
    if (!done && step && step.seconds > 0 && left <= 0) {
      const t = window.setTimeout(() => {
        if (i + 1 >= steps.length) setDone(true)
        else {
          setI(i + 1)
          setLeft(steps[i + 1].seconds)
        }
      }, 0)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [left, done, step, i, steps])

  const minutes = Math.max(5, Math.ceil(elapsed / 60))

  const log = async (): Promise<void> => {
    setSaving(true)
    setError('')
    try {
      setResult(await window.vox.workout.finish({ planId: plan.id, dayIndex, minutes }))
      onLogged()
    } catch (err) {
      setError(String(err).replace(/^Error: (Error invoking remote method '[^']+': )?(Error: )?/, ''))
    } finally {
      setSaving(false)
    }
  }

  const exIndex = step ? day.exercises.findIndex((e) => e.exerciseId === step.ex.exerciseId) : -1

  return (
    <div className="player" role="dialog" aria-modal="true" aria-label={`Workout: ${day.name}`}>
      <button className="icon-btn player-close" aria-label="Close workout" onClick={onClose}>
        <X size={20} />
      </button>
      {done ? (
        <div className="player-body">
          <Confetti />
          <h1>{result ? 'Logged!' : 'Nice work!'}</h1>
          <p className="muted">
            {day.name} done in about {minutes} minutes.
          </p>
          {result ? (
            <ReactionView result={result} />
          ) : (
            <button className="btn primary lg" disabled={saving} onClick={() => void log()}>
              {saving ? 'Saving…' : 'Log this workout'}
            </button>
          )}
          {error && <p className="error">{error}</p>}
          <button className="link" onClick={onClose}>
            {result ? 'Close' : 'Close without logging'}
          </button>
        </div>
      ) : (
        step && (
          <div className="player-body">
            <div className="player-progress">
              <span style={{ width: `${(i / steps.length) * 100}%` }} />
            </div>
            <p className="muted small">
              {day.name} · move {exIndex + 1} of {day.exercises.length}
            </p>
            {step.kind === 'work' ? (
              <>
                <h1>{step.ex.name}</h1>
                <p className="player-set">
                  Set {step.set} of {step.ex.sets}
                </p>
                {step.ex.timed ? (
                  <RingTimer remaining={Math.max(0, left)} total={step.seconds} label="sec" />
                ) : (
                  <div className="player-reps">
                    <b>{step.ex.reps}</b>
                    <span>reps</span>
                  </div>
                )}
                <p className="player-tip">{step.ex.tip}</p>
                <div className="player-actions">
                  <button className="btn primary lg" onClick={next}>
                    {step.ex.timed ? 'Skip hold' : 'Done set'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1>Rest</h1>
                <p className="player-set">Next: {steps[i + 1]?.ex.name}</p>
                <RingTimer remaining={Math.max(0, left)} total={step.seconds} label="sec" />
                <p className="player-tip">Breathe slowly. Shake out your arms and legs.</p>
                <div className="player-actions">
                  <button className="btn" onClick={() => setPaused((p) => !p)}>
                    {paused ? <Play size={16} /> : <Pause size={16} />} {paused ? 'Resume' : 'Pause'}
                  </button>
                  <button className="btn primary" onClick={next}>
                    <SkipForward size={16} /> Skip rest
                  </button>
                </div>
              </>
            )}
          </div>
        )
      )}
    </div>
  )
}
