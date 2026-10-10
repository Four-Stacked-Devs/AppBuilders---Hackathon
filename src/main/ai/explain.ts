import type { Facts, Reaction } from '@shared/schemas'
import ADULT_PROMPT from './prompts/explain.adult.md?raw'
import TEEN_PROMPT from './prompts/explain.teen.md?raw'
import { generate } from './llm'
import { templateReaction } from './templates'
import { validateReaction } from './validator'

export const EXPLAIN_TIMEOUT_MS = Number(process.env.VOX_EXPLAIN_TIMEOUT_MS ?? 25_000)

// A short Taglish reaction that may only mention numbers the code computed.
export async function explain(facts: Facts, mode: 'adult' | 'teen'): Promise<Reaction> {
  const system = mode === 'teen' ? TEEN_PROMPT : ADULT_PROMPT
  const user = `FACTS:\n${JSON.stringify(facts)}\n\nWrite the reaction now.`
  try {
    const text = (
      await generate({
        system,
        user,
        temperature: 0.6,
        maxTokens: 160,
        timeoutMs: EXPLAIN_TIMEOUT_MS,
        role: 'explain'
      })
    ).trim()
    const check = validateReaction(text, facts, mode)
    if (check.ok) return { text, source: 'ai' }
    console.warn('reaction rejected:', check.reason, text)
    return {
      text: templateReaction(facts),
      source: 'template',
      rejectedReason: `${check.reason}: "${text}"`
    }
  } catch (err) {
    return {
      text: templateReaction(facts),
      source: 'template',
      rejectedReason: `timeout or error: ${String(err)}`
    }
  }
}
