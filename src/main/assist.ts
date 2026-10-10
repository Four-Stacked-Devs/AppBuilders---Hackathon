import { generate, getStatus } from './ai/llm'

// Optional AI helpers used across the app. Always a button the person presses, never automatic.
// The model only phrases: it is told the facts and may not introduce numbers of its own, and the
// reply is dropped if it contains a number that was not in the facts or any guilt language.
const SYSTEM =
  'You are VOX, a warm Filipino fitness buddy. Reply in friendly Taglish, 2 to 4 short sentences. ' +
  'Use only numbers that appear in FACTS. Never invent calories, grams or minutes. Never guilt the person, ' +
  'never mention burning off food, and no medical advice. Be specific to the FACTS, playful, never generic.'

const GUILT = /(burn off|make up for|nakakahiya|katamaran|tamad ka|cheat|bad food|kasalanan|pumayat ka agad)/i

export async function assist(task: string, context: string): Promise<{ text: string; ai: boolean }> {
  const fallback = {
    text: 'Hindi pa handa ang AI ngayon. Subukan ulit sa ilang segundo, o gamitin muna ang mga pindutan sa pahinang ito.',
    ai: false
  }
  if (getStatus().state !== 'ready') return fallback
  try {
    const out = (
      await generate({
        system: SYSTEM,
        user: `FACTS:\n${context}\n\nREQUEST: ${task}`,
        temperature: 0.6,
        maxTokens: 160,
        timeoutMs: 25_000,
        role: 'coach'
      })
    ).trim()
    const allowed = new Set<string>([...(context.match(/\d+(?:\.\d+)?/g) ?? []), ...(task.match(/\d+(?:\.\d+)?/g) ?? [])])
    const stray = (out.match(/\d+(?:\.\d+)?/g) ?? []).some((n) => !allowed.has(n))
    if (!out || stray || GUILT.test(out)) return fallback
    return { text: out, ai: true }
  } catch {
    return fallback
  }
}
