import { DOZEN, HALF, ONES, TENS } from './lexicon'

export type Tok = { t: string; n?: number }

export const strip = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')

// Splits Taglish text into lowercase tokens: "nag-jog" -> nag, jog; "30mins" -> 30, mins;
// "dalawampu't lima" -> dalawampu, t, lima. Commas and semicolons stay as clause separators.
export function tokenize(raw: string): string[] {
  let s = strip(raw)
  s = s.replace(/(\d),(\d{3})/g, '$1$2')
  s = s.replace(/([,;])/g, ' $1 ')
  s = s.replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2')
  s = s.replace(/[^a-z0-9.,;/ ]+/g, ' ')
  s = s.replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
  return s.split(/\s+/).filter(Boolean)
}

const unNg = (w: string): string => (w.endsWith('ng') && w.length > 3 ? w.slice(0, -2) : w)
const isNum = (w: string): boolean => /^\d+(\.\d+)?$/.test(w)
const LINK = new Set(['t', 'at', 'and'])

// Turns number words and digits into numeric tokens: "dalawang" -> 2, "isa't kalahati" -> 1.5,
// "tatlumpung" -> 30, "labing-isa" -> 11, "kalahating" -> 0.5, "1/2" -> 0.5, "dosena" -> 12.
export function foldNumbers(tokens: string[]): Tok[] {
  const out: Tok[] = []
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i]
    const base = unNg(w)

    let val: number | null = null
    let used = 1

    if (isNum(w)) val = Number(w)
    else if (/^\d+\/\d+$/.test(w)) {
      const [a, b] = w.split('/').map(Number)
      val = b ? a / b : null
    } else if (w === 'labing' && ONES[unNg(tokens[i + 1] ?? '')] !== undefined) {
      val = 10 + ONES[unNg(tokens[i + 1])]
      used = 2
    } else if (TENS[base] !== undefined) {
      val = TENS[base]
      let j = i + 1
      if (LINK.has(tokens[j] ?? '')) j++
      const ones = ONES[unNg(tokens[j] ?? '')]
      if (ones !== undefined && ones > 0 && ones < 10) {
        val += ones
        used = j - i + 1
      }
    } else if (ONES[base] !== undefined && w !== 'wala') val = ONES[base]
    else if (HALF.has(w) || HALF.has(base)) val = 0.5
    else if (DOZEN.has(w) || DOZEN.has(base)) val = 12

    if (val === null) {
      out.push({ t: w })
      continue
    }
    // "<n> and a half": 1 at kalahati, 2 and half
    const after = i + used
    if (val >= 1 && val !== 12 && LINK.has(tokens[after] ?? '') && HALF.has(unNg(tokens[after + 1] ?? ''))) {
      val += 0.5
      used += 2
    }
    // "<n> dosena" = n dozen
    if (DOZEN.has(tokens[i + used] ?? '') && val !== 12) {
      val *= 12
      used += 1
    }
    out.push({ t: String(val), n: val })
    i += used - 1
  }
  return out
}

// Linker words after a number ("apat na", "tatlong") never carry meaning.
export const NUM_LINKERS = new Set(['na', 'ng', 'nang'])

// Splits tokens into clauses on separators, keeping number folding intact.
export function clauses(tokens: Tok[], separators: Set<string>): Tok[][] {
  const out: Tok[][] = [[]]
  for (const tok of tokens) {
    if (tok.n === undefined && separators.has(tok.t)) out.push([])
    else out[out.length - 1].push(tok)
  }
  return out.filter((c) => c.length > 0)
}
