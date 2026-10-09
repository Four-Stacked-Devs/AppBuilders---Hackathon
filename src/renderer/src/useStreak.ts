import { useEffect, useState } from 'react'
import { TIERS, type Streak, type StreakTier } from '@shared/insights/streak'

const SEEN_KEY = 'vox.streak.seenTier'

// True when this tier is hotter than the last one remembered, then remembers it. A streak that
// starts over can therefore celebrate again. Storage failures just skip the celebration.
export function tierWentUp(tier: StreakTier): boolean {
  try {
    const seen = localStorage.getItem(SEEN_KEY) as StreakTier | null
    localStorage.setItem(SEEN_KEY, tier)
    return seen !== null && TIERS.indexOf(tier) > TIERS.indexOf(seen)
  } catch {
    return false
  }
}

// The logging streak from main, reloaded whenever `refreshKey` changes. The tier-up flag is
// worked out when the data arrives (in the promise callback), not in an effect body.
export function useStreak(refreshKey: unknown): { streak: Streak | null; cheer: boolean } {
  const [state, setState] = useState<{ streak: Streak | null; cheer: boolean }>({
    streak: null,
    cheer: false
  })
  useEffect(() => {
    let alive = true
    window.vox.streak.get().then((streak) => {
      if (!alive) return
      const cheer = !streak.hidden && streak.tier !== 'ember' && tierWentUp(streak.tier)
      setState((prev) => ({
        streak,
        cheer: cheer || (prev.cheer && prev.streak?.tier === streak.tier)
      }))
    })
    return () => {
      alive = false
    }
  }, [refreshKey])
  return state
}
