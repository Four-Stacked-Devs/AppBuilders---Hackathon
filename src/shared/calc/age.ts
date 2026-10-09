// Whole years between a "YYYY-MM-DD" birth date and today, both as local calendar days.
// The date string is split by hand: new Date('YYYY-MM-DD') is UTC midnight, which is the
// previous day in timezones west of UTC.
// `today` is passed in so calc stays pure (tests/insights.purity.test.ts).
export function ageYears(birthDate: string, today: Date): number {
  const [y, m, d] = birthDate.split('-').map(Number)
  let age = today.getFullYear() - y
  const monthDiff = today.getMonth() + 1 - m
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age--
  return age
}
