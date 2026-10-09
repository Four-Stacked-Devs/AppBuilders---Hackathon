// Fixed lines shown while the on-device AI works. Each one is true about how VOX works;
// none is a joke, a boast or health advice.
export const TIPS = [
  'Your voice and your logs never leave this computer.',
  'VOX checks every number in its reply against the calculation before showing it.',
  'Calories come from published tables, never from the AI.',
  'You can fix anything on the card before it is saved.',
  'VOX works with Wi-Fi off. The AI runs inside this app.'
]

export type WorkKind = 'parse' | 'confirm'

// Pipeline stages, in the order they really happen. A step is shown when it starts; the last
// one stays until the result arrives, so a step is never claimed as finished.
export const STEPS: Record<WorkKind, { atMs: number; text: string }[]> = {
  parse: [
    { atMs: 0, text: 'Reading what you said…' },
    { atMs: 2000, text: 'Sorting it into food, activity, sleep and water…' },
    { atMs: 4000, text: 'Matching it to the food and activity tables…' }
  ],
  confirm: [
    { atMs: 0, text: 'Calculating with the published tables…' },
    { atMs: 1000, text: 'VOX is writing a reply…' }
  ]
}

export const SLOW_AFTER_MS = 8000
export const SLOW_NOTE =
  'The first log after opening VOX can take longer while the AI warms up on this computer.'
export const TIP_EVERY_MS = 7000

// Index of the step that has started by `elapsedMs`.
export function stepAt(kind: WorkKind, elapsedMs: number): number {
  const steps = STEPS[kind]
  let i = 0
  while (i + 1 < steps.length && steps[i + 1].atMs <= elapsedMs) i++
  return i
}
