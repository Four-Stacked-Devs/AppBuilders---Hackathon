import { create } from 'zustand'
import type { AiStatus } from '@shared/status'
import type { ConfirmResult, ParseResult, Profile } from '@shared/schemas'

export type Screen = 'log' | 'today' | 'profile'

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
  setScreen: (s: Screen) => void
  setAi: (s: AiStatus) => void
  setProfile: (p: Profile | null) => void
  addTurn: (text: string) => number
  updateTurn: (id: number, patch: Partial<Turn>) => void
}

let nextId = 1

export const useVox = create<State>((set) => ({
  screen: 'log',
  ai: { state: 'loading' },
  profile: null,
  profileLoaded: false,
  turns: [],
  setScreen: (screen) => set({ screen }),
  setAi: (ai) => set({ ai }),
  setProfile: (profile) => set({ profile, profileLoaded: true }),
  addTurn: (text) => {
    const id = nextId++
    set((s) => ({ turns: [...s.turns, { id, text, state: 'parsing' }] }))
    return id
  },
  updateTurn: (id, patch) =>
    set((s) => ({ turns: s.turns.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
}))
