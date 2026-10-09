import type { ActivityLevel } from '../schemas'

// Standard activity multipliers applied to BMR.
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
}

export const tdee = (bmrValue: number, level: ActivityLevel): number =>
  bmrValue * ACTIVITY_FACTORS[level]
