import type { StreakTier } from '@shared/insights/streak'
import { useVox } from '../store'
import { useStreak } from '../useStreak'
import { StreakFlame } from './StreakFlame'

const CHEER: Record<Exclude<StreakTier, 'ember'>, string> = {
  spark: 'Streak started',
  warm: 'Warming up',
  hot: 'Hot streak',
  blue: 'Blue flame',
  violet: 'Violet flame',
  legend: 'Legend'
}

// Today's streak card, shaped like the other stat cards.
export function StreakCard({ refreshKey }: { refreshKey: unknown }): React.JSX.Element | null {
  const { streak, cheer } = useStreak(refreshKey)
  const setScreen = useVox((s) => s.setScreen)

  if (!streak || streak.hidden) return null
  const { days, tier, atRisk, passUsed, best } = streak
  const ended = days === 0

  return (
    <div className="panel stat streak" data-tier={tier}>
      <StreakFlame tier={tier} size={22} outline={atRisk} flicker={cheer} />
      <div className="value">{days}</div>
      <div className="label">
        day streak
        {passUsed && ', rest pass used'}
      </div>
      {cheer && tier !== 'ember' && (
        <div className="streak-cheer">
          {CHEER[tier]}! {days} {days === 1 ? 'day' : 'days'} in a row.
        </div>
      )}
      {atRisk && <div className="streak-note">Log anything today to keep it going.</div>}
      {ended && (
        <div className="streak-note">
          <button className="link" onClick={() => setScreen('talk')}>
            {best > 0 ? 'Start again today' : 'Log anything to start a streak'}
          </button>
          {best > 0 && ` · Best: ${best} days`}
        </div>
      )}
    </div>
  )
}

// Compact sidebar version, same box as the AI status chip. Shown only while a streak is alive.
export function StreakChip(): React.JSX.Element | null {
  const screen = useVox((s) => s.screen)
  const saved = useVox((s) => s.turns.filter((t) => t.state === 'done').length)
  const { streak } = useStreak(`${screen}:${saved}`)
  if (!streak || streak.hidden || streak.days === 0) return null
  return (
    <div className="ai-chip streak-chip" title={`Best: ${streak.best} days`}>
      <StreakFlame tier={streak.tier} size={16} outline={streak.atRisk} />
      <span>
        {streak.days}-day streak{streak.atRisk ? ', log today to keep it' : ''}
      </span>
    </div>
  )
}
