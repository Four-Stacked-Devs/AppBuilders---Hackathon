import { useMemo, useSyncExternalStore } from 'react'
import { useVox } from './store'

export type Tokens = {
  primary: string
  ink: string
  muted: string
  line: string
  sleep: string
  water: string
}

const DARK = '(prefers-color-scheme: dark)'

function subscribe(cb: () => void): () => void {
  const mq = window.matchMedia(DARK)
  mq.addEventListener('change', cb)
  const off = useVox.subscribe(cb)
  return () => {
    mq.removeEventListener('change', cb)
    off()
  }
}

const themeKey = (): string =>
  `${document.documentElement.dataset.theme ?? 'system'}:${window.matchMedia(DARK).matches}`

// Recharts needs real colour strings, so read the CSS tokens and re-read when the theme changes.
export function useTokens(): Tokens {
  const key = useSyncExternalStore(subscribe, themeKey)
  return useMemo(() => {
    void key
    const cs = getComputedStyle(document.documentElement)
    const v = (n: string): string => cs.getPropertyValue(n).trim()
    return {
      primary: v('--primary'),
      ink: v('--ink'),
      muted: v('--muted'),
      line: v('--line'),
      sleep: v('--sleep'),
      water: v('--water')
    }
  }, [key])
}
