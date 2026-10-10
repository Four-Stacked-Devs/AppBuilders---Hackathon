import { z } from 'zod'
import type { ConfirmResult, ParseResult } from './schemas'

// Chat sessions, like other assistants: several separate conversations, each with its own thread.

export type Chip = {
  label: string
  send?: string // sends this text as the person's next message
  screen?: string // or opens a screen (see Screen in the renderer store)
  go?: boolean // the app opens the screen right away
}

export type MsgBody =
  | { type: 'text'; text: string }
  | { type: 'notice'; text: string; tone: 'safety' | 'info' }
  | { type: 'chips'; text?: string; chips: Chip[] }
  | {
      type: 'stats'
      title: string
      value: string
      sub?: string
      series?: { label: string; value: number }[]
    }
  | {
      type: 'log'
      rawText: string
      result: ParseResult
      state: 'card' | 'done' | 'skipped'
      confirmed?: ConfirmResult
    }

export type ChatMessage = {
  id: number
  conversationId: string
  role: 'user' | 'vox'
  body: MsgBody
  createdAt: string
}

export type ConversationSummary = {
  id: string
  title: string
  updatedAt: string
  preview: string
}

export const ConversationId = z.string().min(1).max(100)
export const ChatText = z.string().trim().min(1).max(500)
export const ChatTitle = z.string().trim().min(1).max(60)
