// Is a series going up, steady or down? Compares the average of the first third of the values
// with the average of the last third. Pure; the values are already in date order.
export type Trend = 'insufficient' | 'up' | 'steady' | 'down'

const MIN_VALUES = 6
const THRESHOLD = 0.1 // more than 10% either way

const mean = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length

export function trend(values: number[]): Trend {
  if (values.length < MIN_VALUES) return 'insufficient'
  const third = Math.floor(values.length / 3)
  const first = mean(values.slice(0, third))
  const last = mean(values.slice(values.length - third))
  if (first === 0) return last > 0 ? 'up' : 'steady'
  const change = (last - first) / first
  return change > THRESHOLD ? 'up' : change < -THRESHOLD ? 'down' : 'steady'
}
