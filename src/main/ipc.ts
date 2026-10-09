import { ipcMain } from 'electron'
import { z } from 'zod'
import { ConfirmInput, DateArg, LogText, ProfileInput } from '@shared/schemas'
import { generate, getStatus } from './ai/llm'
import {
  stubConfirm,
  stubDayGet,
  stubHistory,
  stubParse,
  stubProfileGet,
  stubProfileSave,
  stubSeed
} from './stubs'

// Every handler validates its arguments (as a tuple) with Zod before touching them.
function handle<S extends z.ZodType<unknown[]>>(
  channel: string,
  args: S,
  fn: (...input: z.infer<S>) => unknown
): void {
  ipcMain.handle(channel, async (_e, ...raw) => fn(...(args.parse(raw) as z.infer<S>)))
}

const none = z.tuple([])

export function registerIpc(): void {
  handle('ai:status', none, () => getStatus())

  handle('profile:get', none, () => stubProfileGet())
  handle('profile:save', z.tuple([ProfileInput]), (p) => stubProfileSave(p))

  handle('log:parse', z.tuple([LogText]), (text) => stubParse(text))
  handle('log:confirm', z.tuple([ConfirmInput]), (input) => stubConfirm(input))

  handle('day:get', z.tuple([DateArg]), (date) => stubDayGet(date))
  handle('history:range', z.tuple([DateArg, DateArg]), (from, to) => stubHistory(from, to))

  handle('dev:seed', none, () => stubSeed())

  // Temporary Phase 1 debug channel: raw text in, raw model output out.
  handle('debug:generate', z.tuple([z.string().min(1).max(500)]), (text) =>
    generate({
      system: 'You are a helpful assistant. Reply briefly.',
      user: text,
      temperature: 0,
      maxTokens: 120,
      timeoutMs: 60_000
    })
  )
}
