// Compares one parse result with a golden expectation. Shared by scripts/bench-models.mjs
// and tests/parse.golden.test.ts. Fields left out of `expect` must be empty or 0.
// Names pass when the output contains the expected word (case-insensitive), so
// "jogging" passes for "jog" and "adobong manok" for "adobo".
export function checkParse(out, expect) {
  const errors = []
  for (const k of ['sleepHours', 'waterGlasses', 'bodyWeightKg']) {
    const want = expect[k] ?? 0
    if (out[k] !== want) errors.push(`${k}: got ${out[k]}, want ${want}`)
  }
  const lists = [
    ['foods', 'name', ['quantity', 'unit']],
    ['exercises', 'activity', ['durationMin', 'effort']]
  ]
  for (const [key, nameKey, fields] of lists) {
    const want = expect[key] ?? []
    const got = out[key] ?? []
    if (got.length !== want.length) {
      errors.push(`${key}: got ${got.length} items, want ${want.length}`)
      continue
    }
    for (const w of want) {
      const g = got.find((x) => String(x[nameKey]).toLowerCase().includes(w[nameKey]))
      if (!g) {
        errors.push(`${key}: no item matching "${w[nameKey]}"`)
        continue
      }
      for (const f of fields) {
        if (g[f] !== w[f]) errors.push(`${key}.${w[nameKey]}.${f}: got ${g[f]}, want ${w[f]}`)
      }
    }
  }
  return errors
}
