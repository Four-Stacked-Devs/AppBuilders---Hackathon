import { useState } from 'react'
import { PlansPanel } from '../components/PlansPanel'
import { SkeletonCard } from '../components/Skeleton'
import { WorkoutsTab } from '../components/WorkoutsTab'
import { usePlans } from '../usePlans'

// Everything about what you plan to do next. "Plano ko bukas" keeps small if-then plans; more
// planning tools (workouts, meals) are added as tabs here, so each page stays focused.
export type PlanTab = { id: string; label: string; render: () => React.JSX.Element }

export function Plans(props: { extraTabs?: PlanTab[] }): React.JSX.Element {
  const [tab, setTab] = useState('bukas')
  const [tick, setTick] = useState(0)
  const plans = usePlans(tick)
  const tabs: PlanTab[] = [
    {
      id: 'bukas',
      label: 'Plano ko bukas',
      render: () =>
        plans ? (
          <PlansPanel plans={plans} onChanged={() => setTick((n) => n + 1)} />
        ) : (
          <SkeletonCard lines={4} />
        )
    },
    { id: 'workouts', label: 'Workouts', render: () => <WorkoutsTab /> },
    ...(props.extraTabs ?? [])
  ]
  const active = tabs.find((t) => t.id === tab) ?? tabs[0]
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Plans</h1>
          <p className="sub">Small steps, workouts and meals you want to follow through on.</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            className="tab"
            aria-selected={active.id === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-body" key={active.id}>
        {active.render()}
      </div>
    </div>
  )
}
