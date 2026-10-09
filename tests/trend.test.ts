import { describe, it, expect } from 'vitest'
import { trend } from '../src/shared/insights/trend'

describe('trend', () => {
  it('needs at least 6 values', () => {
    expect(trend([10, 20, 30, 40, 50])).toBe('insufficient')
    expect(trend([])).toBe('insufficient')
  })
  it('compares the first third with the last third', () => {
    expect(trend([10, 10, 20, 20, 30, 30])).toBe('up') // 10 -> 30
    expect(trend([30, 30, 20, 20, 10, 10])).toBe('down')
    expect(trend([20, 20, 25, 25, 21, 21])).toBe('steady') // +5%
  })
  it('uses a 10% threshold', () => {
    expect(trend([100, 100, 0, 0, 110, 110])).toBe('steady') // exactly +10%
    expect(trend([100, 100, 0, 0, 111, 111])).toBe('up')
    expect(trend([100, 100, 0, 0, 89, 89])).toBe('down')
  })
  it('handles a series that starts at zero', () => {
    expect(trend([0, 0, 5, 5, 20, 20])).toBe('up')
    expect(trend([0, 0, 0, 0, 0, 0])).toBe('steady')
  })
})
