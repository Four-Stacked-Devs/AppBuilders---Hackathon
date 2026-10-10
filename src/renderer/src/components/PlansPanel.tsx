import { AiAssist } from './LiveText'
import { useEffect, useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { shrink } from '@shared/insights/plans'
import { REST_TEXT } from '@shared/insights/copy'
import type { PlanAction, PlanItem, PlanList } from '@shared/schemas'
import { addDays, localDate } from '@shared/dates'

// "Walking, moderate pace" -> "walking", for use inside a sentence.
const shortName = (name: string): string => name.split(',')[0].toLowerCase()

const label = (p: PlanItem): string =>
  `${p.minutes} min ${shortName(p.activityName)}${p.cue ? `, ${p.cue}` : ''}`

const cleanError = (err: unknown): string =>
  String(err).replace(/^Error: (Error invoking remote method '[^']+': )?(Error: )?/, '')

// Plano ko bukas: small if-then plans for today or tomorrow, a gentle offer after a missed one,
// and a rest note when someone has been going hard on little sleep. A missed plan is never
// shown in red or counted against anyone.
export function PlansPanel(props: { plans: PlanList; onChanged: () => void }): React.JSX.Element {
  const { plans, onChanged } = props
  const today = localDate()
  const tomorrow = addDays(today, 1)
  const [activities, setActivities] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({ date: tomorrow, activity: '', minutes: 20, cue: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    window.vox.plan.activities().then((a) => {
      if (!alive) return
      setActivities(a)
      setForm((f) => (f.activity ? f : { ...f, activity: a[0]?.id ?? '' }))
    })
    return () => {
      alive = false
    }
  }, [])

  const upcoming = plans.plans
    .filter((p) => p.date >= today && p.resolution !== 'dropped')
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const missed = plans.nudgesOff ? [] : plans.plans.filter((p) => p.status === 'missed')

  const run = async (fn: () => Promise<unknown>): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      await fn()
      onChanged()
    } catch (err) {
      setError(cleanError(err))
    } finally {
      setBusy(false)
    }
  }

  const save = (e: React.FormEvent): void => {
    e.preventDefault()
    void run(() =>
      window.vox.plan.add({
        date: form.date,
        activityRefId: form.activity,
        minutes: form.minutes,
        cue: form.cue.trim() || undefined
      })
    )
  }

  const resolve = (id: string, action: PlanAction): void =>
    void run(() => window.vox.plan.resolve(id, action))

  const status = (p: PlanItem): React.JSX.Element =>
    p.status === 'kept' ? (
      <span className="plan-done">Done</span>
    ) : p.status === 'pending' ? (
      <span className="muted">Planned</span>
    ) : (
      <span className="muted">Not done</span>
    )

  return (
    <>
      {plans.rest && (
        <section className="safety" role="note" style={{ marginTop: '1rem' }}>
          <p>{REST_TEXT}</p>
        </section>
      )}

      {missed.map((p) => (
        <section className="insight" key={p.id} style={{ marginTop: '1rem' }}>
          <p>
            Your {p.minutes} minute {shortName(p.activityName)} plan for{' '}
            {p.date === addDays(today, -1) ? 'yesterday' : p.date} did not happen. That is okay. Try
            again tomorrow?
          </p>
          <div className="plan-actions">
            <button className="btn sm" disabled={busy} onClick={() => resolve(p.id, 'retry')}>
              Same plan
            </button>
            <button className="btn sm" disabled={busy} onClick={() => resolve(p.id, 'shrink')}>
              Make it {shrink(p.minutes)} minutes
            </button>
            <button className="link" disabled={busy} onClick={() => resolve(p.id, 'drop')}>
              Skip it
            </button>
          </div>
        </section>
      ))}

      <section className="panel" style={{ marginTop: '1rem' }}>
        <h3 className="panel-title">
          <CalendarCheck size={18} aria-hidden="true" />
          Plano ko bukas
        </h3>
        <AiAssist
          title="Need an idea?"
          context={`Plans already set: ${upcoming.length}.`}
          options={[
            { label: 'Suggest something small', task: 'Suggest one easy, small physical activity I can plan for tomorrow, with a friendly reason.' },
            { label: 'Make it a habit', task: 'Give one tip to make tomorrow plan stick, such as a cue after waking up.' }
          ]}
        />

        {upcoming.length === 0 ? (
          <p className="empty">Wala pang plano. Pumili ng maliit na gagawin, kaya mo yan.</p>
        ) : (
          <div className="logged">
            {upcoming.map((p) => (
              <div className="metric" key={p.id}>
                <span className="logged-time">{p.date === today ? 'Today' : 'Tomorrow'}</span>
                <div className="logged-text">{label(p)}</div>
                <span className="v">{status(p)}</span>
              </div>
            ))}
          </div>
        )}

        <form className="plan-form" onSubmit={save}>
          <select
            className="unit-select"
            aria-label="Day"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          >
            <option value={tomorrow}>Tomorrow</option>
            <option value={today}>Today</option>
          </select>
          <select
            className="unit-select"
            aria-label="Activity"
            value={form.activity}
            onChange={(e) => setForm({ ...form, activity: e.target.value })}
          >
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <label className="plan-minutes">
            <input
              className="unit-select"
              type="number"
              aria-label="Minutes"
              min={5}
              max={300}
              step={5}
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}
            />
            <span className="muted small">min</span>
          </label>
          <input
            className="unit-select plan-cue"
            aria-label="When (optional)"
            placeholder="When? e.g. pagkagising"
            maxLength={40}
            value={form.cue}
            onChange={(e) => setForm({ ...form, cue: e.target.value })}
          />
          <button
            className="btn sm primary"
            type="submit"
            disabled={busy || !form.activity || !(form.minutes >= 5 && form.minutes <= 300)}
          >
            Save plan
          </button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    </>
  )
}
