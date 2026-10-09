import { create } from 'zustand'
import type { AiStatus } from '@shared/status'
import type { ConfirmResult, ParseResult, Profile } from '@shared/schemas'
import { applyTheme, loadThemePref, type ThemePref } from './theme'

export type Screen =
  'talk' | 'today' | 'weekly' | 'monthly' | 'progress' | 'settings' | 'onboarding'

// One message in the Log thread: what the person said and what came back.
export type Turn = {
  id: number
  text: string
  state: 'parsing' | 'card' | 'confirming' | 'done' | 'failed' | 'crisis' | 'skipped'
  result?: ParseResult
  confirmed?: ConfirmResult
  error?: string
}

type State = {
  screen: Screen
  ai: AiStatus
  profile: Profile | null
  profileLoaded: boolean
  turns: Turn[]
  themePref: ThemePref
  setScreen: (s: Screen) => void
  setAi: (s: AiStatus) => void
  setProfile: (p: Profile | null) => void
  setThemePref: (p: ThemePref) => void
  addTurn: (text: string) => number
  updateTurn: (id: number, patch: Partial<Turn>) => void
}

let nextId = 1

export const useVox = create<State>((set) => ({
  screen: 'talk',
  ai: { state: 'loading' },
  profile: null,
  profileLoaded: false,
  turns: [],
  themePref: loadThemePref(),
  setScreen: (screen) => set({ screen }),
  setAi: (ai) => set({ ai }),
  setProfile: (profile) => set({ profile, profileLoaded: true }),
  setThemePref: (themePref) => {
    applyTheme(themePref) // before the store update, so token readers see the new theme
    set({ themePref })
  },
  addTurn: (text) => {
    const id = nextId++
    set((s) => ({ turns: [...s.turns, { id, text, state: 'parsing' }] }))
    return id
  },
  updateTurn: (id, patch) =>
    set((s) => ({ turns: s.turns.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
}))
