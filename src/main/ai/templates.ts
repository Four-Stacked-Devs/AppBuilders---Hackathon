import type { Facts } from '@shared/schemas'

// Filled only from facts, so a template always passes validateReaction().
export function templateReaction(f: Facts): string {
  const ex = f.items.find((i) => i.minutes)
  if (ex)
    return `Nice, ${ex.minutes} minutes ng ${ex.displayName}! Tuloy lang, at uminom ka ng tubig.`
  if (f.items.some((i) => i.quantityLabel))
    return 'Noted ang kinain mo. Salamat sa pag-log, makakatulong ito para makita mo ang pattern mo.'
  return 'Na-log na. Salamat sa pag-update!'
}
