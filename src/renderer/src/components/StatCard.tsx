import type { LucideIcon } from 'lucide-react'

export function StatCard(props: {
  icon: LucideIcon
  value: string | number
  label: string
  tone?: 'sleep' | 'water'
}): React.JSX.Element {
  const Icon = props.icon
  return (
    <div className="panel stat" data-tone={props.tone}>
      <Icon size={22} aria-hidden="true" />
      <div className="value">{props.value}</div>
      <div className="label">{props.label}</div>
    </div>
  )
}
