import { app, ipcMain } from 'electron'
import { z } from 'zod'
import { ConfirmInput, DateArg, LogText, ProfileInput } from '@shared/schemas'
import { getStatus } from './ai/llm'
import { parseLog } from './ai/parse'
import { confirmLog, getDay, getHistory } from './confirm'
import { seedDemoHistory } from './dev/seed'
import { getProfile, saveProfile } from './profile'

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

  handle('profile:get', none, () => getProfile())
  handle('profile:save', z.tuple([ProfileInput]), (p) => saveProfile(p))

  handle('log:parse', z.tuple([LogText]), (text) => parseLog(text))
  handle('log:confirm', z.tuple([ConfirmInput]), (input) => confirmLog(input))

  handle('day:get', z.tuple([DateArg]), (date) => getDay(date))
  handle('history:range', z.tuple([DateArg, DateArg]), (from, to) => getHistory(from, to))

  // Demo history is a dev tool only; packaged builds never seed.
  handle('dev:seed', none, () => {
    if (app.isPackaged) throw new Error('dev:seed is not available in packaged builds')
    return seedDemoHistory()
  })
}
