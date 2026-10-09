import { useState } from 'react'
import { ProfileInput, type ActivityLevel } from '@shared/schemas'
import { ageMode } from '@shared/profile'
import { useVox } from '../store'

const TEEN_GOALS = [
  'Feel more energetic',
  'Get fitter',
  'Get stronger',
  'Sleep better',
  'Build a habit'
]
const ADULT_GOALS = [...TEEN_GOALS, 'Manage my weight']

const LEVELS: { id: ActivityLevel; label: string }[] = [
  { id: 'sedentary', label: 'Mostly sitting' },
  { id: 'light', label: 'Light: some walking' },
  { id: 'moderate', label: 'Moderate: exercise 3–5 days a week' },
  { id: 'active', label: 'Active: exercise 6–7 days a week' },
  { id: 'very_active', label: 'Very active: physical job or training' }
]

type Form = {
  nickname: string
  birthDate: string
  sexForFormula: 'male' | 'female' | 'unspecified'
  heightCm: string
  weightKg: string
  activityLevel: ActivityLevel
  goal: string
}

// One form instead of a multi-screen onboarding. Saved only on this computer.
export function ProfileScreen(): React.JSX.Element {
  const { profile, setProfile, setScreen } = useVox()
  const [form, setForm] = useState<Form>({
    nickname: profile?.nickname ?? '',
    birthDate: profile?.birthDate ?? '',
    sexForFormula: profile?.sexForFormula ?? 'unspecified',
    heightCm: profile ? String(profile.heightCm) : '',
    weightKg: profile ? String(profile.weightKg) : '',
    activityLevel: profile?.activityLevel ?? 'light',
    goal: profile?.goal ?? 'Build a habit'
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const mode = /^\d{4}-\d{2}-\d{2}$/.test(form.birthDate) ? ageMode(form.birthDate) : null
  const goals = mode === 'teen' ? TEEN_GOALS : ADULT_GOALS
  const set = <K extends keyof Form>(k: K, v: Form[K]): void => setForm((f) => ({ ...f, [k]: v }))

  const save = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    if (mode === 'blocked') return setError('Vox is for ages 13 and up.')
    const input = ProfileInput.safeParse({
      ...form,
      goal: goals.includes(form.goal) ? form.goal : goals[0],
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg)
    })
    if (!input.success) {
      const issue = input.error.issues[0]
      return setError(`Check ${String(issue.path[0] ?? 'the form')}: ${issue.message}`)
    }
    setSaving(true)
    try {
      setProfile(await window.vox.profile.save(input.data))
      setScreen('talk')
    } catch (err) {
      setError(
        String(err).replace(/^Error: (Error invoking remote method '[^']+': )?(Error: )?/, '')
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h1>{profile ? 'Your profile' : 'Kumusta! Set up Vox'}</h1>
      <p className="muted">Lahat ng data mo, nasa computer mo lang. Nothing is uploaded.</p>
      <form className="form" onSubmit={save}>
        <div className="field">
          <label htmlFor="nickname">Nickname</label>
          <input
            id="nickname"
            value={form.nickname}
            maxLength={30}
            required
            onChange={(e) => set('nickname', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="birthDate">Birth date</label>
          <input
            id="birthDate"
            type="date"
            value={form.birthDate}
            required
            onChange={(e) => set('birthDate', e.target.value)}
          />
          {mode === 'teen' && (
            <span className="hint">
              Teen mode: Vox tracks activity, water and sleep, without calories or weight.
            </span>
          )}
          {mode === 'blocked' && <span className="hint">Vox is for ages 13 and up.</span>}
        </div>
        {mode !== 'teen' && (
          <div className="field">
            <label htmlFor="sex">Sex for the energy formula</label>
            <select
              id="sex"
              value={form.sexForFormula}
              onChange={(e) => set('sexForFormula', e.target.value as Form['sexForFormula'])}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="unspecified">Prefer not to say (turns calorie estimates off)</option>
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="height">Height (cm)</label>
          <input
            id="height"
            type="number"
            inputMode="decimal"
            min={100}
            max={250}
            value={form.heightCm}
            required
            onChange={(e) => set('heightCm', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="weight">Weight (kg)</label>
          <input
            id="weight"
            type="number"
            inputMode="decimal"
            min={25}
            max={300}
            step="0.1"
            value={form.weightKg}
            required
            onChange={(e) => set('weightKg', e.target.value)}
          />
          <span className="hint">Used to estimate exercise energy.</span>
        </div>
        <div className="field">
          <label htmlFor="level">Usual activity</label>
          <select
            id="level"
            value={form.activityLevel}
            onChange={(e) => set('activityLevel', e.target.value as ActivityLevel)}
          >
            {LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="goal">Goal</label>
          <select
            id="goal"
            value={goals.includes(form.goal) ? form.goal : goals[0]}
            onChange={(e) => set('goal', e.target.value)}
          >
            {goals.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <p className="field wide small muted">
          Vox is not medical advice. Every energy number is an estimate from published tables. For
          health concerns, talk to a doctor.
        </p>
        {error && (
          <p className="field wide error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="btn primary" type="submit" disabled={saving || mode === 'blocked'}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          {profile && (
            <button type="button" className="link" onClick={() => setScreen('talk')}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
