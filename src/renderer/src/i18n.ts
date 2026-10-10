// ---------- Language (UI labels only; typing and speaking stay Taglish) ----------
export type Lang = 'en' | 'fil'
export const getLang = (): Lang => {
  try {
    return localStorage.getItem('vox.lang') === 'fil' ? 'fil' : 'en'
  } catch {
    return 'en'
  }
}
export const setLang = (l: Lang): void => {
  try {
    localStorage.setItem('vox.lang', l)
  } catch {
    /* ignore */
  }
}
const FIL: Record<string, string> = {
  Home: 'Tahanan',
  Coach: 'Coach',
  Diary: 'Talaarawan',
  Calendar: 'Kalendaryo',
  Progress: 'Progreso',
  Plans: 'Mga Plano',
  Settings: 'Settings'
}
export const tr = (label: string): string => (getLang() === 'fil' ? (FIL[label] ?? label) : label)

