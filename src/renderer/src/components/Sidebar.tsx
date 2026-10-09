import { CalendarDays, ChartNoAxesColumnIncreasing, MessageSquare, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useVox, type Screen } from '../store'
import { AiChip } from './AiChip'
import { Brand } from './Brand'
import { StreakChip } from './StreakCard'

const DASHBOARD: Screen[] = ['today', 'weekly', 'monthly']

const ITEMS: { id: Screen; label: string; icon: LucideIcon; match: Screen[] }[] = [
  { id: 'talk', label: 'Talk to VOX', icon: MessageSquare, match: ['talk'] },
  { id: 'today', label: 'Today · Weekly · Monthly', icon: CalendarDays, match: DASHBOARD },
  { id: 'progress', label: 'Progress', icon: ChartNoAxesColumnIncreasing, match: ['progress'] }
]

export function Sidebar(): React.JSX.Element {
  const { screen, setScreen, ai } = useVox()
  const item = (
    id: Screen,
    label: string,
    Icon: LucideIcon,
    match: Screen[]
  ): React.JSX.Element => (
    <button
      key={id}
      className="nav-item"
      aria-current={match.includes(screen) ? 'page' : undefined}
      onClick={() => setScreen(id)}
    >
      <Icon size={17} aria-hidden="true" />
      {label}
    </button>
  )
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="nav" aria-label="Screens">
        {ITEMS.map((i) => item(i.id, i.label, i.icon, i.match))}
      </nav>
      <div className="sidebar-foot">
        <StreakChip />
        <AiChip status={ai} />
        {item('settings', 'Settings', Settings, ['settings'])}
      </div>
    </aside>
  )
}
