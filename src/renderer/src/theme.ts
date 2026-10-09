// Light, dark or follow the system. Remembered on this computer only.
export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'vox.theme'

export const parseThemePref = (raw: unknown): ThemePref =>
  raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'

export function loadThemePref(): ThemePref {
  try {
    return parseThemePref(localStorage.getItem(KEY))
  } catch {
    return 'system'
  }
}

export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement
  if (pref === 'system') delete root.dataset.theme
  else root.dataset.theme = pref
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    // Storage unavailable: the choice lasts until the app restarts.
  }
}
