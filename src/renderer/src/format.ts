// Display text only; no numbers are calculated here.
export const greeting = (hour: number): string =>
  hour >= 5 && hour < 12
    ? 'Good morning'
    : hour >= 12 && hour < 18
      ? 'Good afternoon'
      : 'Good evening'

const at = (date: string): Date => new Date(`${date}T00:00:00`)

export const longDate = (date: string): string =>
  at(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
export const shortDate = (date: string): string =>
  at(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const shortDay = (date: string): string =>
  at(date).toLocaleDateString('en-US', { weekday: 'short' })
export const monthLabel = (date: string): string =>
  at(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
