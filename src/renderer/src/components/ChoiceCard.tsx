import { Check } from 'lucide-react'

// One option in a single-choice group (activity level, goal). Rendered as a radio.
export function ChoiceCard(props: {
  checked: boolean
  title: string
  desc?: string
  onSelect: () => void
}): React.JSX.Element {
  const { checked, title, desc, onSelect } = props
  return (
    <button type="button" role="radio" aria-checked={checked} className="choice" onClick={onSelect}>
      <span className="tick">{checked && <Check size={12} aria-hidden="true" />}</span>
      <span>
        <span className="title" style={{ display: 'block' }}>
          {title}
        </span>
        {desc && <span className="desc">{desc}</span>}
      </span>
    </button>
  )
}
