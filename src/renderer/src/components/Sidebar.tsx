import {
  BookOpen,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ChevronsLeft,
  ChevronsRight,
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
  const { screen, setScreen, ai, navCollapsed, toggleNav } = useVox()
  const item = (id: Screen, label: string, Icon: LucideIcon): React.JSX.Element => (
    <button
      key={id}
      className="nav-item"
      aria-current={screen === id ? 'page' : undefined}
      onClick={() => setScreen(id)}
    >
      <Icon size={17} aria-hidden="true" />
      <span className="nav-label">{tr(label)}</span>
    </button>
  )
  return (
    <aside className="sidebar">
      <div className="brand-row">
        <Brand />
        <button className="icon-btn" aria-label={navCollapsed ? 'Expand menu' : 'Collapse menu'} onClick={toggleNav}>
          {navCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>
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
