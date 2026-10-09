import { useState } from 'react'
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react'
import { ProfileInput, type ActivityLevel } from '@shared/schemas'
import { ageMode } from '@shared/profile'
import { ageYears } from '@shared/calc'
import { useVox } from '../store'
import { Brand } from '../components/Brand'
import { Steps } from '../components/Steps'
import { ChoiceCard } from '../components/ChoiceCard'

const TEEN_GOALS = [
  'Feel more energetic',
  'Get fitter',
  'Get stronger',
  'Sleep better',
  'Build a habit'
]
const ADULT_GOALS = [...TEEN_GOALS, 'Manage my weight']

const LEVELS: { id: ActivityLevel; title: string; desc?: string }[] = [
  { id: 'sedentary', title: 'Mostly sitting' },
  { id: 'light', title: 'Light', desc: 'some walking' },
  { id: 'moderate', title: 'Moderate', desc: 'exercise 3–5 days a week' },
  { id: 'active', title: 'Active', desc: 'exercise 6–7 days a week' },
  { id: 'very_active', title: 'Very active', desc: 'physical job or training' }
]

const SEX: { id: Form['sexForFormula']; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'unspecified', label: 'Prefer not to say' }
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

const cleanError = (err: unknown): string =>
  String(err).replace(/^Error: (Error invoking remote method '[^']+': )?(Error: )?/, '')

const longDob = (d: string): string =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

// Four steps instead of one long form. Saved only on this computer.
export function Onboarding(): React.JSX.Element {
  const { profile, setProfile, setScreen } = useVox()
  const editing = profile !== null
  const [step, setStep] = useState(editing ? 3 : 0)
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
  const goal = goals.includes(form.goal) ? form.goal : goals[0]
  const set = <K extends keyof Form>(k: K, v: Form[K]): void => setForm((f) => ({ ...f, [k]: v }))

  const parsed = (): ReturnType<typeof ProfileInput.safeParse> =>
    ProfileInput.safeParse({
      ...form,
      goal,
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg)
    })

  // Personal Info must be valid before moving on; the schema is the single source of rules.
  const next = (): void => {
    setError('')
    if (step === 1) {
      if (mode === 'blocked') return setError('Vox is for ages 13 and up.')
      const r = parsed()
      const issue = r.success
        ? undefined
        : r.error.issues.find((i) =>
            ['nickname', 'birthDate', 'heightCm', 'weightKg'].includes(String(i.path[0]))
          )
      if (issue) return setError(`Check ${String(issue.path[0])}: ${issue.message}`)
    }
    setStep((s) => s + 1)
  }

  const save = async (): Promise<void> => {
    setError('')
    if (mode === 'blocked') return setError('Vox is for ages 13 and up.')
    const input = parsed()
    if (!input.success) {
      const issue = input.error.issues[0]
      return setError(`Check ${String(issue.path[0] ?? 'the form')}: ${issue.message}`)
    }
    setSaving(true)
    try {
      setProfile(await window.vox.profile.save(input.data))
      setScreen('talk')
    } catch (err) {
      setError(cleanError(err))
    } finally {
      setSaving(false)
    }
  }

  const level = LEVELS.find((l) => l.id === form.activityLevel)

  return (
    <div className="onboard">
      <header className="onboard-top">
        <Brand upper />
        <Steps current={step} />
      </header>
      <div className="onboard-body">
        {step === 0 && (
          <section className="welcome">
            <h1>
              Welcome to <em>VOX</em>
            </h1>
            <p className="lead">
              Your AI fitness coach.
              <br />
              Say what you did, see your day.
            </p>
            <p>Lahat ng data mo, nasa computer mo lang. Nothing is uploaded.</p>
          </section>
        )}

        {step === 1 && (
          <section>
            <h1>Tell us about yourself</h1>
            <p className="sub">This helps VOX estimate your energy use and tailor its replies.</p>
            <div className="panel form-panel">
              <div className="field wide">
                <label htmlFor="nickname">Name / Nickname</label>
                <input
                  id="nickname"
                  value={form.nickname}
                  maxLength={30}
                  onChange={(e) => set('nickname', e.target.value)}
                />
                <span className="hint">This is how VOX will address you.</span>
              </div>
              <div className="field">
                <label htmlFor="birthDate">Date of Birth</label>
                <input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
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
                <div className="field" role="radiogroup" aria-labelledby="sex-label">
                  <span className="label" id="sex-label">
                    Sex <span className="muted">(for calculations)</span>
                  </span>
                  <div className="radios">
                    {SEX.map((s) => (
                      <label key={s.id}>
                        <input
                          type="radio"
                          name="sex"
                          checked={form.sexForFormula === s.id}
                          onChange={() => set('sexForFormula', s.id)}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                  {form.sexForFormula === 'unspecified' && (
                    <span className="hint">Prefer not to say turns calorie estimates off.</span>
                  )}
                </div>
              )}
              <div className="field">
                <label htmlFor="height">Height</label>
                <div className="with-unit">
                  <input
                    id="height"
                    type="number"
                    inputMode="decimal"
                    min={100}
                    max={250}
                    value={form.heightCm}
                    onChange={(e) => set('heightCm', e.target.value)}
                  />
                  <span>cm</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="weight">Weight</label>
                <div className="with-unit">
                  <input
                    id="weight"
                    type="number"
                    inputMode="decimal"
                    min={25}
                    max={300}
                    step="0.1"
                    value={form.weightKg}
                    onChange={(e) => set('weightKg', e.target.value)}
                  />
                  <span>kg</span>
                </div>
                <span className="hint">Used to estimate exercise energy.</span>
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1>Set up your fitness plan</h1>
            <p className="sub">
              Tell us about your activity level and goal so VOX can tailor its replies.
            </p>
            <div className="choice-group" role="radiogroup" aria-labelledby="level-label">
              <span className="label" id="level-label">
                Activity level
              </span>
              <div className="choices">
                {LEVELS.map((l) => (
                  <ChoiceCard
                    key={l.id}
                    checked={form.activityLevel === l.id}
                    title={l.title}
                    desc={l.desc}
                    onSelect={() => set('activityLevel', l.id)}
                  />
                ))}
              </div>
            </div>
            <div className="choice-group" role="radiogroup" aria-labelledby="goal-label">
              <span className="label" id="goal-label">
                Primary goal
              </span>
              <div className="choices">
                {goals.map((g) => (
                  <ChoiceCard
                    key={g}
                    checked={goal === g}
                    title={g}
                    onSelect={() => set('goal', g)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1>Review your profile</h1>
            <p className="sub">
              Make sure everything looks good. You can always update this later in Settings.
            </p>
            <div className="review">
              <div className="stack">
                <div className="panel">
                  <div className="review-head">
                    <h3>Personal Information</h3>
                    <button className="btn sm" onClick={() => setStep(1)}>
                      Edit
                    </button>
                  </div>
                  <dl className="dl">
                    <dt>Name / Nickname</dt>
                    <dd>{form.nickname}</dd>
                    <dt>Date of Birth</dt>
                    <dd>
                      {form.birthDate &&
                        `${longDob(form.birthDate)} (${ageYears(form.birthDate, new Date())} years old)`}
                    </dd>
                    {mode !== 'teen' && (
                      <>
                        <dt>Sex</dt>
                        <dd>{SEX.find((s) => s.id === form.sexForFormula)?.label}</dd>
                      </>
                    )}
                    <dt>Height</dt>
                    <dd>{form.heightCm} cm</dd>
                    {mode !== 'teen' && (
                      <>
                        <dt>Weight</dt>
                        <dd>{form.weightKg} kg</dd>
                      </>
                    )}
                  </dl>
                </div>
                <div className="panel">
                  <div className="review-head">
                    <h3>Fitness Settings</h3>
                    <button className="btn sm" onClick={() => setStep(2)}>
                      Edit
                    </button>
                  </div>
                  <dl className="dl">
                    <dt>Activity Level</dt>
                    <dd>
                      {level ? (level.desc ? `${level.title} (${level.desc})` : level.title) : ''}
                    </dd>
                    <dt>Primary Goal</dt>
                    <dd>{goal}</dd>
                  </dl>
                </div>
              </div>
              <div className="panel">
                <h3>You’re ready to go!</h3>
                <p className="sub">
                  Vox is not medical advice. Every energy number is an estimate from published
                  tables. For health concerns, talk to a doctor.
                </p>
              </div>
            </div>
            <div className="privacy-banner">
              <Lock size={18} aria-hidden="true" />
              <div>
                <strong>Your data stays on this computer</strong>
                <div className="muted">
                  Lahat ng data mo, nasa computer mo lang. Nothing is uploaded.
                </div>
              </div>
            </div>
          </section>
        )}

        {error && (
          <p className="error" role="alert" style={{ marginTop: '1.2rem' }}>
            {error}
          </p>
        )}

        <div className="wizard-actions">
          {step > 0 ? (
            <button className="btn" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
            {editing && (
              <button className="link" onClick={() => setScreen('settings')}>
                Cancel
              </button>
            )}
            {step < 3 ? (
              <button className={`btn primary ${step === 0 ? 'lg' : ''}`} onClick={next}>
                {step === 0 ? 'Let’s get started' : 'Next'}{' '}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                className="btn primary"
                disabled={saving || mode === 'blocked'}
                onClick={save}
              >
                {saving ? 'Saving…' : 'Save Profile'} <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
