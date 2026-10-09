// kcal ≈ MET × body weight in kg × hours
export const exerciseKcal = (met: number, kg: number, minutes: number): number =>
  met * kg * (minutes / 60)

// Common convention: light < 3 METs, moderate 3 to < 6, vigorous 6 and above.
export function intensity(met: number): 'light' | 'moderate' | 'vigorous' {
  if (met < 3) return 'light'
  if (met < 6) return 'moderate'
  return 'vigorous'
}
