import { localDate } from '@shared/dates'
import type { ChatMessage, MsgBody } from '@shared/chat'
import type { ConfirmInput, Facts } from '@shared/schemas'
import { generate } from '../ai/llm'
import COACH_PROMPT from '../ai/prompts/coach.md?raw'
import { parseLog } from '../ai/parse'
import { validateReaction } from '../ai/validator'
import { confirmLog, getDay } from '../confirm'
import { checkSafety } from '../safety/rules'
import { SAFETY_MESSAGES } from '../safety/responses'
import { db } from '../store/db'
import { classifyIntent } from './intent'
import { addMessage, getMessage, updateMessageBody } from './repo'
import { answerStats } from './stats'

// The brain behind the Coach chat. Order: safety on the raw text -> intent rules -> a handler.
// Numbers always come from code; the model only phrases advice, and its reply must pass the same
// number check as every other reply, otherwise a fixed template is used.

const text = (t: string): MsgBody => ({ type: 'text', text: t })
const chips = (t: string, c: Extract<MsgBody, { type: 'chips' }>['chips']): MsgBody => ({ type: 'chips', text: t, chips: c })

const HELP = chips(
  'Ako si VOX, nasa computer mo lang ako. Kaya kong i-log ang kinain, galaw, tulog at tubig mo (Tagalog, English o Taglish), sagutin ang tanong tungkol sa progress mo, at magbigay ng simpleng tips.',
  [
    { label: 'Log something', send: 'Nag-jog ako ng 30 minutes kanina' },
    { label: 'My week', send: 'Ilang minuto ako gumalaw this week?' },
    { label: 'Plan a workout', send: 'Gawan mo ako ng workout plan' }
  ]
)

const PAIN = /\b(masakit|sakit|injur|pilay|sprain|nahihilo|hilo|dugo|manhid|namamaga|chest pain|hirap huminga)\b/i

const ADVICE_FALLBACK: [RegExp, string][] = [
  [PAIN, 'Kung masakit o may injury, pahinga muna at magpatingin sa doktor bago magpatuloy. Hindi ako doktor, pero mas ligtas ang mag-ingat.'],
  [/warm ?up|stretch/i, 'Magsimula sa 5 minutong dahan-dahang galaw: ikot ng balikat, balakang at tuhod, tapos unti-unting bilisan. Mag-unat ulit pagkatapos.'],
  [/tulog|sleep/i, 'Subukang matulog at gumising nang halos pareho ang oras araw-araw. Malaking tulong ang tahimik at madilim na kwarto.'],
  [/consistent|motivation|tamad/i, 'Maliit na hakbang lang: kahit 10 minutong lakad ay may bilang. Piliin ang oras na kaya mong ulitin araw-araw.'],
  [/tubig|water|hydrat/i, 'Maglagay ng baso ng tubig sa tabi mo at uminom paunti-unti buong araw.']
]

async function advice(raw: string, teen: boolean): Promise<MsgBody[]> {
  if (PAIN.test(raw)) return [text(ADVICE_FALLBACK[0][1])]
  const day = getDay(localDate())
  const facts: Facts = {
    caloriesEnabled: false,
    items: [],
    dayTotals: { activeMinutes: day.activeMinutes, waterGlasses: day.waterGlasses, sleepHours: day.sleepHours }
  }
  try {
    const out = (
      await generate({
        system: COACH_PROMPT,
        user: `FACTS:\n${JSON.stringify(facts)}\n\nMESSAGE: ${raw}`,
        temperature: 0.5,
        maxTokens: 140,
        timeoutMs: 20_000,
        role: 'coach'
      })
    ).trim()
    if (validateReaction(out, facts, teen ? 'teen' : 'adult').ok) return [text(out)]
  } catch {
    /* fall through to the fixed tips */
  }
  const fb = ADVICE_FALLBACK.find(([re]) => re.test(raw))
  return [text(fb ? fb[1] : 'Maliit na hakbang araw-araw ang pinakamabisa. Gusto mo bang i-log natin ang galaw mo ngayon o gumawa ng simpleng plano?')]
}

function chitchat(raw: string): MsgBody[] {
  if (/salamat|thanks|thank/i.test(raw)) return [text('Walang anuman! Tuloy lang tayo.')]
  if (/kumusta|kamusta|how are/i.test(raw)) return [text('Okay naman ako! Ikaw, kumusta ang galaw at tulog mo ngayon?')]
  return [chips('Hi! Ano ang gusto mong gawin ngayon?', [
    { label: 'Log something', send: 'Nag-jog ako ng 30 minutes kanina' },
    { label: 'My week', send: 'Ilang minuto ako gumalaw this week?' }
  ])]
}

async function respond(raw: string): Promise<MsgBody[]> {
  const profile = db().get().profile
  const teen = profile?.mode === 'teen'
  const { intent } = classifyIntent(raw)

  if (teen && /\b(diet|calorie|calories|payat|pumayat|taba|timbang|weight loss|deficit)\b/i.test(raw))
    return [text('Sa teen mode, hindi ko pinag-uusapan ang diet, calories o timbang. Pwede tayong mag-focus sa galaw, tulog, tubig at masayang pagkain. Magtanong ka rin sa magulang o doktor tungkol dito.')]

  switch (intent) {
    case 'log': {
      const result = await parseLog(raw)
      if (!result.ok) return [text(result.reason), chips('', [{ label: 'Try again', send: raw }, { label: 'What can you do?', send: 'Ano kaya mo gawin?' }])]
      const body: MsgBody[] = []
      if (result.future)
        body.push(text('Mukhang hindi pa nangyayari iyan. Pwede mo pa ring i-log kung tapos na, o gumawa ng plano sa Plans.'))
      body.push({ type: 'log', rawText: raw, result, state: 'card' })
      return body
    }
    case 'stats':
      return answerStats(raw)
    case 'help':
      return [HELP]
    case 'chitchat':
      return chitchat(raw)
    case 'workout_plan':
      return [chips('Gagawa tayo ng workout plan na swak sa iyo. Pumunta sa Plans para piliin ang goal, araw at gamit.', [{ label: 'Open Plans', screen: 'plans' }])]
    case 'meal_plan':
      return [chips('Meal prep time! Sa Plans, makakagawa ka ng weekly plate plan at grocery list gamit ang Pinggang Pinoy.', [{ label: 'Open Plans', screen: 'plans' }])]
    case 'advice':
      return advice(raw, teen)
    default:
      return [chips('Hindi ko pa sigurado kung ano ang gusto mo. Subukan ito:', [
        { label: 'Log something', send: 'Kumain ako ng 2 itlog at kanin' },
        { label: 'My week', send: 'Ilang minuto ako gumalaw this week?' },
        { label: 'What can you do?', send: 'Ano kaya mo gawin?' }
      ])]
  }
}

// Handles one message from the person. Crisis text is never stored: only a one-off bubble that
// exists in the window for this session, and the fixed support message.
export async function sendMessage(conversationId: string, raw: string): Promise<ChatMessage[]> {
  const safety = checkSafety(raw)
  if (safety === 'crisis') {
    const reply = addMessage(conversationId, 'vox', { type: 'notice', text: SAFETY_MESSAGES.crisis, tone: 'safety' })
    const ghost: ChatMessage = { id: -1, conversationId, role: 'user', body: text(raw), createdAt: new Date().toISOString() }
    return [ghost, reply]
  }
  const out: ChatMessage[] = [addMessage(conversationId, 'user', text(raw))]
  if (safety) out.push(addMessage(conversationId, 'vox', { type: 'notice', text: SAFETY_MESSAGES[safety], tone: 'safety' }))
  for (const body of await respond(raw)) out.push(addMessage(conversationId, 'vox', body))
  return out
}

// The person confirmed the log card: save it, and keep the saved result in the thread.
export async function confirmLogMessage(messageId: number, input: ConfirmInput): Promise<ChatMessage> {
  const msg = getMessage(messageId)
  if (!msg || msg.body.type !== 'log') throw new Error('That message is no longer available.')
  const confirmed = await confirmLog(input)
  const body: MsgBody = { ...msg.body, state: 'done', confirmed }
  updateMessageBody(messageId, body)
  return { ...msg, body }
}

export function discardLogMessage(messageId: number): ChatMessage {
  const msg = getMessage(messageId)
  if (!msg || msg.body.type !== 'log') throw new Error('That message is no longer available.')
  const body: MsgBody = { ...msg.body, state: 'skipped' }
  updateMessageBody(messageId, body)
  return { ...msg, body }
}
