import { ipcMain } from 'electron'
import { z } from 'zod'
import { generate, getStatus } from './ai/llm'

// Every handler validates its input with Zod before touching it.
function handle<S extends z.ZodType>(
  channel: string,
  schema: S,
  fn: (input: z.infer<S>) => unknown
): void {
  ipcMain.handle(channel, async (_e, raw) => fn(schema.parse(raw)))
}

export function registerIpc(): void {
  ipcMain.handle('ai:status', () => getStatus())

  // Temporary Phase 1 debug channel: raw text in, raw model output out.
  handle('debug:generate', z.string().min(1).max(500), (text) =>
    generate({
      system: 'You are a helpful assistant. Reply briefly.',
      user: text,
      temperature: 0,
      maxTokens: 120,
      timeoutMs: 60_000
    })
  )
}
