import { describe, it, expect } from 'vitest'
import {
  addMonths,
  canGoNext,
  monthBounds,
  periodRange,
  shiftPeriod,
  startOfWeek
} from '../src/shared/dates'

// 2026-10-10 is a Saturday; weeks run Monday to Sunday as in the wireframes.
describe('periods', () => {
  it('startOfWeek returns the Monday', () => {
    expect(startOfWeek('2026-10-10')).toBe('2026-10-05')
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05')
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05')
  })
  it('startOfWeek crosses a year boundary', () => {
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28')
  })
  it('monthBounds handles short and leap months', () => {
    expect(monthBounds('2026-02-14')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthBounds('2024-02-03')).toEqual({ from: '2024-02-01', to: '2024-02-29' })
    expect(monthBounds('2026-12-31')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })
  it('addMonths lands on the first of the month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01')
  })
  it('periodRange', () => {
    expect(periodRange('day', '2026-10-10')).toEqual({ from: '2026-10-10', to: '2026-10-10' })
    expect(periodRange('week', '2026-10-10')).toEqual({ from: '2026-10-05', to: '2026-10-11' })
    expect(periodRange('month', '2026-10-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' })
  })
  it('shiftPeriod', () => {
    expect(shiftPeriod('day', '2026-10-10', -1)).toBe('2026-10-09')
    expect(shiftPeriod('week', '2026-10-10', -1)).toBe('2026-10-03')
    expect(shiftPeriod('month', '2026-10-10', 1)).toBe('2026-11-01')
  })
  it('canGoNext stops at the period containing today', () => {
    expect(canGoNext('day', '2026-10-10', '2026-10-10')).toBe(false)
    expect(canGoNext('day', '2026-10-09', '2026-10-10')).toBe(true)
    expect(canGoNext('week', '2026-10-06', '2026-10-10')).toBe(false)
    expect(canGoNext('week', '2026-10-01', '2026-10-10')).toBe(true)
    expect(canGoNext('month', '2026-10-01', '2026-10-10')).toBe(false)
    expect(canGoNext('month', '2026-09-30', '2026-10-10')).toBe(true)
  })
})
