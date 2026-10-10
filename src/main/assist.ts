import { generate, getStatus } from './ai/llm'

// Optional AI helpers used across the app. Always a button the person presses, never automatic.
// The model only phrases: it is told the facts and may not introduce numbers of its own, and the
// reply is dropped if it contains a number that was not in the facts or any guilt language.
const SYSTEM =
  'You are VOX, a warm Filipino fitness buddy. Reply in friendly Taglish, 2 to 4 short sentences. ' +
  'Use only numbers that appear in FACTS. Never invent calories, grams or minutes. Never guilt the person, ' +
  'never mention burning off food, and no medical advice. Be specific to the FACTS, playful, never generic.'

const GUILT = /(burn off|make up for|nakakahiya|katamaran|tamad ka|cheat|bad food|kasalanan|pumayat ka agad)/i

// Always-available answers, so every button works even when the model is busy or loading.
const TIPS: [RegExp, string[]][] = [
  [/small|idea|suggest/i, [
    'Subukan ang 10 minutong lakad pagkagising. Maliit lang, pero kapag nagawa mo na, ang hirap nang hindi ituloy!',
    'Mag-unat ng 5 minuto habang may pinapanood ka. Walang gamit, walang pawis, panalo pa rin.',
    'Umakyat-baba ng hagdan ng ilang ulit pag-uwi. Mabilis at ramdam agad ang puso mo.'
  ]],
  [/habit|stick|cue/i, [
    'Ikabit ang plano sa isang nakasanayan mo na, tulad ng "pagkatapos magkape, lakad ng 10 minuto". Mas madaling sundan.',
    'Ihanda ang damit at sapatos bago matulog. Kapag nakita mo pagkagising, kalahati ng laban tapos na.'
  ]],
  [/explain|expect/i, [
    'Hinati ang plano sa ilang araw para may pahinga ang katawan mo. Simulan nang magaan, at dagdagan lang kapag kaya na.',
    'Bawat araw may sariling focus, kaya hindi pare-pareho ang pinapagod. Sundan ang pagkakasunod-sunod at ayos na.'
  ]],
  [/hype|pep|motiv/i, [
    'Kaya mo yan! Hindi kailangang perpekto, kailangan lang magsimula. Isang set muna, tapos tingnan natin.',
    'Ang pinakamahirap ay ang pagsuot ng sapatos. Pagkatapos nun, katawan mo na ang bahala!'
  ]],
  [/form|technique/i, [
    'Dahan-dahan sa pagbaba, at huwag kalimutang huminga. Mas mahalaga ang tamang porma kaysa sa dami.',
    'Panatilihing tuwid ang likod at nakatutok ang core. Kapag nanginginig o masakit, pahinga muna.'
  ]],
  [/prep|cook|batch/i, [
    'Magluto ng kanin at ulam nang sabay-sabay tuwing Linggo, tapos ilagay sa lalagyan. Tipid sa oras buong linggo.',
    'Hiwain na ang gulay at ihiwalay sa lalagyan bago itago para mabilis ang luto sa gabi.'
  ]],
  [/budget|afford|tipid|cheap/i, [
    'Pumili ng gulay na bagsak-presyo ngayong panahon, at gumamit ng itlog at munggo bilang protina. Masarap at tipid.',
    'Magdala ng listahan sa palengke at iwasan ang pamimili nang gutom. Malaking tipid na agad.'
  ]],
  [/trend|say|describe/i, [
    'Tingnan ang mga araw na gumalaw ka: iyon ang pundasyon mo. Dagdagan lang nang paunti-unti, hindi kailangang biglaan.',
    'May pattern na nabubuo, at iyon ang importante. Ang tuloy-tuloy na maliit na galaw ang nananalo.'
  ]],
  [/next|step|week/i, [
    'Ngayong susunod na linggo, dagdagan ng 5 minuto ang isa sa mga araw mo. Isang maliit na pagbabago lang.',
    'Pumili ng isang araw na dati mong nilalaktawan at lagyan ng maikling lakad. Iyon na iyon.'
  ]]
]
let rot = 0
function localTip(task: string): string {
  const hit = TIPS.find(([re]) => re.test(task))
  const pool = hit ? hit[1] : TIPS[0][1]
  return pool[rot++ % pool.length]
}

export async function assist(task: string, context: string): Promise<{ text: string; ai: boolean }> {
  const fallback = { text: localTip(task), ai: false }
  if (getStatus().state !== 'ready') return fallback
  try {
    const out = (
      await generate({
        system: SYSTEM,
        user: `FACTS:
${context}

REQUEST: ${task}`,
        temperature: 0.6,
        maxTokens: 160,
        timeoutMs: 40_000,
        role: 'coach'
      })
    ).trim()
    // Small counts like "2 tips" are fine; any amount of food energy, grams or minutes must come from the facts.
    const nums = new Set<string>([...(context.match(/\d+(?:\.\d+)?/g) ?? []), ...(task.match(/\d+(?:\.\d+)?/g) ?? [])])
    const stray = [...out.matchAll(/(\d+(?:\.\d+)?)\s*(kcal|cal|calories|g|gramo|kg|minuto|minutes?|mins?|oras|hours?)/gi)].some((m) => !nums.has(m[1]))
    if (!out || stray || GUILT.test(out)) return fallback
    return { text: out, ai: true }
  } catch {
    return fallback
  }
}
