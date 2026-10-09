import type { Facts } from '@shared/schemas'

// Checks digits only. The prompts ask for every number as digits, and Filipino number words
// can't be checked without false rejections ("isang" also means "a").
const canon = (s: string | number): string => String(Number(String(s).replace(/,/g, '')))

function collectNumbers(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'number') out.push(canon(value))
  else if (typeof value === 'string')
    for (const m of value.matchAll(/\d+(?:\.\d+)?/g)) out.push(canon(m[0]))
  else if (value && typeof value === 'object')
    for (const v of Object.values(value)) collectNumbers(v, out)
  return out
}

const BLOCKED = [
  'bad food',
  'cheat',
  'failed',
  'sobra ka',
  'i-burn',
  'burn it off',
  'punish',
  'taba mo',
  'mataba',
  'payat ka',
  'diet ka'
]
const TEEN_BLOCKED = ['calorie', 'kcal', 'timbang', 'weight', 'diet', 'magpayat', 'pumayat']

export type Validation = { ok: true } | { ok: false; reason: string }

export function validateReaction(text: string, facts: Facts, mode: 'adult' | 'teen'): Validation {
  if (!text || text.length > 450) return { ok: false, reason: 'length' }
  const allowed = new Set(collectNumbers(facts))
  for (const m of text.matchAll(/\d+(?:[.,]\d+)*/g)) {
    if (!allowed.has(canon(m[0]))) return { ok: false, reason: `invented number ${m[0]}` }
  }
  const lower = text.toLowerCase()
  const words = mode === 'teen' ? [...BLOCKED, ...TEEN_BLOCKED] : BLOCKED
  const hit = words.find((w) => lower.includes(w))
  if (hit) return { ok: false, reason: `blocked word ${hit}` }
  return { ok: true }
}
