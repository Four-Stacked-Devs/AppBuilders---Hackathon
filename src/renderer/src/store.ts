import { flushSync } from 'react-dom'
import { create } from 'zustand'
import type { AiStatus } from '@shared/status'
import type { Profile } from '@shared/schemas'
import { applyTheme, loadThemePref, type ThemePref } from './theme'

export type Screen =
  'home' | 'coach' | 'diary' | 'calendar' | 'progress' | 'plans' | 'settings' | 'onboarding'

type State = {
  screen: Screen
  ai: AiStatus
  profile: Profile | null
  profileLoaded: boolean
  themePref: ThemePref
  diaryDate: string | null // set when another screen opens a specific day in the Diary
  setScreen: (s: Screen) => void
  openDiary: (date: string) => void
  setAi: (s: AiStatus) => void
  setProfile: (p: Profile | null) => void
  setThemePref: (p: ThemePref) => void
}

type VtDoc = Document & { startViewTransition?: (cb: () => void) => unknown }

// Screen changes cross-fade and slide with the browser's View Transitions API (no extra library).
// Reduced motion, or a browser without it, just switches.
function transition(apply: () => void): void {
  const doc = document as VtDoc
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (doc.startViewTransition && !reduce) doc.startViewTransition(() => flushSync(apply))
  else apply()
}

export const useVox = create<State>((set) => ({
  screen: 'home',
  ai: { state: 'loading' },
  profile: null,
  profileLoaded: false,
  themePref: loadThemePref(),
  diaryDate: null,
  setScreen: (screen) => transition(() => set({ screen })),
  openDiary: (date) => transition(() => set({ screen: 'diary', diaryDate: date })),
  setAi: (ai) => set({ ai }),
  setProfile: (profile) => set({ profile, profileLoaded: true }),
  setThemePref: (themePref) => {
    applyTheme(themePref) // before the store update, so token readers see the new theme
    set({ themePref })
  }
}))
