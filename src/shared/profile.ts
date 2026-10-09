import { ageYears } from './calc'
import type { ProfileInput } from './schemas'

export type AgeMode = 'blocked' | 'teen' | 'adult'

// Under 13: no profile is created. 13–17: teen mode, no calorie, weight or diet content.
export function ageMode(birthDate: string, today = new Date()): AgeMode {
  const age = ageYears(birthDate, today)
  if (age < 13) return 'blocked'
  return age < 18 ? 'teen' : 'adult'
}

export function caloriesEnabledFor(p: ProfileInput, mode: AgeMode): boolean {
  return mode === 'adult' && p.sexForFormula !== 'unspecified'
}
