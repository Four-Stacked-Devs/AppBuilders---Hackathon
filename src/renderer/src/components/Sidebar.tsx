import {
  BookOpen,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  House,
  MessageSquare,
  Settings
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useVox, type Screen } from '../store'
import { AiChip } from './AiChip'
import { Brand } from './Brand'
import { tr } from '../i18n'
import { StreakChip } from './StreakCard'

const ITEMS: { id: Screen; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'coach', label: 'Coach', icon: MessageSquare },
  { id: 'diary', label: 'Diary', icon: BookOpen },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'progress', label: 'Progress', icon: ChartNoAxesColumnIncreasing },
  { id: 'plans', label: 'Plans', icon: ClipboardList }
]

export function Sidebar(): React.JSX.Element {
  const { screen, setScreen, ai } = useVox()
  const item = (id: Screen, label: string, Icon: LucideIcon): React.JSX.Element => (
    <button
      key={id}
      className="nav-item"
      aria-current={screen === id ? 'page' : undefined}
      onClick={() => setScreen(id)}
    >
      <Icon size={17} aria-hidden="true" />
      {tr(label)}
    </button>
  )
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="nav" aria-label="Screens">
        {ITEMS.map((i) => item(i.id, i.label, i.icon))}
      </nav>
      <div className="sidebar-foot">
        <StreakChip />
        <AiChip status={ai} />
        {item('settings', 'Settings', Settings)}
      </div>
    </aside>
  )
}
