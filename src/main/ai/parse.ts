import { ParsedLog, type ParseResult } from '@shared/schemas'
import { applyWaterRule, matcher } from '../matching/match'
import { checkSafety } from '../safety/rules'
import { SAFETY_MESSAGES } from '../safety/responses'
import { generate } from './llm'
import PARSE_PROMPT from './prompts/parse.md?raw'
import parseSchema from './parse.schema.json'

const NOT_UNDERSTOOD = 'Hindi ko masyadong na-gets. Pwede mo bang ulitin nang mas simple?'

export async function parseLog(text: string): Promise<ParseResult> {
  // Safety runs on the raw text first. Crisis text is never parsed or logged.
  const safety = checkSafety(text)
  if (safety === 'crisis') return { ok: false, safety: 'crisis', reason: SAFETY_MESSAGES.crisis }

  let lastError = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const user =
      attempt === 0
        ? text
        : `${text}\n\n(Your previous output was invalid: ${lastError}. Follow the schema exactly.)`
    try {
      const raw = await generate({
        system: PARSE_PROMPT,
        user,
        jsonSchema: parseSchema,
        temperature: 0,
        maxTokens: 300,
        timeoutMs: 25_000
      })
      const result = ParsedLog.safeParse(JSON.parse(raw))
      if (result.success) {
        const parsed = applyWaterRule(result.data, text)
        return {
          ok: true,
          parsed,
          items: matcher.matchAll(parsed),
          safety,
          safetyMessage: safety ? SAFETY_MESSAGES[safety] : null
        }
      }
      lastError = result.error.issues[0]?.message ?? 'invalid'
    } catch (err) {
      lastError = String(err)
    }
  }
  console.warn('parse failed:', lastError)
  return { ok: false, safety: null, reason: NOT_UNDERSTOOD }
}
