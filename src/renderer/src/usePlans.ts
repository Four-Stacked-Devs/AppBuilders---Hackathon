import { useEffect, useState } from 'react'
import type { PlanList } from '@shared/schemas'

// Plans and nudge flags from main, reloaded whenever `refreshKey` changes.
export function usePlans(refreshKey: unknown): PlanList | null {
  const [plans, setPlans] = useState<PlanList | null>(null)
  useEffect(() => {
    let alive = true
    window.vox.plan.list().then((p) => alive && setPlans(p))
    return () => {
      alive = false
    }
  }, [refreshKey])
  return plans
}
