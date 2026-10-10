import { parseRules, type NluResult } from '../nlu/parseRules'
import { strip } from '../nlu/normalize'

export type Intent = 'log' | 'stats' | 'workout_plan' | 'meal_plan' | 'advice' | 'help' | 'chitchat' | 'unknown'

const QUESTION_START =
  /^(ano|anong|ilan|ilang|gaano|gaanong|magkano|paano|bakit|saan|kailan|sino|pwede|puwede|dapat|can|how|what|why|when|where|which|show|tell|give|gawa|gawan|gumawa|make|create|suggest|recommend|ok lang|okay lang|may|meron|is|are|do|does|should)\b/

const has = (t: string, re: RegExp): boolean => re.test(t)

// Rules first (milliseconds): a sentence with foods or activities and no question word is a log;
// questions are routed by their topic words. The language model is not involved.
export function classifyIntent(raw: string): { intent: Intent; nlu: NluResult } {
  const t = strip(raw).replace(/[^a-z0-9? ]+/g, ' ').replace(/\s+/g, ' ').trim()
  const nlu = parseRules(raw)
  const found =
    nlu.parsed.foods.length +
      nlu.parsed.exercises.length +
      (nlu.parsed.sleepHours > 0 ? 1 : 0) +
      (nlu.parsed.waterGlasses > 0 ? 1 : 0) +
      (nlu.parsed.bodyWeightKg > 0 ? 1 : 0) >
    0
  const question = raw.includes('?') || QUESTION_START.test(t)
  const words = t.split(' ').length

  if (has(t, /\b(ano kaya mo|ano ang magagawa|ano magagawa|paano gamitin|paano ko gagamitin|help|tulong|saan mo kinukuha|offline ba|ano ka|sino ka|what can you do|how do i use|paano mag log|paano mag-log)\b/))
    return { intent: 'help', nlu }
  if (words <= 5 && has(t, /^(hi|hello|hey|kumusta|kamusta|salamat|thanks|thank you|magandang|good morning|good afternoon|good evening|ok|okay|sige|wow|haha|hehe|nice|ayos|boss|vox)\b/) && !found)
    return { intent: 'chitchat', nlu }

  const planWords = /\b(plan|program|routine|schedule|gawa|gawan|gumawa|make|create|suggest|recommend|ideas|idea|beginner|ipagluto|lutuin|prep)\b/
  if (has(t, /\b(workout|exercise|ehersisyo|routine|training|push day|leg day|gym plan)\b/) && has(t, planWords) && (question || !found || has(t, /\b(plan|program|routine)\b/)))
    return { intent: 'workout_plan', nlu }
  if (has(t, /\b(meal|meal prep|prep|ulam|menu|grocery|pinggang|recipe|lutuin|ipagluto|pagkain plan|what to eat|ano kakainin)\b/) && (question || has(t, planWords)) && !(found && !question))
    return { intent: 'meal_plan', nlu }

  if (found && !question) return { intent: 'log', nlu }

  if (question || has(t, /\?/)) {
    if (has(t, /\b(calories?|kcal|minuto|minutes|oras|total|streak|history|ngayong linggo|this week|this month|ngayong buwan|kahapon|yesterday|nasunog|burned|average|nakain|kinain ko|tulog ko|nainom|timbang ko|weight ko|ilang araw|gumalaw|nag exercise|active)\b/))
      return { intent: 'stats', nlu }
    if (has(t, /\b(ok lang ba|okay lang ba|pwede ba|puwede ba|dapat|tips|tip|paano|how to|how do|bakit|why|masakit|sakit|pagod|motivation|consistent|warm up|stretch|recovery|sleep|tulog|hydrate|protein|carbs|calories sa|kain)\b/))
      return { intent: 'advice', nlu }
  }
  if (found) return { intent: 'log', nlu }
  if (has(t, /\b(tips|motivation|consistent|payo|advice)\b/)) return { intent: 'advice', nlu }
  return { intent: 'unknown', nlu }
}
