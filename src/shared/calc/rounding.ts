// Display rounding. Facts are rounded before the LLM sees them (Phase 4.1).
export const round10 = (n: number): number => Math.round(n / 10) * 10 // kcal to nearest 10
export const roundHalf = (n: number): number => Math.round(n * 2) / 2 // hours, glasses
