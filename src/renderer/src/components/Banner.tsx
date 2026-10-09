import type { LucideIcon } from 'lucide-react'

// Hero card. The illustration slot is the --banner-art CSS variable (none until art exists).
export function Banner(props: {
  kicker?: string
  icon?: LucideIcon
  title: string
  children?: React.ReactNode
}): React.JSX.Element {
  const Icon = props.icon
  return (
    <section className="banner">
      {props.kicker && (
        <div className="kicker">
          {Icon && <Icon size={18} aria-hidden="true" />}
          {props.kicker}
        </div>
      )}
      <h2>{props.title}</h2>
      {props.children && <p>{props.children}</p>}
    </section>
  )
}
