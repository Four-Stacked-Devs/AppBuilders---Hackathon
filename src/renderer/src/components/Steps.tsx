import { Fragment } from 'react'
import { Check } from 'lucide-react'

export const STEP_NAMES = ['Welcome', 'Personal Info', 'Fitness Setup', 'Review'] as const

export function Steps({ current }: { current: number }): React.JSX.Element {
  return (
    <ol
      className="steps"
      aria-label="Setup steps"
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {STEP_NAMES.map((name, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        return (
          <Fragment key={name}>
            {i > 0 && <li className="sep" aria-hidden="true" />}
            <li
              className="step"
              data-state={state}
              aria-current={i === current ? 'step' : undefined}
            >
              <span className="num">
                {state === 'done' ? <Check size={14} aria-hidden="true" /> : i + 1}
              </span>
              {name}
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
