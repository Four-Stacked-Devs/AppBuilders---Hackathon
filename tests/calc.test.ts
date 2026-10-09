import { describe, it, expect } from 'vitest'
import {
  ageYears,
  bmr,
  exerciseKcal,
  foodKcal,
  intensity,
  round10,
  roundHalf,
  tdee
} from '../src/shared/calc'

// Made-up inputs that check the arithmetic only. They are not nutrition facts.
describe('calc (synthetic inputs, arithmetic only)', () => {
  it('bmr male 70 kg, 170 cm, 25 y', () => expect(bmr('male', 70, 170, 25)).toBe(1642.5))
  it('bmr female 70 kg, 170 cm, 25 y', () => expect(bmr('female', 70, 170, 25)).toBe(1476.5))
  it('tdee moderate', () => expect(round10(tdee(1642.5, 'moderate'))).toBe(2550))
  it('tdee sedentary', () => expect(tdee(1000, 'sedentary')).toBe(1200))
  it('exercise MET 8, 70 kg, 30 min', () => expect(exerciseKcal(8, 70, 30)).toBe(280))
  it('food 150 g at 130 kcal/100 g', () => expect(foodKcal(150, 130)).toBe(195))
  it('intensity bands', () => {
    expect(intensity(2.9)).toBe('light')
    expect(intensity(3)).toBe('moderate')
    expect(intensity(5.9)).toBe('moderate')
    expect(intensity(6)).toBe('vigorous')
  })
  it('round10 and roundHalf', () => {
    expect(round10(1644)).toBe(1640)
    expect(round10(1645)).toBe(1650)
    expect(roundHalf(7.2)).toBe(7)
    expect(roundHalf(7.3)).toBe(7.5)
  })
})

describe('ageYears', () => {
  const today = new Date(2026, 9, 10) // 2026-10-10, local time
  it('counts a birthday that already happened this year', () =>
    expect(ageYears('2000-10-10', today)).toBe(26))
  it('does not count a birthday later this year', () =>
    expect(ageYears('2000-10-11', today)).toBe(25))
  it('does not count a birthday later this month', () =>
    expect(ageYears('2008-12-01', today)).toBe(17))
  it('reads the date as a local calendar day, not UTC', () =>
    expect(ageYears('2013-10-10', today)).toBe(13))
})
