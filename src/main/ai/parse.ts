import { ParsedLog, type ParseResult } from '@shared/schemas'
import { applyWaterRule, matcher } from '../matching/match'
import { parseRules } from '../nlu/parseRules'
import { checkSafety } from '../safety/rules'
import { SAFETY_MESSAGES } from '../safety/responses'
import { generate } from './llm'
import PARSE_PROMPT from './prompts/parse.md?raw'
import parseSchema from './parse.schema.json'

const NOT_UNDERSTOOD = 'Hindi ko masyadong na-gets. Pwede mo bang ulitin nang mas simple?'

// 1. Safety on the raw text. 2. The rule-based Taglish reader (milliseconds, no model). If it
// understood every word, that is the answer. 3. Otherwise the language model reads the text,
// and if it also fails, whatever the rules did understand is still shown (never dropped).
export async function parseLog(text: string): Promise<ParseResult> {
  const safety = checkSafety(text)
  if (safety === 'crisis') return { ok: false, safety: 'crisis', reason: SAFETY_MESSAGES.crisis }

  const nlu = parseRules(text)
  const respond = (parsed: ParsedLog): ParseResult => {
    const water = applyWaterRule(parsed, text)
    return {
      ok: true,
      parsed: water,
      items: matcher.matchAll(water),
      safety,
      safetyMessage: safety ? SAFETY_MESSAGES[safety] : null,
      dayOffset: nlu.dayOffset,
      future: nlu.future
    }
  }
  if (nlu.complete) return respond(nlu.parsed)

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
        // Words the rules could not place stay visible next to the model's reading.
        return respond({
          ...result.data,
          unclear: [...new Set([...result.data.unclear, ...nlu.unexplained])]
        })
      }
      lastError = result.error.issues[0]?.message ?? 'invalid'
    } catch (err) {
      lastError = String(err)
    }
  }
  console.warn('parse failed:', lastError)
  const partial = nlu.parsed
  if (partial.foods.length + partial.exercises.length > 0 || partial.sleepHours > 0 || partial.waterGlasses > 0)
    return respond(partial)
  return { ok: false, safety: null, reason: NOT_UNDERSTOOD }
}
