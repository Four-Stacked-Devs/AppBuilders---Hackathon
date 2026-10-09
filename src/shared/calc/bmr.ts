// Basal metabolic rate, Mifflin–St Jeor (1990), kcal/day.
export function bmr(sex: 'male' | 'female', kg: number, cm: number, age: number): number {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161)
}
