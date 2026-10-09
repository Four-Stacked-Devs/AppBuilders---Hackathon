// Trailing moving average over calendar days: each point averages every value whose date
// falls within the `windowDays` days ending on that point's date. Dates are "YYYY-MM-DD".
export type DatedValue = { date: string; value: number }

const dayNumber = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function movingAverage(points: DatedValue[], windowDays = 7): DatedValue[] {
  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : 1))
  return sorted.map((p) => {
    const end = dayNumber(p.date)
    const inWindow = sorted.filter((q) => {
      const n = dayNumber(q.date)
      return n <= end && n > end - windowDays
    })
    return { date: p.date, value: inWindow.reduce((s, q) => s + q.value, 0) / inWindow.length }
  })
}
