// Word lists for reading Taglish: Filipino, Spanish-derived and English number words, units,
// effort and time words, and the filler words that carry no food or activity meaning.

export const ONES: Record<string, number> = {
  zero: 0, wala: 0,
  isa: 1, uno: 1, one: 1,
  dalawa: 2, dos: 2, two: 2,
  tatlo: 3, tres: 3, three: 3,
  apat: 4, kuwatro: 4, cuatro: 4, four: 4,
  lima: 5, singko: 5, cinco: 5, five: 5,
  anim: 6, sais: 6, seis: 6, six: 6,
  pito: 7, siyete: 7, siete: 7, seven: 7,
  walo: 8, otso: 8, ocho: 8, eight: 8,
  siyam: 9, nuwebe: 9, nueve: 9, nine: 9,
  sampu: 10, diyes: 10, diez: 10, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19
}

export const TENS: Record<string, number> = {
  dalawampu: 20, twenty: 20, tatlumpu: 30, thirty: 30, apatnapu: 40, forty: 40,
  limampu: 50, fifty: 50, animnapu: 60, sixty: 60, pitumpu: 70, seventy: 70,
  walumpu: 80, eighty: 80, siyamnapu: 90, ninety: 90, sandaan: 100, hundred: 100
}

export const HALF = new Set(['kalahati', 'kalahating', 'half', 'medya'])
export const DOZEN = new Set(['dosena', 'dozen', 'dosenang'])

// Duration units (to minutes) and distance units
export const MINUTE_UNITS = new Set(['min', 'mins', 'minute', 'minutes', 'minuto', 'minutos', 'mnts'])
export const HOUR_UNITS = new Set(['hr', 'hrs', 'hour', 'hours', 'oras', 'ora', 'h'])
export const DISTANCE_UNITS = new Set(['km', 'kms', 'kilometer', 'kilometers', 'kilometro', 'k', 'mile', 'miles'])

// Food and drink units -> canonical portion unit (see PortionUnit in refdata.ts)
export const FOOD_UNITS: Record<string, string> = {
  cup: 'cup', cups: 'cup', tasa: 'cup',
  piece: 'piece', pieces: 'piece', pc: 'piece', pcs: 'piece', piraso: 'piece', slice: 'piece',
  slices: 'piece', hiwa: 'piece', balot: 'piece', stick: 'piece', sticks: 'piece',
  glass: 'glass', glasses: 'glass', baso: 'glass',
  bowl: 'bowl', bowls: 'bowl', mangkok: 'bowl',
  plate: 'plate', plates: 'plate', plato: 'plate',
  can: 'can', cans: 'can', lata: 'can', bote: 'can', bottle: 'can', bottles: 'can',
  serving: 'serving', servings: 'serving', order: 'serving', orders: 'serving', pack: 'serving',
  sachet: 'serving', pakete: 'serving', balot_: 'serving',
  gram: 'gram', grams: 'gram', gramo: 'gram', g: 'gram', gm: 'gram'
}

// Water amounts in glasses; a litre is four 250 ml glasses.
export const WATER_UNITS: Record<string, number> = {
  baso: 1, glass: 1, glasses: 1, tasa: 1, cup: 1, cups: 1, bote: 2, bottle: 2, bottles: 2,
  litro: 4, liter: 4, liters: 4, litre: 4, litres: 4, l: 4
}
export const WATER_WORDS = new Set(['tubig', 'water'])
export const SLEEP_WORDS = new Set(['tulog', 'natulog', 'sleep', 'slept', 'sleeping', 'nakatulog', 'tulug', 'nagpahinga'])
export const WEIGHT_UNITS = new Set(['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'])
export const POUND_UNITS = new Set(['lb', 'lbs', 'pound', 'pounds', 'libra'])

export const EFFORT_WORDS: Record<string, 'light' | 'moderate' | 'hard'> = {
  chill: 'light', relax: 'light', relaxed: 'light', light: 'light', easy: 'light', dahan: 'light',
  banayad: 'light', konti: 'light', leisurely: 'light',
  mabilis: 'moderate', brisk: 'moderate', moderate: 'moderate', katamtaman: 'moderate',
  hard: 'hard', todo: 'hard', intense: 'hard', mabigat: 'hard', pagod: 'hard', grabe: 'hard',
  vigorous: 'hard', matindi: 'hard', sagad: 'hard'
}

// Past markers move the log to an earlier day; future markers mean it has not happened yet.
export const YESTERDAY = new Set(['kahapon', 'yesterday', 'kagabi', 'kamakalawa'])
export const FUTURE_WORDS = new Set([
  'mamaya', 'bukas', 'later', 'tomorrow', 'plano', 'balak', 'plan', 'planning', 'gagawin', 'will',
  'gonna', 'babalik', 'susunod', 'tonight'
])

// Words that carry no food, activity or number meaning. Leftover words that are not here are
// reported as "not understood" instead of being silently dropped.
export const STOP = new Set(`
  ako ko ka kami kayo sila siya niya namin natin nila mo mong kong kaming ako ay at t ng nang na
  ang sa si ni yung yun iyon itong ito lang po ho pala daw raw kasi kaya naman din rin ba eh so
  tapos tsaka saka pati pero then and plus the a an of for in on to my i we me today ngayon
  kanina kaninang umaga tanghali hapon gabi morning afternoon evening night almusal tanghalian
  hapunan merienda breakfast lunch dinner snack uhm um ano like basically mga humigit around about
  approx halos abot mag nag pag um kumain kain kumakain kinain uminom inom ininom nainom ate drank
  had did went naglaro laro played ginawa gumawa gumagawa ginawa nagawa gawa nakagawa kahit
  talaga sobrang medyo yata siguro baka din rin muna pa na nga lamang lng ng ndi hindi wala
  naka nakaka sana ulit ulet pang pangalawa unang ikalawa kanina lahat mismo mismong
  doon dito diyan dyan sama kasama kasabay kami kaming naming ming nong noong ngayong
  was were is are am been being have has having just also too very really kind sort
  ehersisyo exercise workout nag exercise nagexercise ehersisyo gym
`.split(/\s+/).filter(Boolean))

export const CLAUSE_SPLIT = new Set([',', ';', 'tapos', 'tsaka', 'saka', 'pati', 'then', 'plus', 'pero', 'tas', 'and', 'at', 'after'])
