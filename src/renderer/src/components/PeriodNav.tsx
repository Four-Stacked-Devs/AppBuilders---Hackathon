import { ChevronLeft, ChevronRight } from 'lucide-react'

export function PeriodNav(props: {
  label: string
  onPrev: () => void
  onNext: () => void
  nextDisabled: boolean
}): React.JSX.Element {
  return (
    <div className="period">
      <button aria-label="Previous" onClick={props.onPrev}>
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <span className="label">{props.label}</span>
      <button aria-label="Next" disabled={props.nextDisabled} onClick={props.onNext}>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
