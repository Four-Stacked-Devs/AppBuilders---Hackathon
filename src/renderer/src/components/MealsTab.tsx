import { useEffect, useState } from 'react'
import { RefreshCw, ShoppingBasket, Soup } from 'lucide-react'
import type { AvoidTag, MealPlanView, PlateGroup, Slot } from '@shared/meals/types'
import { useVox } from '../store'
import { SkeletonCard } from './Skeleton'

const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner', 'snack']
const AVOID: AvoidTag[] = ['pork', 'chicken', 'beef', 'fish', 'seafood', 'egg', 'vegetarian']
const GROUP_NOTE: Record<PlateGroup, string> = {
  Go: 'Rice, bread, rootcrops: energy',
  Grow: 'Fish, meat, egg, beans: growth and repair',
  Glow: 'Vegetables and fruit: vitamins and fibre',
  Other: 'Other'
}
const kg = (g: number): string => (g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`)

// A donut of the day's Go / Grow / Glow shares next to the Pinggang Pinoy adult plate (half Glow,
// a third Go, a sixth Grow). Colours only; no scores.
function Plate({ go, grow, glow }: { go: number; grow: number; glow: number }): React.JSX.Element {
  const r = 38
  const c = 2 * Math.PI * r
  const parts = [
    { v: glow, color: 'var(--good)' },
    { v: go, color: 'var(--flame-spark-edge)' },
    { v: grow, color: 'var(--primary)' }
  ]
  let off = 0
  return (
    <svg viewBox="0 0 100 100" className="plate" role="img" aria-label="Plate share">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line)" strokeWidth="14" />
      {parts.map((p, i) => {
        const len = p.v * c
        const el = (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth="14"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-off}
            transform="rotate(-90 50 50)"
          />
        )
        off += len
        return el
      })}
    </svg>
  )
}

export function MealsTab(): React.JSX.Element {
  const teen = useVox((s) => s.profile?.mode === 'teen')
  const energy = useVox((s) => s.profile?.mode !== 'teen' && s.profile?.caloriesEnabled === true)
  const [view, setView] = useState<MealPlanView | null | undefined>(undefined)
  const [form, setForm] = useState<{
    days: number
    slots: Slot[]
    people: number
    avoid: AvoidTag[]
  }>({ days: 5, slots: ['breakfast', 'lunch', 'dinner'], people: 2, avoid: [] })
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState<'plan' | 'grocery' | 'prep'>('plan')
  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    let alive = true
    window.vox.meals.active().then((v) => alive && setView(v))
    return () => {
      alive = false
    }
  }, [])

  const planId = view?.plan.id
  useEffect(() => {
    if (!planId) return
    let list: string[] = []
    try {
      list = JSON.parse(localStorage.getItem(`vox.grocery.${planId}`) ?? '[]') as string[]
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setChecked(new Set(list)), 0)
    return () => window.clearTimeout(t)
  }, [planId])

  const toggle = (id: string): void => {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChecked(next)
    try {
      localStorage.setItem(`vox.grocery.${view?.plan.id}`, JSON.stringify([...next]))
    } catch {
      /* ignore */
    }
  }

  if (view === undefined) return <SkeletonCard lines={4} />

  const chip = (on: boolean, label: string, click: () => void): React.JSX.Element => (
    <button key={label} className="choice-pill" aria-pressed={on} onClick={click}>
      <b>{label}</b>
    </button>
  )

  if (!view || creating)
    return (
      <section className="panel workout-form">
        <h3 className="panel-title">
          <Soup size={18} aria-hidden="true" /> Plan my meals
        </h3>
        <p className="muted">
          VOX builds a plate plan from Filipino recipes, grouped as Go, Grow and Glow (Pinggang
          Pinoy). It also makes the grocery list and a prep schedule.
        </p>
        <div className="form-row">
          <span className="label">Days</span>
          <div className="pills">
            {[3, 5, 7].map((d) =>
              chip(form.days === d, `${d} days`, () => setForm({ ...form, days: d }))
            )}
          </div>
        </div>
        <div className="form-row">
          <span className="label">Meals</span>
          <div className="pills">
            {SLOTS.map((s) =>
              chip(form.slots.includes(s), s, () => {
                const slots = form.slots.includes(s)
                  ? form.slots.filter((x) => x !== s)
                  : [...form.slots, s]
                if (slots.length)
                  setForm({ ...form, slots: SLOTS.filter((x) => slots.includes(x)) })
              })
            )}
          </div>
        </div>
        <div className="form-row">
          <span className="label">People eating</span>
          <div className="pills">
            {[1, 2, 3, 4, 6].map((p) =>
              chip(form.people === p, String(p), () => setForm({ ...form, people: p }))
            )}
          </div>
        </div>
        <details className="form-row">
          <summary>Foods to avoid (optional)</summary>
          <div className="pills" style={{ marginTop: '0.8rem' }}>
            {AVOID.map((a) =>
              chip(form.avoid.includes(a), a, () =>
                setForm({
                  ...form,
                  avoid: form.avoid.includes(a)
                    ? form.avoid.filter((x) => x !== a)
                    : [...form.avoid, a]
                })
              )
            )}
          </div>
        </details>
        <div className="form-actions">
          <button
            className="btn primary"
            onClick={() => {
              void window.vox.meals.generate(form).then((v) => {
                setView(v)
                setCreating(false)
              })
            }}
          >
            Create meal plan
          </button>
          {view && (
            <button className="link" onClick={() => setCreating(false)}>
              Cancel
            </button>
          )}
        </div>
      </section>
    )

  const { plan, recipes, grocery, prep, plate } = view
  const groups: PlateGroup[] = ['Go', 'Grow', 'Glow', 'Other']

  return (
    <>
      <div className="tabs sub-tabs" role="tablist">
        {(['plan', 'grocery', 'prep'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            className="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t === 'plan' ? 'Meal plan' : t === 'grocery' ? 'Grocery list' : 'Prep schedule'}
          </button>
        ))}
        <span className="spacer" />
        <button className="btn sm" onClick={() => setCreating(true)}>
          <RefreshCw size={14} aria-hidden="true" /> New plan
        </button>
      </div>

      {tab === 'plan' && (
        <div className="stack tab-body">
          {plan.days.map((d, di) => (
            <section className="panel meal-day" key={di}>
              <div className="review-head">
                <h3>Day {di + 1}</h3>
                {plate[di] ? (
                  <div className="plate-wrap">
                    <Plate go={plate[di].go} grow={plate[di].grow} glow={plate[di].glow} />
                    <span className="muted small">{plate[di].note}</span>
                  </div>
                ) : (
                  <span className="muted small">Go, Grow and Glow groups below</span>
                )}
              </div>
              {d.meals.map((m) => (
                <div className="meal-row" key={m.slot}>
                  <b className="meal-slot">{m.slot}</b>
                  <div className="meal-dishes">
                    {m.recipeIds.map((rid) => {
                      const r = recipes[rid]
                      return (
                        r && (
                          <details key={rid}>
                            <summary>
                              {r.name}
                              {energy && r.course !== 'side' && (
                                <em> ~{r.perServing.kcal} kcal per serving, estimate</em>
                              )}
                            </summary>
                            <p className="muted small">
                              {r.prepMin + r.cookMin} min · serves {r.servings}
                            </p>
                            <ul className="calc-lines">
                              {r.ingredients.map((i) => (
                                <li key={i.foodId}>
                                  {i.name}, {i.grams} g{' '}
                                  <span className={`group-tag g-${i.group}`}>{i.group}</span>
                                </li>
                              ))}
                            </ul>
                            <ol className="calc-lines">
                              {r.steps.map((s) => (
                                <li key={s}>{s}</li>
                              ))}
                            </ol>
                          </details>
                        )
                      )
                    })}
                  </div>
                  <button
                    className="icon-btn"
                    aria-label={`Swap ${m.slot}`}
                    title="Another recipe"
                    onClick={() => void window.vox.meals.swap(plan.id, di, m.slot).then(setView)}
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              ))}
            </section>
          ))}
          <p className="note">
            Recipes are examples with typical amounts.{' '}
            {energy ? 'Energy numbers are estimates from the PhilFCT food table.' : ''} Pinggang
            Pinoy:{' '}
            {teen
              ? 'fill your plate with Go, Grow and Glow foods.'
              : 'half Glow, a third Go, a sixth Grow.'}
          </p>
        </div>
      )}

      {tab === 'grocery' && (
        <section className="panel tab-body">
          <h3 className="panel-title">
            <ShoppingBasket size={18} aria-hidden="true" /> Grocery list for {plan.input.people}{' '}
            {plan.input.people === 1 ? 'person' : 'people'}
          </h3>
          {groups.map((g) => {
            const items = grocery.filter((i) => i.group === g)
            return (
              items.length > 0 && (
                <div key={g} className="grocery-group">
                  <h4>
                    <span className={`group-tag g-${g}`}>{g}</span>{' '}
                    <span className="muted small">{GROUP_NOTE[g]}</span>
                  </h4>
                  {items.map((i) => (
                    <label
                      key={i.foodId}
                      className="grocery-item"
                      data-done={checked.has(i.foodId)}
                    >
                      <input
                        type="checkbox"
                        checked={checked.has(i.foodId)}
                        onChange={() => toggle(i.foodId)}
                      />
                      <span>{i.name}</span>
                      <b>{kg(i.grams)}</b>
                    </label>
                  ))}
                </div>
              )
            )
          })}
        </section>
      )}

      {tab === 'prep' && (
        <section className="panel tab-body">
          <h3 className="panel-title">Prep schedule</h3>
          <ol className="prep-list">
            {prep.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </section>
      )}
    </>
  )
}
