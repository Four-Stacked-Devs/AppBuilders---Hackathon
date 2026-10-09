import { describe, it, expect } from 'vitest'
import { parseThemePref } from '../src/renderer/src/theme'
import { greeting } from '../src/renderer/src/format'

describe('parseThemePref', () => {
  it('keeps valid values', () => {
    expect(parseThemePref('light')).toBe('light')
    expect(parseThemePref('dark')).toBe('dark')
    expect(parseThemePref('system')).toBe('system')
  })
  it('falls back to system for missing or junk values', () => {
    expect(parseThemePref(null)).toBe('system')
    expect(parseThemePref('blue')).toBe('system')
    expect(parseThemePref(42)).toBe('system')
  })
})

describe('greeting', () => {
  it('follows local time of day', () => {
    expect(greeting(5)).toBe('Good morning')
    expect(greeting(11)).toBe('Good morning')
    expect(greeting(12)).toBe('Good afternoon')
    expect(greeting(17)).toBe('Good afternoon')
    expect(greeting(18)).toBe('Good evening')
    expect(greeting(0)).toBe('Good evening')
  })
})
