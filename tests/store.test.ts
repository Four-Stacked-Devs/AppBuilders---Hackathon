import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../src/main/store/store'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'vox-store-'))
})

const profile = {
  nickname: 'Test',
  birthDate: '1990-01-01',
  sexForFormula: 'female' as const,
  heightCm: 160,
  weightKg: 60,
  activityLevel: 'light' as const,
  goal: 'build a habit',
  mode: 'adult' as const,
  caloriesEnabled: true,
  updatedAt: '2026-10-10T00:00:00.000Z'
}

describe('store', () => {
  it('starts empty and survives a reload', () => {
    const file = join(dir, 'db.json')
    const s = createStore(file)
    expect(s.get()).toEqual({ version: 1, profile: null, entries: [] })
    s.update((db) => ({ ...db, profile }))
    expect(createStore(file).get().profile).toEqual(profile)
  })
  it('moves an unreadable file aside instead of overwriting it', () => {
    const file = join(dir, 'db.json')
    writeFileSync(file, '{not json')
    expect(createStore(file).get().entries).toEqual([])
    expect(readdirSync(dir).some((f) => f.includes('corrupt'))).toBe(true)
  })
  it('rejects an invalid update without saving', () => {
    const file = join(dir, 'db.json')
    const s = createStore(file)
    expect(() => s.update((db) => ({ ...db, entries: [{ bad: true }] as never }))).toThrow()
    expect(createStore(file).get().entries).toEqual([])
  })
})
