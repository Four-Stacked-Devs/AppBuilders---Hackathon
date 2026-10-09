# UI Redesign Implementation Plan

**Goal:** Restyle the Vox renderer to match the VOX wireframes (light and dark) without changing
any behaviour, IPC, calc, safety or main-process code.

**Architecture:** A left-sidebar shell replaces the top bar. A single `styles.css` holds design
tokens for light and dark plus every component style; all sizes are in `rem` where
`1rem = 10 wireframe px × scale`, so one line changes the scale. New screens (Onboarding, Talk,
Dashboard, Progress, Settings) reuse the existing store and `window.vox` calls. The only new
logic is small pure helpers (date periods, range summaries, weight change, greeting, theme
parsing), each with tests.

**Tech Stack:** Electron + electron-vite, React 19, TypeScript, Zustand, Recharts 3, Vitest,
`lucide-react@1.47.0` (new), `@fontsource-variable/inter@5.3.0` (new).

**Spec:** `docs/specs/2026-10-10-ui-redesign-design.md`

## Global Constraints

- Branch `feat/ui-redesign`. Never merge into `main`, never push without asking.
- Commits: Conventional Commits, no AI attribution of any kind (AGENTS.md overrides any default).
- No runtime network. CSP in `src/renderer/index.html` is not changed. Fonts/icons are npm packages.
- Renderer only calls `window.vox.*`. Do not touch `src/main`, `src/preload`, `src/shared/schemas.ts`, `src/shared/api.ts`.
- No invented numbers: no targets, rings, goal percentages, macros. Every displayed number is a stored value or comes from a tested helper in `src/shared/calc`.
- Teen mode (`profile.mode === 'teen'`): no calorie, weight or diet content on any screen.
- Every energy number shows `~` and the word "estimate".
- Red (`--primary`) is the brand accent only; never used to mark over/under a number.
- Keep verbatim: safety/crisis text, "Lahat ng data mo, nasa computer mo lang.", the not-medical-advice disclaimer, Taglish example prompts, ConfirmCard text.
- Dependency versions pinned exactly: `lucide-react@1.47.0`, `@fontsource-variable/inter@5.3.0` (both published more than two weeks before 2026-10-10).
- Done means: `npm test`, `npm run typecheck`, `npm run lint` all pass.

## Review Focus

- Calories-off adult (`sexForFormula: 'unspecified'`, `caloriesEnabled: false`): no kcal card, no "nutrition" bar card, no TDEE line. Pinned by `summarizeRange` returning `avgKcalIn: null` when `kcalIn` is undefined (Task 3) and by the `caloriesEnabled` guards in Tasks 8–9.
- Teen profile: no weight chart, no body weight metric, no kcal anywhere, no Sex field in onboarding. Checked in Task 11's manual matrix; code guards in Tasks 6, 8, 9, 10.
- Navigating to a future period: the › button is disabled once the next period would start after today. Pinned by `canGoNext` tests (Task 3).
- Weeks crossing a month or year boundary (e.g. 2026-12-31): `startOfWeek` / `monthBounds` tests (Task 3).
- `localStorage` unavailable or holding junk: theme falls back to `system`. Pinned by `parseThemePref` tests (Task 4); load/store are wrapped in try/catch.

## File map

| File | Action | Responsibility |
| --- | --- | --- |
| `package.json`, `package-lock.json` | Modify | add lucide-react, Inter; remove Bricolage |
| `build/icon.png`, `build/icon.icns`, `build/icon.ico`, `resources/icon.png` | Replace | panther app icon |
| `src/renderer/src/assets/logo-mark.png` | Create | sidebar/top-bar panther mark |
| `src/shared/dates.ts` | Modify | `startOfWeek`, `monthBounds`, `addMonths`, `periodRange`, `shiftPeriod`, `canGoNext` |
| `src/shared/calc/summary.ts`, `src/shared/calc/index.ts` | Create/Modify | `summarizeRange`, `weightChange` |
| `src/renderer/src/theme.ts` | Create | theme pref parse/load/apply |
| `src/renderer/src/format.ts` | Create | `greeting`, date labels |
| `src/renderer/src/useTokens.ts` | Create | CSS token colours for Recharts |
| `src/renderer/src/styles.css` | Rewrite | tokens + all styles |
| `src/renderer/src/store.ts` | Modify | new `Screen` union, theme pref |
| `src/renderer/src/main.tsx` | Modify | apply saved theme before render |
| `src/renderer/src/App.tsx` | Rewrite | shell routing |
| `src/renderer/src/components/Sidebar.tsx`, `Brand.tsx` | Create | navigation, logo |
| `src/renderer/src/components/AiChip.tsx`, `MicButton.tsx` | Modify | restyle |
| `src/renderer/src/components/Steps.tsx`, `ChoiceCard.tsx` | Create | onboarding parts |
| `src/renderer/src/components/StatCard.tsx`, `BarCard.tsx`, `Banner.tsx`, `PeriodNav.tsx`, `WeightChart.tsx` | Create | dashboard parts |
| `src/renderer/src/screens/Onboarding.tsx` | Create | replaces `Profile.tsx` |
| `src/renderer/src/screens/Talk.tsx` | Create | replaces `Log.tsx` |
| `src/renderer/src/screens/Dashboard.tsx` | Create | replaces `Today.tsx` |
| `src/renderer/src/screens/Progress.tsx`, `Settings.tsx` | Create | new screens |
| `src/renderer/src/screens/Setup.tsx` | Modify | restyle |
| `tests/dates.test.ts`, `tests/summary.test.ts`, `tests/renderer-utils.test.ts` | Create | helper tests |

Measured wireframe values used below (from `wireframe/*.png`, light dashboards file
`838649701_…png`, at its native pixels): page title cap height 19 px (≈26 px Inter), subtitle
≈12 px, nav text ≈11 px, sidebar ≈180 px wide, active nav pill ≈28 px tall, input 34 px tall,
primary button 38 px tall. CSS writes these as rem with `html { font-size: 12.5px }`
(10 px × 1.25 scale, chosen by the user), e.g. 26 px → `2.6rem`.

---

### Task 1: Dependencies and font

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `src/renderer/src/styles.css:1` and the `--display` / `--body` tokens

**Interfaces:**
- Produces: font family `'Inter Variable'` and `lucide-react` icons available to every later task.

- [ ] **Step 1: Install pinned packages and remove Bricolage**

```bash
npm install --save-exact lucide-react@1.47.0 @fontsource-variable/inter@5.3.0
npm uninstall @fontsource-variable/bricolage-grotesque
```

- [ ] **Step 2: Verify the font family name and the icon names used in this plan**

```bash
grep -m1 "font-family" node_modules/@fontsource-variable/inter/index.css
D=node_modules/lucide-react/dist/lucide-react.d.ts
for n in MessageSquare CalendarDays ChartNoAxesColumnIncreasing Settings ChevronLeft ChevronRight ArrowRight ArrowLeft Check CircleCheck Flame Activity Droplet Moon Lightbulb Mic SendHorizontal Pencil Sun Monitor ShieldCheck Lock Cpu Dumbbell Utensils Scale Ruler User; do printf "%s " $n; grep -c "declare const $n:" $D; done
grep -c "LucideIcon," $D
```

Expected: `font-family: 'Inter Variable';` and every icon count `1`. If any is `0`, stop and report;
do not substitute a guessed name.

- [ ] **Step 3: Swap the font in the current stylesheet so `main` still renders**

In `src/renderer/src/styles.css` replace line 1 with
`@import '@fontsource-variable/inter';` and set both
`--display` and `--body` to `'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;`.

- [ ] **Step 4: Check**

Run: `npm run typecheck && npm test`
Expected: both pass (no logic changed).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/renderer/src/styles.css
git commit -m "build(renderer): add inter and lucide icons, drop bricolage"
```

---

### Task 2: App icon and logo mark

The only source is the icon sheet `wireframe/839959866_…png` (1536×1024). Measured bounds: the app
icon's rounded square spans x 127–515, y 127–521; the desktop icon's panther head spans
x 732–922, y 228–368. The tool (sharp) is installed in a temporary folder, never in the project.

**Files:**
- Replace: `build/icon.png` (1024×1024), `build/icon.icns`, `build/icon.ico`, `resources/icon.png`
- Create: `src/renderer/src/assets/logo-mark.png`

**Interfaces:**
- Produces: `src/renderer/src/assets/logo-mark.png` (transparent background), imported by `Brand.tsx` in Task 6.

- [ ] **Step 1: Set up the one-off tool outside the repo**

```bash
T=$(mktemp -d)/icon-tool
mkdir -p "$T" && cd "$T" && npm init -y >/dev/null && npm install --save-exact sharp@0.35.4
```

- [ ] **Step 2: Write `$T/make-icons.mjs`**

```js
// One-off: builds the app icon and logo mark from the wireframe icon sheet.
// usage: node make-icons.mjs <repo>
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const repo = process.argv[2]
const dir = path.join(repo, 'wireframe')
const sheet = path.join(dir, fs.readdirSync(dir).find((f) => f.startsWith('839959866_')))

// App icon body: the rounded square, scaled to 824 px and centred on a 1024 transparent canvas
// (macOS icon grid). Corner radius matches the sheet (~22.5% of the side).
const body = 824
const radius = Math.round(body * 0.225)
const mask = Buffer.from(
  `<svg width="${body}" height="${body}"><rect width="${body}" height="${body}" rx="${radius}" fill="#fff"/></svg>`
)
const bodyPng = await sharp(sheet)
  .extract({ left: 127, top: 127, width: 389, height: 394 })
  .resize(body, body, { fit: 'fill', kernel: 'lanczos3' })
  .composite([{ input: mask, blend: 'dest-in' }])
  .png()
  .toBuffer()
const icon = await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
})
  .composite([{ input: bodyPng, left: 100, top: 100 }])
  .png()
  .toBuffer()
fs.writeFileSync(path.join(repo, 'build/icon.png'), icon)
fs.writeFileSync(path.join(repo, 'resources/icon.png'), icon)

// macOS .icns via iconutil.
const set = path.join(path.dirname(new URL(import.meta.url).pathname), 'icon.iconset')
fs.rmSync(set, { recursive: true, force: true })
fs.mkdirSync(set)
for (const s of [16, 32, 128, 256, 512]) {
  fs.writeFileSync(path.join(set, `icon_${s}x${s}.png`), await sharp(icon).resize(s, s).png().toBuffer())
  fs.writeFileSync(
    path.join(set, `icon_${s}x${s}@2x.png`),
    await sharp(icon).resize(s * 2, s * 2).png().toBuffer()
  )
}
execFileSync('iconutil', ['-c', 'icns', set, '-o', path.join(repo, 'build/icon.icns')])

// Windows .ico holding PNG images (supported since Windows Vista).
const sizes = [16, 24, 32, 48, 64, 128, 256]
const pngs = await Promise.all(sizes.map(async (s) => ({ s, buf: await sharp(icon).resize(s, s).png().toBuffer() })))
const head = Buffer.alloc(6)
head.writeUInt16LE(0, 0)
head.writeUInt16LE(1, 2)
head.writeUInt16LE(pngs.length, 4)
const entries = Buffer.alloc(16 * pngs.length)
let offset = 6 + entries.length
pngs.forEach(({ s, buf }, i) => {
  const o = i * 16
  entries[o] = s >= 256 ? 0 : s
  entries[o + 1] = s >= 256 ? 0 : s
  entries.writeUInt16LE(1, o + 4)
  entries.writeUInt16LE(32, o + 6)
  entries.writeUInt32LE(buf.length, o + 8)
  entries.writeUInt32LE(offset, o + 12)
  offset += buf.length
})
fs.writeFileSync(path.join(repo, 'build/icon.ico'), Buffer.concat([head, entries, ...pngs.map((p) => p.buf)]))

// Logo mark: the desktop-icon panther head with its white background made transparent.
const { data, info } = await sharp(sheet)
  .extract({ left: 732, top: 228, width: 190, height: 140 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
for (let i = 0; i < data.length; i += 4) {
  const min = Math.min(data[i], data[i + 1], data[i + 2])
  // Near-white (paper) becomes transparent; red stays opaque; the edge fades smoothly.
  data[i + 3] = min > 235 ? 0 : min > 180 ? Math.round(((235 - min) / 55) * 255) : 255
}
const assets = path.join(repo, 'src/renderer/src/assets')
fs.mkdirSync(assets, { recursive: true })
await sharp(data, { raw: info }).trim().resize({ height: 96 }).png().toFile(path.join(assets, 'logo-mark.png'))
console.log('icons written')
```

- [ ] **Step 3: Run it**

```bash
node "$T/make-icons.mjs" "$PWD"  # run from the repo root
file build/icon.png build/icon.icns build/icon.ico resources/icon.png src/renderer/src/assets/logo-mark.png
```

Expected: `icons written`; icon.png 1024×1024 RGBA; icns "Mac OS X icon"; ico "MS Windows icon resource - 7 icons".

- [ ] **Step 4: Look at the results**

Open `build/icon.png` and `src/renderer/src/assets/logo-mark.png` with the Read tool. Check: no
grey sheet background in the corners, panther not cut off, mark background transparent. If a crop
is off, adjust the numbers in Step 2, rerun, and record the final numbers in the commit body.

- [ ] **Step 5: Commit**

```bash
git add build/icon.png build/icon.icns build/icon.ico resources/icon.png src/renderer/src/assets/logo-mark.png
git commit -m "build(icons): use the panther icon from the wireframe icon sheet" \
  -m "Cropped from the wireframe icon sheet (no source artwork exists) and
upscaled from about 390 px, so the 1024 px icon is softer than an
original would be. Swap in designer files when available."
```

---

### Task 3: Date-period and range-summary helpers

**Files:**
- Modify: `src/shared/dates.ts`
- Create: `src/shared/calc/summary.ts`
- Modify: `src/shared/calc/index.ts`
- Test: `tests/dates.test.ts`, `tests/summary.test.ts`

**Interfaces:**
- Consumes: `localDate`, `addDays` (existing, `src/shared/dates.ts`); `round10`, `roundHalf` (existing calc); `DaySummary` type.
- Produces:
  - `type Period = 'day' | 'week' | 'month'`
  - `startOfWeek(date: string): string` (Monday)
  - `monthBounds(date: string): { from: string; to: string }`
  - `addMonths(date: string, n: number): string` (returns the 1st of the target month)
  - `periodRange(period: Period, anchor: string): { from: string; to: string }`
  - `shiftPeriod(period: Period, anchor: string, dir: -1 | 1): string`
  - `canGoNext(period: Period, anchor: string, today: string): boolean`
  - `summarizeRange(days: DaySummary[]): RangeSummary` with `RangeSummary = { days: number; daysLogged: number; activeMinutes: number; avgSleepHours: number | null; avgWaterGlasses: number | null; avgKcalIn: number | null }`
  - `weightChange(days: DaySummary[]): { latestKg: number; changeKg: number; since: string } | null`

- [ ] **Step 1: Write failing date tests** (`tests/dates.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import {
  addMonths,
  canGoNext,
  monthBounds,
  periodRange,
  shiftPeriod,
  startOfWeek
} from '../src/shared/dates'

// 2026-10-10 is a Saturday; weeks run Monday to Sunday as in the wireframes.
describe('periods', () => {
  it('startOfWeek returns the Monday', () => {
    expect(startOfWeek('2026-10-10')).toBe('2026-10-05')
    expect(startOfWeek('2026-10-05')).toBe('2026-10-05')
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05')
  })
  it('startOfWeek crosses a year boundary', () => {
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28')
  })
  it('monthBounds handles short and leap months', () => {
    expect(monthBounds('2026-02-14')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthBounds('2024-02-03')).toEqual({ from: '2024-02-01', to: '2024-02-29' })
    expect(monthBounds('2026-12-31')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })
  it('addMonths lands on the first of the month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-01')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01')
  })
  it('periodRange', () => {
    expect(periodRange('day', '2026-10-10')).toEqual({ from: '2026-10-10', to: '2026-10-10' })
    expect(periodRange('week', '2026-10-10')).toEqual({ from: '2026-10-05', to: '2026-10-11' })
    expect(periodRange('month', '2026-10-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' })
  })
  it('shiftPeriod', () => {
    expect(shiftPeriod('day', '2026-10-10', -1)).toBe('2026-10-09')
    expect(shiftPeriod('week', '2026-10-10', -1)).toBe('2026-10-03')
    expect(shiftPeriod('month', '2026-10-10', 1)).toBe('2026-11-01')
  })
  it('canGoNext stops at the period containing today', () => {
    expect(canGoNext('day', '2026-10-10', '2026-10-10')).toBe(false)
    expect(canGoNext('day', '2026-10-09', '2026-10-10')).toBe(true)
    expect(canGoNext('week', '2026-10-06', '2026-10-10')).toBe(false)
    expect(canGoNext('week', '2026-10-01', '2026-10-10')).toBe(true)
    expect(canGoNext('month', '2026-10-01', '2026-10-10')).toBe(false)
    expect(canGoNext('month', '2026-09-30', '2026-10-10')).toBe(true)
  })
})
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run tests/dates.test.ts`
Expected: FAIL, the new functions are not exported.

- [ ] **Step 3: Implement** (append to `src/shared/dates.ts`)

```ts
const parts = (date: string): [number, number, number] =>
  date.split('-').map(Number) as [number, number, number]

export type Period = 'day' | 'week' | 'month'

// Monday of the week containing `date` (weeks run Monday to Sunday, as in the wireframes).
export function startOfWeek(date: string): string {
  const [y, m, d] = parts(date)
  const dow = new Date(y, m - 1, d).getDay() // 0 = Sunday
  return addDays(date, -((dow + 6) % 7))
}

export function monthBounds(date: string): { from: string; to: string } {
  const [y, m] = parts(date)
  return { from: localDate(new Date(y, m - 1, 1)), to: localDate(new Date(y, m, 0)) }
}

// First day of the month `n` months away.
export function addMonths(date: string, n: number): string {
  const [y, m] = parts(date)
  return localDate(new Date(y, m - 1 + n, 1))
}

export function periodRange(period: Period, anchor: string): { from: string; to: string } {
  if (period === 'day') return { from: anchor, to: anchor }
  if (period === 'week') {
    const from = startOfWeek(anchor)
    return { from, to: addDays(from, 6) }
  }
  return monthBounds(anchor)
}

export function shiftPeriod(period: Period, anchor: string, dir: -1 | 1): string {
  if (period === 'day') return addDays(anchor, dir)
  if (period === 'week') return addDays(anchor, 7 * dir)
  return addMonths(anchor, dir)
}

// The › button: only while the next period starts on or before today.
export function canGoNext(period: Period, anchor: string, today: string): boolean {
  return periodRange(period, shiftPeriod(period, anchor, 1)).from <= today
}
```

- [ ] **Step 4: Run, expect pass**

Run: `npx vitest run tests/dates.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Write failing summary tests** (`tests/summary.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import { summarizeRange, weightChange } from '../src/shared/calc'
import type { DaySummary } from '../src/shared/schemas'

// Synthetic days that check the arithmetic only. Not real logs.
const day = (date: string, p: Partial<DaySummary> = {}): DaySummary => ({
  date,
  activeMinutes: 0,
  waterGlasses: 0,
  sleepHours: 0,
  bodyWeightKg: null,
  entryCount: 0,
  latestReaction: null,
  includesDemoData: false,
  ...p
})

describe('summarizeRange', () => {
  it('counts logged days and totals active minutes', () => {
    const s = summarizeRange([
      day('2026-10-05', { entryCount: 2, activeMinutes: 30 }),
      day('2026-10-06'),
      day('2026-10-07', { entryCount: 1, activeMinutes: 45 })
    ])
    expect(s).toMatchObject({ days: 3, daysLogged: 2, activeMinutes: 75 })
  })
  it('averages only days that have a value, rounded for display', () => {
    const s = summarizeRange([
      day('2026-10-05', { entryCount: 1, sleepHours: 7, waterGlasses: 6, kcalIn: 1840 }),
      day('2026-10-06', { entryCount: 1, sleepHours: 8, waterGlasses: 0, kcalIn: 2013 }),
      day('2026-10-07')
    ])
    expect(s.avgSleepHours).toBe(7.5)
    expect(s.avgWaterGlasses).toBe(6)
    expect(s.avgKcalIn).toBe(1930) // (1840 + 2013) / 2 = 1926.5 -> nearest 10
  })
  it('returns null averages when nothing was logged or calories are off', () => {
    const s = summarizeRange([day('2026-10-05', { entryCount: 1, activeMinutes: 20 })])
    expect(s.avgSleepHours).toBeNull()
    expect(s.avgWaterGlasses).toBeNull()
    expect(s.avgKcalIn).toBeNull()
    expect(summarizeRange([]).daysLogged).toBe(0)
  })
})

describe('weightChange', () => {
  it('compares the latest weigh-in with the first one in range', () => {
    expect(
      weightChange([
        day('2026-09-01', { bodyWeightKg: 70.2 }),
        day('2026-09-02'),
        day('2026-09-20', { bodyWeightKg: 69.05 })
      ])
    ).toEqual({ latestKg: 69.1, changeKg: -1.2, since: '2026-09-01' })
  })
  it('is null with no weigh-ins', () => {
    expect(weightChange([day('2026-09-01')])).toBeNull()
  })
})
```

- [ ] **Step 6: Run, expect failure**

Run: `npx vitest run tests/summary.test.ts`
Expected: FAIL, `summarizeRange` is not exported.

- [ ] **Step 7: Implement** (`src/shared/calc/summary.ts`)

```ts
import type { DaySummary } from '../schemas'
import { round10, roundHalf } from './rounding'

// Totals and averages for the Weekly, Monthly and Progress views. Averages count only days
// that have a value, so a day with no sleep logged does not pull the sleep average down.
export type RangeSummary = {
  days: number
  daysLogged: number
  activeMinutes: number
  avgSleepHours: number | null
  avgWaterGlasses: number | null
  avgKcalIn: number | null // null when calories are off or nothing was eaten
}

const mean = (xs: number[]): number | null =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null

export function summarizeRange(days: DaySummary[]): RangeSummary {
  const sleep = mean(days.filter((d) => d.sleepHours > 0).map((d) => d.sleepHours))
  const water = mean(days.filter((d) => d.waterGlasses > 0).map((d) => d.waterGlasses))
  const kcal = mean(days.flatMap((d) => (d.kcalIn !== undefined && d.kcalIn > 0 ? [d.kcalIn] : [])))
  return {
    days: days.length,
    daysLogged: days.filter((d) => d.entryCount > 0).length,
    activeMinutes: days.reduce((s, d) => s + d.activeMinutes, 0),
    avgSleepHours: sleep === null ? null : roundHalf(sleep),
    avgWaterGlasses: water === null ? null : roundHalf(water),
    avgKcalIn: kcal === null ? null : round10(kcal)
  }
}

const tenth = (n: number): number => Math.round(n * 10) / 10

// Latest weigh-in and its change from the first weigh-in in the range, to 0.1 kg.
export function weightChange(
  days: DaySummary[]
): { latestKg: number; changeKg: number; since: string } | null {
  const w = days.filter((d) => d.bodyWeightKg !== null)
  if (w.length === 0) return null
  const first = w[0]
  const last = w[w.length - 1]
  return {
    latestKg: tenth(last.bodyWeightKg as number),
    changeKg: tenth((last.bodyWeightKg as number) - (first.bodyWeightKg as number)),
    since: first.date
  }
}
```

Add `export * from './summary'` to `src/shared/calc/index.ts`.

- [ ] **Step 8: Run, expect pass**

Run: `npx vitest run tests/summary.test.ts tests/dates.test.ts && npm run typecheck`
Expected: PASS. (Fixture values were checked in Node beforehand: `tenth(69.05)` is `69.1`,
`tenth(69.05 - 70.2)` is `-1.2`, `round10(1926.5)` is `1930`.)

- [ ] **Step 9: Commit**

```bash
git add src/shared/dates.ts src/shared/calc/summary.ts src/shared/calc/index.ts tests/dates.test.ts tests/summary.test.ts
git commit -m "feat(calc): add period ranges and weekly/monthly summaries"
```

---

### Task 4: Theme, greeting and token helpers

**Files:**
- Create: `src/renderer/src/theme.ts`, `src/renderer/src/format.ts`, `src/renderer/src/useTokens.ts`
- Modify: `src/renderer/src/store.ts`, `src/renderer/src/main.tsx`
- Test: `tests/renderer-utils.test.ts`

**Interfaces:**
- Produces:
  - `type ThemePref = 'light' | 'dark' | 'system'`; `parseThemePref(raw: unknown): ThemePref`; `loadThemePref(): ThemePref`; `applyTheme(pref: ThemePref): void`
  - `greeting(hour: number): string`; `longDate(date: string): string` ("Saturday, October 10, 2026"); `shortDate(date: string): string` ("Oct 10"); `shortDay(date: string): string` ("Sat"); `monthLabel(date: string): string` ("October 2026")
  - `useTokens(): { primary: string; ink: string; muted: string; line: string; sleep: string; water: string }`
  - Store: `Screen = 'talk' | 'today' | 'weekly' | 'monthly' | 'progress' | 'settings' | 'onboarding'`, `themePref: ThemePref`, `setThemePref(p: ThemePref): void`

- [ ] **Step 1: Failing tests** (`tests/renderer-utils.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import { parseThemePref } from '../src/renderer/src/theme'
import { greeting } from '../src/renderer/src/format'

describe('parseThemePref', () => {
  it('keeps valid values', () => {
    expect(parseThemePref('light')).toBe('light')
    expect(parseThemePref('dark')).toBe('dark')
    expect(parseThemePref('system')).toBe('system')
  })
  it('falls back to system for missing or junk values', () => {
    expect(parseThemePref(null)).toBe('system')
    expect(parseThemePref('blue')).toBe('system')
    expect(parseThemePref(42)).toBe('system')
  })
})

describe('greeting', () => {
  it('follows local time of day', () => {
    expect(greeting(5)).toBe('Good morning')
    expect(greeting(11)).toBe('Good morning')
    expect(greeting(12)).toBe('Good afternoon')
    expect(greeting(17)).toBe('Good afternoon')
    expect(greeting(18)).toBe('Good evening')
    expect(greeting(0)).toBe('Good evening')
  })
})
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run tests/renderer-utils.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/renderer/src/theme.ts`**

```ts
// Light, dark or follow the system. Remembered on this computer only.
export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'vox.theme'

export const parseThemePref = (raw: unknown): ThemePref =>
  raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'

export function loadThemePref(): ThemePref {
  try {
    return parseThemePref(localStorage.getItem(KEY))
  } catch {
    return 'system'
  }
}

export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement
  if (pref === 'system') delete root.dataset.theme
  else root.dataset.theme = pref
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    // Storage unavailable: the choice lasts until the app restarts.
  }
}
```

- [ ] **Step 4: Implement `src/renderer/src/format.ts`**

Greeting bands by local hour: 5–11 morning, 12–17 afternoon, otherwise evening (00–04 included).

```ts
// Display text only; no numbers are calculated here.
export const greeting = (hour: number): string =>
  hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 18 ? 'Good afternoon' : 'Good evening'

const at = (date: string): Date => new Date(`${date}T00:00:00`)

export const longDate = (date: string): string =>
  at(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
export const shortDate = (date: string): string =>
  at(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const shortDay = (date: string): string =>
  at(date).toLocaleDateString('en-US', { weekday: 'short' })
export const monthLabel = (date: string): string =>
  at(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
```

Note: the existing screens used `'en-PH'`; `'en-US'` is used here because the wireframes show
"Tuesday, March 12, 2024" order. Both print English month names.

- [ ] **Step 5: Run tests, expect pass**

Run: `npx vitest run tests/renderer-utils.test.ts`
Expected: PASS.

- [ ] **Step 6: Update `src/renderer/src/store.ts`**

Replace the `Screen` type, add theme fields:

```ts
import { applyTheme, loadThemePref, type ThemePref } from './theme'

export type Screen = 'talk' | 'today' | 'weekly' | 'monthly' | 'progress' | 'settings' | 'onboarding'
```

In `State` add `themePref: ThemePref` and `setThemePref: (p: ThemePref) => void`. In the store:
`screen: 'talk'`, `themePref: loadThemePref()`, and

```ts
  setThemePref: (themePref) => {
    applyTheme(themePref) // before the store update, so token readers see the new theme
    set({ themePref })
  },
```

- [ ] **Step 7: Implement `src/renderer/src/useTokens.ts`**

```ts
import { useMemo, useSyncExternalStore } from 'react'
import { useVox } from './store'

export type Tokens = { primary: string; ink: string; muted: string; line: string; sleep: string; water: string }

const DARK = '(prefers-color-scheme: dark)'

function subscribe(cb: () => void): () => void {
  const mq = window.matchMedia(DARK)
  mq.addEventListener('change', cb)
  const off = useVox.subscribe(cb)
  return () => {
    mq.removeEventListener('change', cb)
    off()
  }
}

const themeKey = (): string =>
  `${document.documentElement.dataset.theme ?? 'system'}:${window.matchMedia(DARK).matches}`

// Recharts needs real colour strings, so read the CSS tokens and re-read when the theme changes.
export function useTokens(): Tokens {
  const key = useSyncExternalStore(subscribe, themeKey)
  return useMemo(() => {
    void key
    const cs = getComputedStyle(document.documentElement)
    const v = (n: string): string => cs.getPropertyValue(n).trim()
    return {
      primary: v('--primary'),
      ink: v('--ink'),
      muted: v('--muted'),
      line: v('--line'),
      sleep: v('--sleep'),
      water: v('--water')
    }
  }, [key])
}
```

- [ ] **Step 8: Apply the saved theme before first paint** in `src/renderer/src/main.tsx`, after the imports:

```ts
import { applyTheme, loadThemePref } from './theme'

applyTheme(loadThemePref())
```

- [ ] **Step 9: Check**

Run: `npm run typecheck`
Expected: errors only in `App.tsx`, `Log.tsx`, `Profile.tsx`, `Today.tsx` for the removed
`'log' | 'profile'` screen values. Fix them minimally so this commit builds: in those files
replace `'log'` with `'talk'` and `'profile'` with `'onboarding'`. Then `npm run typecheck && npm test` pass.

- [ ] **Step 10: Commit**

```bash
git add src/renderer/src/theme.ts src/renderer/src/format.ts src/renderer/src/useTokens.ts src/renderer/src/store.ts src/renderer/src/main.tsx src/renderer/src/App.tsx src/renderer/src/screens tests/renderer-utils.test.ts
git commit -m "feat(renderer): add theme preference, greeting and chart tokens"
```

---

### Task 5: Design tokens and stylesheet

**Files:**
- Rewrite: `src/renderer/src/styles.css`

**Interfaces:**
- Produces the CSS classes every later task uses (listed in the file below). Existing class names
  used by `ConfirmCard.tsx` and `MicButton.tsx` are kept: `card row name said link small muted
  unit-select remove candidates candidate chips chip card-actions btn primary stepper mic-wrap
  round mic mic-status error`.

Colour sources (sampled pixels; approximations are marked):

| Token | Light | Dark | Source |
| --- | --- | --- | --- |
| `--bg` | `#f1f2f4` | `#0e1113` | outer frame |
| `--sidebar` | `#fafcfb` | `#0b0f13` | sidebar |
| `--surface` | `#ffffff` | `#121618` | main panel |
| `--surface-2` | `#f7f8f9` | `#0b0d0f` | ring track / inputs |
| `--ink` | `#0b0d1a` | `#f5f7fa` | title strokes (`#00021a` / `#fefdfe`), softened |
| `--muted` | `#5c6577` | `#9aa3ad` | subtitle strokes, between core `#3c4459` and edge `#788294` (approx.) |
| `--line` | `#e5eaf0` | `#222c36` | input borders |
| `--primary` | `#eb0a14` | `#eb1e24` | Sign in buttons |
| `--primary-soft` | `#feeeee` | `#341315` | active nav pill |
| `--insight` | `#fdeaeb` | `#20161a` | VOX Insight card |
| `--sleep` | `#837dfe` | `#8c76fd` | sleep bars |
| `--water` | `#46acfa` | `#38adfe` | water bars |
| `--good` | `#019256` | `#019256` | privacy check icons |
| `--warm` | `#ff8800` | `#ff8800` | insight bulb |

- [ ] **Step 1: Replace `src/renderer/src/styles.css` with:**

```css
@import '@fontsource-variable/inter';

/* Sizes are in rem: 1rem = 10 wireframe px x scale. Scale 1.25 chosen for the
   1200x800 window; change only this line to rescale everything. */
html {
  font-size: 12.5px;
}

:root {
  --bg: #f1f2f4;
  --sidebar: #fafcfb;
  --surface: #ffffff;
  --surface-2: #f7f8f9;
  --ink: #0b0d1a;
  --muted: #5c6577;
  --line: #e5eaf0;
  --primary: #eb0a14;
  --primary-ink: #ffffff;
  --primary-soft: #feeeee;
  --insight: #fdeaeb;
  --sleep: #837dfe;
  --water: #46acfa;
  --good: #019256;
  --warm: #ff8800;
  /* Hero art goes here later, e.g. url('./assets/hero-light.png'); none until source files exist. */
  --banner-art: none;

  --font: 'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --r-sm: 0.6rem;
  --r-md: 0.8rem;
  --r-lg: 1.2rem;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --bg: #0e1113;
    --sidebar: #0b0f13;
    --surface: #121618;
    --surface-2: #0b0d0f;
    --ink: #f5f7fa;
    --muted: #9aa3ad;
    --line: #222c36;
    --primary: #eb1e24;
    --primary-soft: #341315;
    --insight: #20161a;
    --sleep: #8c76fd;
    --water: #38adfe;
    color-scheme: dark;
  }
}

:root[data-theme='dark'] {
  --bg: #0e1113;
  --sidebar: #0b0f13;
  --surface: #121618;
  --surface-2: #0b0d0f;
  --ink: #f5f7fa;
  --muted: #9aa3ad;
  --line: #222c36;
  --primary: #eb1e24;
  --primary-soft: #341315;
  --insight: #20161a;
  --sleep: #8c76fd;
  --water: #38adfe;
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}

body {
  background: var(--bg);
  color: var(--ink);
  font: 1.2rem/1.5 var(--font);
  -webkit-font-smoothing: antialiased;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: default;
}

:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

h1,
h2,
h3 {
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

h1 {
  font-size: 2.6rem;
  font-weight: 700;
}

h2 {
  font-size: 1.8rem;
  font-weight: 700;
}

h3 {
  font-size: 1.3rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

p {
  margin: 0;
}

.muted {
  color: var(--muted);
}

.small {
  font-size: 1.05rem;
}

.error {
  color: var(--primary);
}

/* ---------- shell ---------- */

.app {
  display: grid;
  grid-template-columns: 18rem 1fr;
  height: 100%;
}

.app.bare {
  grid-template-columns: 1fr;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.6rem 1rem 1.4rem;
  background: var(--sidebar);
  border-right: 1px solid var(--line);
  min-height: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 0.8rem 2rem;
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.brand img {
  height: 2.6rem;
  width: auto;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 2.8rem;
  padding: 0 1rem;
  border: 0;
  border-radius: var(--r-sm);
  background: none;
  font-size: 1.1rem;
  text-align: left;
}

.nav-item:hover {
  background: var(--surface-2);
}

.nav-item[aria-current='page'] {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 500;
}

.sidebar-foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.main {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: var(--surface);
}

.page {
  max-width: 120rem;
  padding: 2.4rem 3.2rem 4rem;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.6rem;
  margin-bottom: 1.6rem;
}

.sub {
  margin-top: 0.4rem;
  color: var(--muted);
  font-size: 1.25rem;
}

/* ---------- panels and buttons ---------- */

.panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 1.6rem;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 1.3rem;
  font-weight: 600;
}

.panel-title svg {
  color: var(--primary);
  flex: none;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  height: 3.6rem;
  padding: 0 1.8rem;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
  font-weight: 500;
  white-space: nowrap;
}

.btn:hover:not(:disabled) {
  background: var(--surface-2);
}

.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--primary-ink);
}

.btn.primary:hover:not(:disabled) {
  background: var(--primary);
  filter: brightness(0.95);
}

.btn.lg {
  height: 4.2rem;
  padding: 0 3rem;
  font-size: 1.5rem;
}

.btn.sm {
  height: 2.6rem;
  padding: 0 1rem;
  font-size: 1.05rem;
}

.btn:disabled {
  opacity: 0.5;
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.link:disabled {
  opacity: 0.5;
}

/* ---------- period nav and tabs ---------- */

.period {
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  overflow: hidden;
}

.period button {
  display: grid;
  place-items: center;
  height: 3rem;
  min-width: 3rem;
  border: 0;
  background: var(--surface);
}

.period button + button,
.period .label + button {
  border-left: 1px solid var(--line);
}

.period .label {
  display: grid;
  place-items: center;
  min-width: 11rem;
  padding: 0 1rem;
  border-left: 1px solid var(--line);
  font-size: 1.05rem;
  font-weight: 500;
}

.period button:disabled {
  color: var(--muted);
  opacity: 0.5;
}

.tabs {
  display: flex;
  gap: 0.4rem;
  border-bottom: 1px solid var(--line);
  margin-bottom: 1.6rem;
}

.tab {
  padding: 0.8rem 1.4rem;
  margin-bottom: -1px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--muted);
  font-size: 1.1rem;
}

.tab[aria-selected='true'] {
  color: var(--ink);
  font-weight: 600;
  border-bottom-color: var(--primary);
}

/* ---------- banner, stats, insight ---------- */

.banner {
  position: relative;
  overflow: hidden;
  min-height: 10rem;
  padding: 1.8rem 2.2rem;
  margin-bottom: 1rem;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background-image:
    var(--banner-art), linear-gradient(100deg, var(--surface) 40%, var(--primary-soft) 100%);
  background-position: right center;
  background-repeat: no-repeat;
  background-size: contain, cover;
}

.banner .kicker {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.6rem;
  font-size: 1.15rem;
  font-weight: 600;
}

.banner .kicker svg {
  color: var(--primary);
}

.banner h2 {
  font-size: 2.2rem;
  max-width: 34rem;
}

.banner p {
  margin-top: 0.6rem;
  max-width: 44rem;
  color: var(--muted);
  font-size: 1.15rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.4rem 1.6rem;
}

.stat svg {
  color: var(--primary);
}

.stat[data-tone='sleep'] svg {
  color: var(--sleep);
}

.stat[data-tone='water'] svg {
  color: var(--water);
}

.stat .value {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.stat .label {
  color: var(--muted);
  font-size: 1.05rem;
}

.insight {
  padding: 1.6rem 1.8rem;
  border-radius: var(--r-lg);
  background: var(--insight);
}

.insight h3 {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.8rem;
  font-size: 1.5rem;
}

.insight h3 svg {
  color: var(--warm);
}

.note {
  margin-top: 1rem;
  color: var(--muted);
  font-size: 1.05rem;
}

/* ---------- bar cards and charts ---------- */

.bar-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.figure {
  text-align: right;
}

.figure .value {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.1;
}

.figure .unit {
  color: var(--muted);
  font-size: 1rem;
}

.bar-card[data-compact='true'] .figure {
  text-align: left;
}

.bar-card[data-compact='true'] .bar-card-head {
  flex-direction: column;
}

.weight-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.weight-figure {
  text-align: right;
}

.weight-figure .value {
  font-size: 2.4rem;
  font-weight: 700;
}

.empty {
  padding: 2rem 0;
  color: var(--muted);
  font-size: 1.15rem;
}

/* ---------- metrics and lists ---------- */

.metric {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--line);
  font-size: 1.15rem;
}

.metric:last-child {
  border-bottom: 0;
}

.metric svg {
  color: var(--muted);
}

.metric .v {
  margin-left: auto;
  font-weight: 600;
}

.checks {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.2rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 1.15rem;
}

.checks li {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.checks svg {
  color: var(--good);
  flex: none;
}

.dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.6rem 2rem;
  margin: 1rem 0 0;
  font-size: 1.15rem;
}

.dl dt {
  color: var(--muted);
}

.dl dd {
  margin: 0;
}

.theme-opts {
  display: grid;
  grid-template-columns: repeat(3, 9.6rem);
  gap: 1rem;
  margin-top: 1rem;
}

.theme-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  height: 6.4rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  font-size: 1.05rem;
}

.theme-opt[aria-pressed='true'] {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary);
}

/* ---------- AI chip ---------- */

.ai-chip {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  color: var(--muted);
  font-size: 1rem;
  line-height: 1.3;
}

.ai-chip[data-state='ready'] svg {
  color: var(--good);
}

.ai-chip[data-state='loading'] svg {
  animation: pulse 1.4s ease-in-out infinite;
}

.ai-chip[data-state='error'] svg {
  color: var(--primary);
}

@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}

/* ---------- onboarding ---------- */

.onboard {
  min-height: 100%;
  background: var(--surface);
}

.onboard-top {
  display: flex;
  align-items: center;
  gap: 3rem;
  padding: 2rem 3.2rem;
}

.onboard-top .brand {
  padding: 0;
}

.steps {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: auto;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  color: var(--muted);
  font-size: 1.05rem;
}

.step .num {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border: 1px solid var(--line);
  border-radius: 50%;
  font-size: 1.05rem;
}

.step[data-state='current'] {
  color: var(--ink);
  font-weight: 500;
}

.step[data-state='current'] .num,
.step[data-state='done'] .num {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--primary-ink);
}

.steps .sep {
  width: 2.4rem;
  height: 1px;
  background: var(--line);
}

.onboard-body {
  max-width: 100rem;
  padding: 1.6rem 3.2rem 3.2rem;
}

.onboard-body h1 {
  font-size: 3.2rem;
}

.onboard-body .sub {
  font-size: 1.5rem;
  max-width: 56rem;
}

.welcome h1 {
  font-size: 4rem;
}

.welcome h1 em {
  font-style: normal;
  color: var(--primary);
}

.welcome .lead {
  margin-top: 1.6rem;
  color: var(--muted);
  font-size: 2rem;
  font-weight: 500;
  line-height: 1.4;
}

.welcome p {
  margin-top: 1.6rem;
  max-width: 48rem;
  color: var(--muted);
  font-size: 1.5rem;
}

.form-panel {
  margin-top: 1.6rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.6rem 2.4rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.field.wide {
  grid-column: 1 / -1;
}

.field label,
.field .label {
  font-size: 1.15rem;
  font-weight: 500;
}

.field .label .muted {
  font-weight: 400;
}

.field input {
  height: 3.6rem;
  padding: 0 1.2rem;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
  font-size: 1.25rem;
}

.field .hint {
  color: var(--muted);
  font-size: 1.05rem;
}

.with-unit {
  position: relative;
}

.with-unit input {
  width: 100%;
  padding-right: 4rem;
}

.with-unit span {
  position: absolute;
  right: 1.2rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 1.15rem;
}

.radios {
  display: flex;
  gap: 2.4rem;
  align-items: center;
  height: 3.6rem;
  font-size: 1.25rem;
}

.radios label {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-weight: 400;
}

.radios input {
  width: 1.8rem;
  height: 1.8rem;
  accent-color: var(--primary);
}

.choice-group {
  margin-top: 1.6rem;
}

.choice-group > .label {
  display: block;
  margin-bottom: 0.8rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1rem;
}

.choice {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-height: 4.6rem;
  padding: 0.8rem 1.2rem;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
  text-align: left;
}

.choice .tick {
  display: grid;
  place-items: center;
  flex: none;
  width: 1.8rem;
  height: 1.8rem;
  border: 1.5px solid var(--line);
  border-radius: 50%;
}

.choice[aria-checked='true'] {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.choice[aria-checked='true'] .tick {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--primary-ink);
}

.choice .title {
  font-size: 1.15rem;
  font-weight: 500;
}

.choice .desc {
  color: var(--muted);
  font-size: 1rem;
}

.review {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 1.2rem;
  margin-top: 1.6rem;
}

.review-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.privacy-banner {
  display: flex;
  gap: 1.2rem;
  align-items: center;
  margin-top: 1.2rem;
  padding: 1.2rem 1.6rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--primary-soft);
  font-size: 1.1rem;
}

.privacy-banner svg {
  color: var(--primary);
  flex: none;
}

.wizard-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2.4rem;
}

/* ---------- talk (chat) ---------- */

.talk {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
}

.talk-head {
  padding: 2.4rem 3.2rem 1.2rem;
}

.thread {
  overflow: auto;
  min-height: 0;
}

.thread-inner {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  max-width: 86rem;
  padding: 0.8rem 3.2rem 2rem;
}

.you {
  align-self: flex-end;
  max-width: 64%;
  padding: 1rem 1.4rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface-2);
  font-size: 1.15rem;
  white-space: pre-wrap;
}

.msg {
  display: flex;
  gap: 1.2rem;
  align-items: flex-start;
}

.avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.avatar img {
  width: 2.4rem;
  height: auto;
}

.msg-body {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-width: 0;
  max-width: 64rem;
}

.vox {
  padding: 1.2rem 1.6rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  font-size: 1.15rem;
}

.vox .meta {
  margin-top: 0.8rem;
  color: var(--muted);
  font-size: 1rem;
}

.thinking {
  color: var(--muted);
}

.safety {
  padding: 1.2rem 1.6rem;
  border: 1px solid var(--line);
  border-left: 3px solid var(--water);
  border-radius: var(--r-md);
  background: var(--surface-2);
  font-size: 1.15rem;
}

.safety h3 {
  margin-bottom: 0.4rem;
}

.empty-log h2 {
  font-size: 2rem;
}

.empty-log p {
  margin-top: 0.6rem;
  max-width: 56rem;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  max-width: 86rem;
  padding: 0 3.2rem 1rem;
}

.example {
  height: 3rem;
  padding: 0 1.2rem;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
  font-size: 1.05rem;
}

.example:hover:not(:disabled) {
  background: var(--surface-2);
}

.composer {
  padding: 0 3.2rem 1.6rem;
  max-width: 86rem;
}

.composer-inner {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem 0.6rem 0.6rem 1.4rem;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--surface);
}

.composer-inner:focus-within {
  border-color: var(--primary);
}

.composer textarea {
  flex: 1;
  min-height: 2.4rem;
  max-height: 12rem;
  padding: 0.6rem 0;
  border: 0;
  outline: none;
  resize: none;
  background: transparent;
  font-size: 1.2rem;
}

.composer-hint {
  margin: 0.6rem 0 0;
  color: var(--muted);
  font-size: 1rem;
  text-align: center;
}

.round {
  display: grid;
  place-items: center;
  flex: none;
  width: 3.6rem;
  height: 3.6rem;
  border: 0;
  border-radius: 50%;
}

.round.send {
  background: var(--primary);
  color: var(--primary-ink);
}

.round.mic {
  background: var(--surface-2);
  color: var(--ink);
}

.round.mic[data-recording='true'] {
  background: var(--primary);
  color: var(--primary-ink);
}

.round:disabled {
  opacity: 0.5;
}

.mic-wrap {
  position: relative;
}

.mic-status {
  display: none;
  position: absolute;
  right: 0;
  bottom: calc(100% + 1rem);
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: 1rem;
  white-space: nowrap;
}

.mic-status[data-active='true'] {
  display: block;
}

/* ---------- confirm card (markup in ConfirmCard.tsx) ---------- */

.card {
  max-width: 60rem;
  padding: 1.4rem 1.6rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
}

.card h3 {
  margin-bottom: 0.4rem;
  font-size: 1.3rem;
}

.row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1.2rem;
  align-items: center;
  margin-top: 0.8rem;
  padding: 1rem 1.2rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
}

.row[data-unmatched='true'] {
  border-style: dashed;
}

.row .name {
  font-size: 1.25rem;
  font-weight: 600;
}

.row .said {
  color: var(--muted);
  font-size: 1rem;
}

.stepper {
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  overflow: hidden;
}

.stepper button {
  width: 2.8rem;
  height: 3rem;
  border: 0;
  background: var(--surface-2);
}

.stepper input {
  width: 4.6rem;
  height: 3rem;
  border: 0;
  background: var(--surface);
  text-align: center;
}

.unit-select {
  height: 3rem;
  padding: 0 0.6rem;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
}

.remove {
  width: 2.8rem;
  height: 2.8rem;
  border: 0;
  border-radius: var(--r-sm);
  background: none;
  color: var(--muted);
  font-size: 1.6rem;
}

.remove:hover {
  background: var(--surface-2);
}

.remove.small {
  width: 2rem;
  height: 2rem;
  font-size: 1.3rem;
}

.candidates {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.candidate {
  height: 2.6rem;
  padding: 0 1rem;
  border: 1px solid var(--line);
  border-radius: 99rem;
  background: var(--surface-2);
  font-size: 1.05rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 2.8rem;
  padding: 0 0.4rem 0 1rem;
  border: 1px solid var(--line);
  border-radius: 99rem;
  background: var(--surface-2);
  font-size: 1.05rem;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 1.4rem;
  margin-top: 1.4rem;
}

/* ---------- model error screen ---------- */

.setup {
  max-width: 60rem;
  margin: 8rem auto;
}

.setup .brand {
  padding: 0 0 2rem;
}

.setup h1 {
  font-size: 2.4rem;
}

.setup p {
  margin-top: 1rem;
  font-size: 1.25rem;
}

.setup pre {
  margin-top: 1.6rem;
  padding: 1.2rem;
  border-radius: var(--r-sm);
  background: var(--surface-2);
  color: var(--muted);
  white-space: pre-wrap;
  font-size: 1rem;
}
```

- [ ] **Step 2: Check it still builds**

Run: `npm run typecheck && npm test`
Expected: PASS. (The old screens will look unstyled in places until Tasks 6–10 replace them; `main` is not affected because this is a branch.)

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/styles.css
git commit -m "style(renderer): add wireframe design tokens for light and dark"
```

---

### Task 6: Shell, sidebar, brand, AI chip, mic restyle

**Files:**
- Create: `src/renderer/src/components/Brand.tsx`, `src/renderer/src/components/Sidebar.tsx`
- Modify: `src/renderer/src/components/AiChip.tsx`, `src/renderer/src/components/MicButton.tsx`
- Rewrite: `src/renderer/src/App.tsx`

**Interfaces:**
- Consumes: `useVox` (`screen`, `setScreen`, `ai`, `profile`, `profileLoaded`, `setProfile`, `setAi`), `Screen`.
- Produces: `<Brand />`, `<Sidebar />`, `<AiChip status />` (same props as before). `App` routes to
  `Onboarding`, `Talk`, `Dashboard`, `Progress`, `Settings`, `Setup`. Until Tasks 7–10 land, App
  keeps using the old screens (step 4 below), so every commit runs.

- [ ] **Step 1: `Brand.tsx`**

```tsx
import mark from '../assets/logo-mark.png'

// The panther mark and wordmark used in the sidebar, onboarding and error screens.
export function Brand({ upper = false }: { upper?: boolean }): React.JSX.Element {
  return (
    <div className="brand">
      <img src={mark} alt="" />
      <span>{upper ? 'VOX' : 'vox'}</span>
    </div>
  )
}
```

The wireframes use lowercase "vox" in the app sidebar and uppercase "VOX" in onboarding.

- [ ] **Step 2: `Sidebar.tsx`**

```tsx
import { CalendarDays, ChartNoAxesColumnIncreasing, MessageSquare, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useVox, type Screen } from '../store'
import { AiChip } from './AiChip'
import { Brand } from './Brand'

const DASHBOARD: Screen[] = ['today', 'weekly', 'monthly']

const ITEMS: { id: Screen; label: string; icon: LucideIcon; match: Screen[] }[] = [
  { id: 'talk', label: 'Talk to VOX', icon: MessageSquare, match: ['talk'] },
  { id: 'today', label: 'Today · Weekly · Monthly', icon: CalendarDays, match: DASHBOARD },
  { id: 'progress', label: 'Progress', icon: ChartNoAxesColumnIncreasing, match: ['progress'] }
]

export function Sidebar(): React.JSX.Element {
  const { screen, setScreen, ai } = useVox()
  const item = (id: Screen, label: string, Icon: LucideIcon, match: Screen[]): React.JSX.Element => (
    <button
      key={id}
      className="nav-item"
      aria-current={match.includes(screen) ? 'page' : undefined}
      onClick={() => setScreen(id)}
    >
      <Icon size={17} aria-hidden="true" />
      {label}
    </button>
  )
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="nav" aria-label="Screens">
        {ITEMS.map((i) => item(i.id, i.label, i.icon, i.match))}
      </nav>
      <div className="sidebar-foot">
        <AiChip status={ai} />
        {item('settings', 'Settings', Settings, ['settings'])}
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Rewrite `AiChip.tsx`**

```tsx
import { Cpu } from 'lucide-react'
import type { AiStatus } from '@shared/status'

const LABEL: Record<AiStatus['state'], string> = {
  loading: 'Loading AI on this computer…',
  ready: 'AI running on this computer',
  error: 'AI not loaded'
}

// Visible on every screen: the language model runs inside this app, offline.
export function AiChip({ status }: { status: AiStatus }): React.JSX.Element {
  return (
    <div className="ai-chip" data-state={status.state} title={status.message ?? ''}>
      <Cpu size={16} aria-hidden="true" />
      <span>{LABEL[status.state]}</span>
    </div>
  )
}
```

- [ ] **Step 4: `MicButton.tsx` – icon and status visibility only**

Add `import { Mic } from 'lucide-react'`. Replace the `<svg …>…</svg>` inside the button with
`<Mic size={18} aria-hidden="true" />`. Replace the status span with:

```tsx
      <span
        className="mic-status"
        role="status"
        data-active={Boolean(error) || phase !== 'idle' || stt !== 'ready'}
      >
        {error || label}
      </span>
```

No other logic changes.

- [ ] **Step 5: Rewrite `App.tsx` (temporarily using the old screens)**

```tsx
import { useEffect } from 'react'
import { useVox } from './store'
import { Sidebar } from './components/Sidebar'
import { Setup } from './screens/Setup'
import { ProfileScreen } from './screens/Profile'
import { LogScreen } from './screens/Log'
import { TodayScreen } from './screens/Today'

function App(): React.JSX.Element {
  const { screen, setAi, ai, profile, profileLoaded, setProfile } = useVox()

  useEffect(() => {
    const off = window.vox.ai.onStatus(setAi)
    window.vox.ai.status().then(setAi)
    window.vox.profile.get().then(setProfile)
    return off
  }, [setAi, setProfile])

  if (ai.state === 'error')
    return (
      <div className="app bare">
        <main className="main">
          <Setup status={ai} />
        </main>
      </div>
    )
  if (!profileLoaded) return <div className="app bare" />
  if (!profile || screen === 'onboarding')
    return (
      <div className="app bare">
        <main className="main">
          <ProfileScreen />
        </main>
      </div>
    )

  let body: React.JSX.Element
  if (screen === 'today' || screen === 'weekly' || screen === 'monthly') body = <TodayScreen />
  else body = <LogScreen />

  return (
    <div className="app">
      <Sidebar />
      <main className="main">{body}</main>
    </div>
  )
}

export default App
```

- [ ] **Step 6: Check and look**

Run: `npm run typecheck && npm run lint && npm test`, then `npm run dev:mock`. The sidebar with
the panther mark, nav, AI chip and Settings appears in both themes (toggle macOS appearance).
Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/App.tsx src/renderer/src/components
git commit -m "feat(renderer): add the sidebar shell from the wireframes"
```

---

### Task 7: Onboarding wizard

**Files:**
- Create: `src/renderer/src/components/Steps.tsx`, `src/renderer/src/components/ChoiceCard.tsx`, `src/renderer/src/screens/Onboarding.tsx`
- Delete: `src/renderer/src/screens/Profile.tsx`
- Modify: `src/renderer/src/App.tsx` (use `Onboarding`)

**Interfaces:**
- Consumes: `ProfileInput`, `ActivityLevel` (`@shared/schemas`), `ageMode` (`@shared/profile`), `ageYears` (`@shared/calc`), `useVox` (`profile`, `setProfile`, `setScreen`), `Brand`.
- Produces: `<Onboarding />`; `<Steps current={0|1|2|3} />`; `<ChoiceCard checked title desc onSelect />`.

- [ ] **Step 1: `Steps.tsx`**

```tsx
import { Fragment } from 'react'
import { Check } from 'lucide-react'

export const STEP_NAMES = ['Welcome', 'Personal Info', 'Fitness Setup', 'Review'] as const

export function Steps({ current }: { current: number }): React.JSX.Element {
  return (
    <ol className="steps" aria-label="Setup steps" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {STEP_NAMES.map((name, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        return (
          <Fragment key={name}>
            {i > 0 && <li className="sep" aria-hidden="true" />}
            <li className="step" data-state={state} aria-current={i === current ? 'step' : undefined}>
              <span className="num">{state === 'done' ? <Check size={14} aria-hidden="true" /> : i + 1}</span>
              {name}
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
```

- [ ] **Step 2: `ChoiceCard.tsx`**

```tsx
import { Check } from 'lucide-react'

// One option in a single-choice group (activity level, goal). Rendered as a radio.
export function ChoiceCard(props: {
  checked: boolean
  title: string
  desc?: string
  onSelect: () => void
}): React.JSX.Element {
  const { checked, title, desc, onSelect } = props
  return (
    <button type="button" role="radio" aria-checked={checked} className="choice" onClick={onSelect}>
      <span className="tick">{checked && <Check size={12} aria-hidden="true" />}</span>
      <span>
        <span className="title" style={{ display: 'block' }}>
          {title}
        </span>
        {desc && <span className="desc">{desc}</span>}
      </span>
    </button>
  )
}
```

- [ ] **Step 3: `Onboarding.tsx`**

Goal and activity lists are copied unchanged from the old `Profile.tsx`; activity labels are split
into title + description at the existing colon so no wording changes.

```tsx
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react'
import { ProfileInput, type ActivityLevel } from '@shared/schemas'
import { ageMode } from '@shared/profile'
import { ageYears } from '@shared/calc'
import { useVox } from '../store'
import { Brand } from '../components/Brand'
import { Steps } from '../components/Steps'
import { ChoiceCard } from '../components/ChoiceCard'

const TEEN_GOALS = ['Feel more energetic', 'Get fitter', 'Get stronger', 'Sleep better', 'Build a habit']
const ADULT_GOALS = [...TEEN_GOALS, 'Manage my weight']

const LEVELS: { id: ActivityLevel; title: string; desc?: string }[] = [
  { id: 'sedentary', title: 'Mostly sitting' },
  { id: 'light', title: 'Light', desc: 'some walking' },
  { id: 'moderate', title: 'Moderate', desc: 'exercise 3–5 days a week' },
  { id: 'active', title: 'Active', desc: 'exercise 6–7 days a week' },
  { id: 'very_active', title: 'Very active', desc: 'physical job or training' }
]

const SEX: { id: Form['sexForFormula']; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'unspecified', label: 'Prefer not to say' }
]

type Form = {
  nickname: string
  birthDate: string
  sexForFormula: 'male' | 'female' | 'unspecified'
  heightCm: string
  weightKg: string
  activityLevel: ActivityLevel
  goal: string
}

const cleanError = (err: unknown): string =>
  String(err).replace(/^Error: (Error invoking remote method '[^']+': )?(Error: )?/, '')

const longDob = (d: string): string =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// Four steps instead of one long form. Saved only on this computer.
export function Onboarding(): React.JSX.Element {
  const { profile, setProfile, setScreen } = useVox()
  const editing = profile !== null
  const [step, setStep] = useState(editing ? 3 : 0)
  const [form, setForm] = useState<Form>({
    nickname: profile?.nickname ?? '',
    birthDate: profile?.birthDate ?? '',
    sexForFormula: profile?.sexForFormula ?? 'unspecified',
    heightCm: profile ? String(profile.heightCm) : '',
    weightKg: profile ? String(profile.weightKg) : '',
    activityLevel: profile?.activityLevel ?? 'light',
    goal: profile?.goal ?? 'Build a habit'
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const mode = /^\d{4}-\d{2}-\d{2}$/.test(form.birthDate) ? ageMode(form.birthDate) : null
  const goals = mode === 'teen' ? TEEN_GOALS : ADULT_GOALS
  const goal = goals.includes(form.goal) ? form.goal : goals[0]
  const set = <K extends keyof Form>(k: K, v: Form[K]): void => setForm((f) => ({ ...f, [k]: v }))

  const parsed = (): ReturnType<typeof ProfileInput.safeParse> =>
    ProfileInput.safeParse({
      ...form,
      goal,
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg)
    })

  // Personal Info must be valid before moving on; the schema is the single source of rules.
  const next = (): void => {
    setError('')
    if (step === 1) {
      if (mode === 'blocked') return setError('Vox is for ages 13 and up.')
      const r = parsed()
      const issue = r.success
        ? undefined
        : r.error.issues.find((i) => ['nickname', 'birthDate', 'heightCm', 'weightKg'].includes(String(i.path[0])))
      if (issue) return setError(`Check ${String(issue.path[0])}: ${issue.message}`)
    }
    setStep((s) => s + 1)
  }

  const save = async (): Promise<void> => {
    setError('')
    if (mode === 'blocked') return setError('Vox is for ages 13 and up.')
    const input = parsed()
    if (!input.success) {
      const issue = input.error.issues[0]
      return setError(`Check ${String(issue.path[0] ?? 'the form')}: ${issue.message}`)
    }
    setSaving(true)
    try {
      setProfile(await window.vox.profile.save(input.data))
      setScreen('talk')
    } catch (err) {
      setError(cleanError(err))
    } finally {
      setSaving(false)
    }
  }

  const level = LEVELS.find((l) => l.id === form.activityLevel)

  return (
    <div className="onboard">
      <header className="onboard-top">
        <Brand upper />
        <Steps current={step} />
      </header>
      <div className="onboard-body">
        {step === 0 && (
          <section className="welcome">
            <h1>
              Welcome to <em>VOX</em>
            </h1>
            <p className="lead">
              Your AI fitness coach.
              <br />
              Say what you did, see your day.
            </p>
            <p>Lahat ng data mo, nasa computer mo lang. Nothing is uploaded.</p>
          </section>
        )}

        {step === 1 && (
          <section>
            <h1>Tell us about yourself</h1>
            <p className="sub">This helps VOX estimate your energy use and tailor its replies.</p>
            <div className="panel form-panel">
              <div className="field wide">
                <label htmlFor="nickname">Name / Nickname</label>
                <input id="nickname" value={form.nickname} maxLength={30} onChange={(e) => set('nickname', e.target.value)} />
                <span className="hint">This is how VOX will address you.</span>
              </div>
              <div className="field">
                <label htmlFor="birthDate">Date of Birth</label>
                <input id="birthDate" type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
                {mode === 'teen' && (
                  <span className="hint">Teen mode: Vox tracks activity, water and sleep, without calories or weight.</span>
                )}
                {mode === 'blocked' && <span className="hint">Vox is for ages 13 and up.</span>}
              </div>
              {mode !== 'teen' && (
                <div className="field" role="radiogroup" aria-labelledby="sex-label">
                  <span className="label" id="sex-label">
                    Sex <span className="muted">(for calculations)</span>
                  </span>
                  <div className="radios">
                    {SEX.map((s) => (
                      <label key={s.id}>
                        <input
                          type="radio"
                          name="sex"
                          checked={form.sexForFormula === s.id}
                          onChange={() => set('sexForFormula', s.id)}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                  {form.sexForFormula === 'unspecified' && (
                    <span className="hint">Prefer not to say turns calorie estimates off.</span>
                  )}
                </div>
              )}
              <div className="field">
                <label htmlFor="height">Height</label>
                <div className="with-unit">
                  <input id="height" type="number" inputMode="decimal" min={100} max={250} value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} />
                  <span>cm</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="weight">Weight</label>
                <div className="with-unit">
                  <input id="weight" type="number" inputMode="decimal" min={25} max={300} step="0.1" value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} />
                  <span>kg</span>
                </div>
                <span className="hint">Used to estimate exercise energy.</span>
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1>Set up your fitness plan</h1>
            <p className="sub">Tell us about your activity level and goal so VOX can tailor its replies.</p>
            <div className="choice-group" role="radiogroup" aria-labelledby="level-label">
              <span className="label" id="level-label">Activity level</span>
              <div className="choices">
                {LEVELS.map((l) => (
                  <ChoiceCard key={l.id} checked={form.activityLevel === l.id} title={l.title} desc={l.desc} onSelect={() => set('activityLevel', l.id)} />
                ))}
              </div>
            </div>
            <div className="choice-group" role="radiogroup" aria-labelledby="goal-label">
              <span className="label" id="goal-label">Primary goal</span>
              <div className="choices">
                {goals.map((g) => (
                  <ChoiceCard key={g} checked={goal === g} title={g} onSelect={() => set('goal', g)} />
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1>Review your profile</h1>
            <p className="sub">Make sure everything looks good. You can always update this later in Settings.</p>
            <div className="review">
              <div className="stack">
                <div className="panel">
                  <div className="review-head">
                    <h3>Personal Information</h3>
                    <button className="btn sm" onClick={() => setStep(1)}>Edit</button>
                  </div>
                  <dl className="dl">
                    <dt>Name / Nickname</dt>
                    <dd>{form.nickname}</dd>
                    <dt>Date of Birth</dt>
                    <dd>{form.birthDate && `${longDob(form.birthDate)} (${ageYears(form.birthDate)} years old)`}</dd>
                    {mode !== 'teen' && (
                      <>
                        <dt>Sex</dt>
                        <dd>{SEX.find((s) => s.id === form.sexForFormula)?.label}</dd>
                      </>
                    )}
                    <dt>Height</dt>
                    <dd>{form.heightCm} cm</dd>
                    <dt>Weight</dt>
                    <dd>{form.weightKg} kg</dd>
                  </dl>
                </div>
                <div className="panel">
                  <div className="review-head">
                    <h3>Fitness Settings</h3>
                    <button className="btn sm" onClick={() => setStep(2)}>Edit</button>
                  </div>
                  <dl className="dl">
                    <dt>Activity Level</dt>
                    <dd>{level ? (level.desc ? `${level.title} (${level.desc})` : level.title) : ''}</dd>
                    <dt>Primary Goal</dt>
                    <dd>{goal}</dd>
                  </dl>
                </div>
              </div>
              <div className="panel">
                <h3>You’re ready to go!</h3>
                <p className="sub">
                  Vox is not medical advice. Every energy number is an estimate from published tables. For health
                  concerns, talk to a doctor.
                </p>
              </div>
            </div>
            <div className="privacy-banner">
              <Lock size={18} aria-hidden="true" />
              <div>
                <strong>Your data stays on this computer</strong>
                <div className="muted">Lahat ng data mo, nasa computer mo lang. Nothing is uploaded.</div>
              </div>
            </div>
          </section>
        )}

        {error && (
          <p className="error" role="alert" style={{ marginTop: '1.2rem' }}>
            {error}
          </p>
        )}

        <div className="wizard-actions">
          {step > 0 ? (
            <button className="btn" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
            {editing && (
              <button className="link" onClick={() => setScreen('settings')}>
                Cancel
              </button>
            )}
            {step < 3 ? (
              <button className={`btn primary ${step === 0 ? 'lg' : ''}`} onClick={next}>
                {step === 0 ? 'Let’s get started' : 'Next'} <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button className="btn primary" disabled={saving || mode === 'blocked'} onClick={save}>
                {saving ? 'Saving…' : 'Save Profile'} <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

Run Prettier on the file after writing (`npx prettier --write src/renderer/src/screens/Onboarding.tsx src/renderer/src/components`), since lines above are wrapped for reading.

- [ ] **Step 4: Wire it in and delete the old form**

In `App.tsx` replace the `ProfileScreen` import/usage with `Onboarding` from `./screens/Onboarding`.
`git rm src/renderer/src/screens/Profile.tsx`. Search for leftovers: `grep -rn "ProfileScreen\|screens/Profile" src` → no results.

- [ ] **Step 5: Check**

Run: `npm run typecheck && npm run lint && npm test`. Then `npm run dev:mock` with a fresh user-data
folder (or delete the profile file the store uses) and walk through: empty name blocks Next with a
"Check nickname" message; a 2015 birth date shows the under-13 block; a 2010 date hides Sex and the
"Manage my weight" goal; an adult save lands on Talk. Settings → Edit is checked in Task 10.

- [ ] **Step 6: Commit**

```bash
git add -A src/renderer/src
git commit -m "feat(renderer): replace the profile form with the four-step onboarding"
```

---

### Task 8: Talk to VOX

**Files:**
- Create: `src/renderer/src/screens/Talk.tsx`
- Delete: `src/renderer/src/screens/Log.tsx`
- Modify: `src/renderer/src/App.tsx`

**Interfaces:**
- Consumes: `useVox` (`turns`, `addTurn`, `updateTurn`, `ai`, `profile`), `Turn`, `ConfirmCard`, `MicButton`, logo mark.
- Produces: `<Talk />`.

- [ ] **Step 1: Write `Talk.tsx`**

All logic (`send`, `confirm`, `cleanError`, `TurnView`, `Reaction`) is moved from `Log.tsx`
unchanged; only markup and classes change.

```tsx
import { useEffect, useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import type { ConfirmInput, ConfirmResult } from '@shared/schemas'
import { useVox, type Turn } from '../store'
import { ConfirmCard } from '../components/ConfirmCard'
import { MicButton } from '../components/MicButton'
import mark from '../assets/logo-mark.png'

const EXAMPLES = [
  'Nag-jog ako ng 30 minutes kanina',
  'nag basketball kami 2 hours tapos 3 baso ng tubig',
  '7 hrs tulog ko kagabi'
]

const cleanError = (err: unknown): string =>
  String(err).replace(/^Error: (Error invoking remote method '[^']+': )?(Error: )?/, '')

function VoxMsg({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="msg">
      <span className="avatar">
        <img src={mark} alt="VOX" />
      </span>
      <div className="msg-body">{children}</div>
    </div>
  )
}

export function Talk(): React.JSX.Element {
  const { turns, addTurn, updateTurn, ai, profile } = useVox()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const busy = turns.some((t) => t.state === 'parsing' || t.state === 'confirming')

  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [turns])

  const send = async (raw = text): Promise<void> => {
    const note = raw.trim()
    if (!note || busy) return
    setText('')
    const id = addTurn(note)
    try {
      const result = await window.vox.log.parse(note)
      if (result.ok) updateTurn(id, { state: 'card', result })
      else updateTurn(id, { state: result.safety === 'crisis' ? 'crisis' : 'failed', result })
    } catch (err) {
      updateTurn(id, { state: 'failed', error: cleanError(err) })
    }
  }

  const confirm = async (turn: Turn, input: ConfirmInput): Promise<void> => {
    updateTurn(turn.id, { state: 'confirming' })
    try {
      updateTurn(turn.id, { state: 'done', confirmed: await window.vox.log.confirm(input) })
    } catch (err) {
      updateTurn(turn.id, { state: 'card', error: cleanError(err) })
    }
  }

  const ready = ai.state === 'ready'

  return (
    <div className="talk">
      <header className="talk-head">
        <h1>Talk to VOX</h1>
        <p className="sub">Your AI fitness coach. Log what you ate, how you moved and how you slept.</p>
      </header>
      <div className="thread">
        <div className="thread-inner">
          {turns.length === 0 && (
            <VoxMsg>
              <div className="vox empty-log">
                <h2>Ano ginawa mo today, {profile?.nickname}?</h2>
                <p className="muted">
                  Say or type what you ate, how you moved, how you slept. Vox works it out on this computer and asks
                  you to check before saving.
                </p>
              </div>
            </VoxMsg>
          )}
          {turns.map((t) => (
            <TurnView
              key={t.id}
              turn={t}
              onConfirm={(i) => confirm(t, i)}
              onDiscard={() => updateTurn(t.id, { state: 'skipped' })}
            />
          ))}
          <div ref={end} />
        </div>
      </div>
      <div>
        <div className="suggestions">
          {EXAMPLES.map((e) => (
            <button key={e} className="example" disabled={!ready || busy} onClick={() => send(e)}>
              {e}
            </button>
          ))}
        </div>
        <div className="composer">
          <div className="composer-inner">
            <textarea
              aria-label="What did you do today?"
              placeholder={ready ? 'Message VOX…' : 'Loading AI on this computer…'}
              rows={1}
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <MicButton disabled={busy} onTranscript={(t) => setText((cur) => (cur ? `${cur} ${t}` : t))} />
            <button className="round send" aria-label="Send" disabled={!ready || busy || !text.trim()} onClick={() => send()}>
              <SendHorizontal size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="composer-hint">Enter to send. Hold the mic (or Space) to talk. Nothing leaves this computer.</p>
        </div>
      </div>
    </div>
  )
}

function TurnView({
  turn,
  onConfirm,
  onDiscard
}: {
  turn: Turn
  onConfirm: (i: ConfirmInput) => void
  onDiscard: () => void
}): React.JSX.Element {
  const r = turn.result
  return (
    <>
      <div className="you">{turn.text}</div>
      {turn.state === 'parsing' && (
        <VoxMsg>
          <div className="vox thinking">Thinking on this computer…</div>
        </VoxMsg>
      )}
      {turn.state === 'crisis' && r && !r.ok && (
        <VoxMsg>
          <div className="safety" role="alert">
            <h3>Nandito kami para sa’yo</h3>
            <p>{r.reason}</p>
          </div>
        </VoxMsg>
      )}
      {turn.state === 'failed' && (
        <VoxMsg>
          <div className="vox">{r && !r.ok ? r.reason : `Something went wrong: ${turn.error}`}</div>
        </VoxMsg>
      )}
      {(r?.ok && r.safetyMessage && turn.state !== 'skipped') ||
      (r?.ok && (turn.state === 'card' || turn.state === 'confirming')) ? (
        <VoxMsg>
          {r?.ok && r.safetyMessage && turn.state !== 'skipped' && (
            <div className="safety" role="alert">
              <p>{r.safetyMessage}</p>
            </div>
          )}
          {r?.ok && (turn.state === 'card' || turn.state === 'confirming') && (
            <>
              {turn.error && <p className="error">{turn.error}</p>}
              <ConfirmCard
                result={r}
                rawText={turn.text}
                busy={turn.state === 'confirming'}
                onConfirm={onConfirm}
                onCancel={onDiscard}
              />
            </>
          )}
        </VoxMsg>
      ) : null}
      {turn.state === 'skipped' && (
        <VoxMsg>
          <div className="vox muted">Discarded. Nothing was saved.</div>
        </VoxMsg>
      )}
      {turn.state === 'done' && turn.confirmed && (
        <VoxMsg>
          <Reaction result={turn.confirmed} />
        </VoxMsg>
      )}
    </>
  )
}

function Reaction({ result }: { result: ConfirmResult }): React.JSX.Element {
  const { entry, reaction } = result
  const lines = entry.facts.items.map((i) => {
    const amount = i.minutes !== undefined ? `${i.minutes} min, ${i.intensity}` : i.quantityLabel
    const kcal = i.kcal !== undefined ? `, ~${i.kcal} kcal estimate` : ''
    return `${i.displayName} (${amount}${kcal})`
  })
  return (
    <div className="vox">
      <p>{reaction.text}</p>
      <div className="meta">
        {lines.length > 0 && <div>Saved: {lines.join('; ')}.</div>}
        {reaction.source === 'ai' ? (
          <div>Written by the AI on this computer, numbers checked against the facts.</div>
        ) : (
          <details>
            <summary>Template reply</summary>
            {reaction.rejectedReason
              ? `The AI reply was replaced: ${reaction.rejectedReason}`
              : 'The AI was not used for this reply.'}
          </details>
        )}
      </div>
    </div>
  )
}
```

Behaviour notes for the reviewer: the old screen swapped the mic for the send button when text was
present; the wireframe shows both, so both are shown and Send is disabled while empty. The example
chips now stay visible (wireframe), still disabled while the AI loads or a turn is busy.

- [ ] **Step 2: Wire in, delete `Log.tsx`, prettier**

In `App.tsx` import `Talk` and use it as the default body. `git rm src/renderer/src/screens/Log.tsx`.
`grep -rn "LogScreen\|screens/Log'" src` → no results. `npx prettier --write src/renderer/src/screens/Talk.tsx`.

- [ ] **Step 3: Check**

`npm run typecheck && npm run lint && npm test`. In `npm run dev:mock`: send an example → card →
Confirm → reaction with "Saved: …"; Discard shows "Discarded. Nothing was saved."; a crisis
phrase from `tests/safety.test.ts` shows the safety block (same text as before).

- [ ] **Step 4: Commit**

```bash
git add -A src/renderer/src
git commit -m "feat(renderer): restyle the log as the talk to vox chat"
```

---

### Task 9: Today / Weekly / Monthly dashboard

**Files:**
- Create: `src/renderer/src/components/PeriodNav.tsx`, `StatCard.tsx`, `BarCard.tsx`, `Banner.tsx`, `WeightChart.tsx`
- Create: `src/renderer/src/screens/Dashboard.tsx`
- Delete: `src/renderer/src/screens/Today.tsx`
- Modify: `src/renderer/src/App.tsx`

**Interfaces:**
- Consumes: `periodRange`, `shiftPeriod`, `canGoNext`, `localDate`, `Period` (`@shared/dates`); `summarizeRange`, `weightChange`, `movingAverage` (`@shared/calc`); `greeting`, `longDate`, `shortDate`, `shortDay`, `monthLabel` (`../format`); `useTokens`.
- Produces:
  - `<PeriodNav label onPrev onNext nextDisabled />`
  - `<StatCard icon value label tone? />` (`tone?: 'sleep' | 'water'`)
  - `<BarCard icon title value unit data color compact? />` with `data: { label: string; value: number | null }[]`
  - `<Banner kicker? icon? title>{children}</Banner>`
  - `<WeightChart days />` (adult only; caller guards)
  - `<Dashboard tab />` with `tab: 'today' | 'weekly' | 'monthly'`

- [ ] **Step 1: Small components**

`PeriodNav.tsx`:

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function PeriodNav(props: {
  label: string
  onPrev: () => void
  onNext: () => void
  nextDisabled: boolean
}): React.JSX.Element {
  return (
    <div className="period">
      <button aria-label="Previous" onClick={props.onPrev}>
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <span className="label">{props.label}</span>
      <button aria-label="Next" disabled={props.nextDisabled} onClick={props.onNext}>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
```

`StatCard.tsx`:

```tsx
import type { LucideIcon } from 'lucide-react'

export function StatCard(props: {
  icon: LucideIcon
  value: string | number
  label: string
  tone?: 'sleep' | 'water'
}): React.JSX.Element {
  const Icon = props.icon
  return (
    <div className="panel stat" data-tone={props.tone}>
      <Icon size={22} aria-hidden="true" />
      <div className="value">{props.value}</div>
      <div className="label">{props.label}</div>
    </div>
  )
}
```

`Banner.tsx`:

```tsx
import type { LucideIcon } from 'lucide-react'

// Hero card. The illustration slot is the --banner-art CSS variable (none until art exists).
export function Banner(props: {
  kicker?: string
  icon?: LucideIcon
  title: string
  children?: React.ReactNode
}): React.JSX.Element {
  const Icon = props.icon
  return (
    <section className="banner">
      {props.kicker && (
        <div className="kicker">
          {Icon && <Icon size={18} aria-hidden="true" />}
          {props.kicker}
        </div>
      )}
      <h2>{props.title}</h2>
      {props.children && <p>{props.children}</p>}
    </section>
  )
}
```

`BarCard.tsx`:

```tsx
import { Bar, BarChart, ResponsiveContainer, XAxis } from 'recharts'
import type { LucideIcon } from 'lucide-react'
import { useTokens } from '../useTokens'

export type BarPoint = { label: string; value: number | null }

export function BarCard(props: {
  icon: LucideIcon
  title: string
  value: string
  unit: string
  data: BarPoint[]
  color: string
  compact?: boolean
}): React.JSX.Element {
  const { icon: Icon, title, value, unit, data, color, compact = false } = props
  const t = useTokens()
  return (
    <section className="panel bar-card" data-compact={compact}>
      <div className="bar-card-head">
        <h3 className="panel-title">
          <Icon size={18} style={{ color }} aria-hidden="true" />
          {title}
        </h3>
        <div className="figure">
          <div className="value">{value}</div>
          <div className="unit">{unit}</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={compact ? 64 : 120}>
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          {!compact && (
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11, fill: t.muted }} />
          )}
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}
```

`WeightChart.tsx` (moved from the old Today screen, same moving-average logic):

```tsx
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Scale } from 'lucide-react'
import { movingAverage, weightChange } from '@shared/calc'
import type { DaySummary } from '@shared/schemas'
import { shortDate } from '../format'
import { useTokens } from '../useTokens'

// Adults only; callers check profile.mode before rendering.
export function WeightChart({ days }: { days: DaySummary[] }): React.JSX.Element {
  const t = useTokens()
  const weights = days
    .filter((d) => d.bodyWeightKg !== null)
    .map((d) => ({ date: d.date, value: d.bodyWeightKg as number }))
  const avg = movingAverage(weights, 7)
  const data = weights.map((w, i) => ({
    label: shortDate(w.date),
    kg: w.value,
    avg: Math.round(avg[i].value * 10) / 10
  }))
  const change = weightChange(days)
  return (
    <section className="panel">
      <div className="weight-head">
        <h3 className="panel-title">
          <Scale size={18} aria-hidden="true" />
          Weight Trend
        </h3>
        {change && (
          <div className="weight-figure">
            <div className="value">{change.latestKg} kg</div>
            <div className="muted small">
              {change.changeKg > 0 ? '+' : ''}
              {change.changeKg} kg since {shortDate(change.since)}
            </div>
          </div>
        )}
      </div>
      {data.length === 0 ? (
        <p className="empty">Say your weight in a log, like “68 kilos ako ngayong umaga”, to see a trend here.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.primary} stopOpacity={0.18} />
                <stop offset="100%" stopColor={t.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={t.line} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: t.muted }} />
            <YAxis
              domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fontSize: 11, fill: t.muted }}
            />
            <Tooltip />
            <Area dataKey="avg" name="7-day average (kg)" stroke={t.primary} strokeWidth={2} fill="url(#wfill)" dot={false} isAnimationActive={false} />
            <Line dataKey="kg" name="Weigh-in (kg)" stroke={t.primary} strokeWidth={0} dot={{ r: 3, fill: t.primary }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
```

`ComposedChart` is used because it accepts both `<Area>` and `<Line>`. Confirm it is exported:
`grep -c "ComposedChart" node_modules/recharts/types/index.d.ts` → at least `1`.

- [ ] **Step 2: `Dashboard.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Activity, ChartNoAxesColumnIncreasing, Droplet, Flame, Lightbulb, Moon, Utensils } from 'lucide-react'
import { addDays, canGoNext, localDate, periodRange, shiftPeriod, type Period } from '@shared/dates'
import { summarizeRange } from '@shared/calc'
import type { DaySummary } from '@shared/schemas'
import { useVox } from '../store'
import { greeting, longDate, monthLabel, shortDate, shortDay } from '../format'
import { useTokens } from '../useTokens'
import { Banner } from '../components/Banner'
import { BarCard, type BarPoint } from '../components/BarCard'
import { PeriodNav } from '../components/PeriodNav'
import { StatCard } from '../components/StatCard'
import { WeightChart } from '../components/WeightChart'

type Tab = 'today' | 'weekly' | 'monthly'
const PERIOD: Record<Tab, Period> = { today: 'day', weekly: 'week', monthly: 'month' }
const TITLE: Record<Tab, string> = { today: 'Today', weekly: 'Weekly', monthly: 'Monthly' }

// Every day in the period, oldest first; days after today are listed with no value.
function allDays(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

const dash = (n: number | null, f: (n: number) => string = String): string => (n === null ? '—' : f(n))

export function Dashboard({ tab }: { tab: Tab }): React.JSX.Element {
  const { profile, setScreen } = useVox()
  const t = useTokens()
  const today = localDate()
  const period = PERIOD[tab]
  const [anchor, setAnchor] = useState(today)
  const [days, setDays] = useState<DaySummary[] | null>(null)
  const [seeding, setSeeding] = useState(false)
  const range = periodRange(period, anchor)
  const to = range.to > today ? today : range.to

  useEffect(() => {
    let alive = true
    window.vox.history.range(range.from, to).then((d) => alive && setDays(d))
    return () => {
      alive = false
    }
  }, [range.from, to])

  const adult = profile?.mode !== 'teen'
  const energy = adult && profile?.caloriesEnabled === true
  const byDate = new Map((days ?? []).map((d) => [d.date, d]))
  const series = (pick: (d: DaySummary) => number): BarPoint[] =>
    allDays(range.from, range.to).map((date) => ({
      label: period === 'week' ? shortDay(date) : String(Number(date.slice(8))),
      value: byDate.has(date) ? pick(byDate.get(date) as DaySummary) : null
    }))
  const sum = summarizeRange(days ?? [])
  const demo = (days ?? []).some((d) => d.includesDemoData)

  const isCurrent = range.from <= today && today <= range.to
  const label =
    period === 'day'
      ? isCurrent ? 'Today' : shortDate(anchor)
      : period === 'week'
        ? isCurrent ? 'This Week' : `${shortDate(range.from)} – ${shortDate(range.to)}`
        : isCurrent ? 'This Month' : monthLabel(anchor)
  const subtitle =
    period === 'day'
      ? longDate(anchor)
      : period === 'week'
        ? `${shortDate(range.from)} – ${shortDate(range.to)}, ${range.to.slice(0, 4)}`
        : monthLabel(anchor)

  const seed = async (): Promise<void> => {
    setSeeding(true)
    try {
      await window.vox.dev.seed()
      setDays(await window.vox.history.range(range.from, to))
    } finally {
      setSeeding(false)
    }
  }

  const bars = (compact: boolean): React.JSX.Element => (
    <div className={compact ? 'grid-4' : 'grid-2'}>
      <BarCard icon={Activity} title="Active minutes" value={String(sum.activeMinutes)} unit="min total" data={series((d) => d.activeMinutes)} color={t.primary} compact={compact} />
      {energy && (
        <BarCard icon={Utensils} title="Nutrition" value={dash(sum.avgKcalIn, (n) => `~${n}`)} unit="avg kcal eaten, estimate" data={series((d) => d.kcalIn ?? 0)} color={t.primary} compact={compact} />
      )}
      <BarCard icon={Moon} title="Sleep" value={dash(sum.avgSleepHours, (n) => `${n} h`)} unit="avg per night" data={series((d) => d.sleepHours)} color={t.sleep} compact={compact} />
      <BarCard icon={Droplet} title="Hydration" value={dash(sum.avgWaterGlasses)} unit="glasses avg per day" data={series((d) => d.waterGlasses)} color={t.water} compact={compact} />
    </div>
  )

  const day = days?.[0]

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{TITLE[tab]}</h1>
          <p className="sub">
            {subtitle}
            {demo && ' · Includes demo data'}
          </p>
        </div>
        <PeriodNav
          label={label}
          onPrev={() => setAnchor(shiftPeriod(period, anchor, -1))}
          onNext={() => setAnchor(shiftPeriod(period, anchor, 1))}
          nextDisabled={!canGoNext(period, anchor, today)}
        />
      </div>
      <div className="tabs" role="tablist">
        {(['today', 'weekly', 'monthly'] as Tab[]).map((x) => (
          <button key={x} role="tab" className="tab" aria-selected={tab === x} onClick={() => setScreen(x)}>
            {TITLE[x]}
          </button>
        ))}
      </div>

      {days === null ? (
        <p className="muted">Loading…</p>
      ) : tab === 'today' ? (
        day && (
        <>
          {anchor === today && (
            <Banner icon={Flame} title={`${greeting(new Date().getHours())}, ${profile?.nickname}!`}>
              {day.entryCount > 0 ? 'Here’s what you’ve logged today.' : 'Nothing logged yet today. Tell VOX what you did.'}
            </Banner>
          )}
          <div className="stats">
            {energy && day.kcalIn !== undefined && <StatCard icon={Flame} value={`~${day.kcalIn}`} label="kcal eaten, estimate" />}
            <StatCard icon={Activity} value={day.activeMinutes} label="active minutes" />
            <StatCard icon={Droplet} value={day.waterGlasses} label="glasses of water" tone="water" />
            <StatCard icon={Moon} value={day.sleepHours} label="hours of sleep" tone="sleep" />
          </div>
          {energy && day.kcalOut !== undefined && (
            <p className="note">
              ~{day.kcalOut} kcal from exercise, estimate.
              {day.tdee !== undefined && ` Your body uses around ${day.tdee} kcal on a typical day (Mifflin–St Jeor estimate).`}
            </p>
          )}
          {day.latestReaction && (
            <section className="insight" style={{ marginTop: '1rem' }}>
              <h3>
                <Lightbulb size={18} aria-hidden="true" />
                VOX Insight
              </h3>
              <p>{day.latestReaction.text}</p>
            </section>
          )}
        </>
        )
      ) : tab === 'weekly' ? (
        <>
          <Banner kicker="Weekly Recap" icon={ChartNoAxesColumnIncreasing} title="Your week">
            You logged on {sum.daysLogged} of {sum.days} days, with {sum.activeMinutes} active minutes.
          </Banner>
          {bars(false)}
        </>
      ) : (
        <>
          <Banner kicker="Monthly Summary" icon={ChartNoAxesColumnIncreasing} title={`Your month, ${profile?.nickname}.`}>
            You logged on {sum.daysLogged} of {sum.days} days, with {sum.activeMinutes} active minutes.
          </Banner>
          <div className="stack">
            {adult && <WeightChart days={days} />}
            {bars(true)}
          </div>
        </>
      )}

      {import.meta.env.DEV && (
        <p className="note">
          Dev tool:{' '}
          <button className="link" disabled={seeding} onClick={seed}>
            {seeding ? 'Adding demo history…' : 'Add 3 weeks of labelled demo history'}
          </button>
        </p>
      )}
    </div>
  )
}
```

Notes: the Today/Weekly/Monthly tab row is not in the wireframe (it never shows how to switch); it
reuses the Settings tab style from the wireframe. `sum.days` counts days up to today only (range is
clipped), so "of N days" is never inflated by future days.

- [ ] **Step 3: Wire in, delete `Today.tsx`**

In `App.tsx`: `if (screen === 'today' || screen === 'weekly' || screen === 'monthly') body = <Dashboard key={screen} tab={screen} />`.
`git rm src/renderer/src/screens/Today.tsx`. `grep -rn "TodayScreen\|screens/Today'" src` → none.
`npx prettier --write src/renderer/src/screens/Dashboard.tsx src/renderer/src/components`.

- [ ] **Step 4: Check**

`npm run typecheck && npm run lint && npm test`. In `npm run dev:mock`: add demo history, check all
three tabs, ‹ goes back, › disabled on the current period, adult vs calories-off profile (no
Nutrition card, no kcal stat, no note line).

- [ ] **Step 5: Commit**

```bash
git add -A src/renderer/src
git commit -m "feat(renderer): add today, weekly and monthly views"
```

---

### Task 10: Progress, Settings and the error screen

**Files:**
- Create: `src/renderer/src/screens/Progress.tsx`, `src/renderer/src/screens/Settings.tsx`
- Modify: `src/renderer/src/screens/Setup.tsx`, `src/renderer/src/App.tsx`

**Interfaces:**
- Consumes: `WeightChart`, `BarCard`, `summarizeRange`, `ageYears`, `addDays`, `localDate`, `useTokens`, `useVox` (`profile`, `setScreen`, `themePref`, `setThemePref`, `ai`), `AiChip`, `Brand`.
- Produces: `<Progress />`, `<Settings />`, restyled `<Setup status />`.

- [ ] **Step 1: `Progress.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Activity, Droplet, Moon, Ruler, Scale } from 'lucide-react'
import { addDays, localDate } from '@shared/dates'
import { summarizeRange } from '@shared/calc'
import type { DaySummary } from '@shared/schemas'
import { useVox } from '../store'
import { shortDate } from '../format'
import { useTokens } from '../useTokens'
import { BarCard } from '../components/BarCard'
import { WeightChart } from '../components/WeightChart'

const DAYS = 90

export function Progress(): React.JSX.Element {
  const profile = useVox((s) => s.profile)
  const t = useTokens()
  const [days, setDays] = useState<DaySummary[] | null>(null)
  const today = localDate()
  const from = addDays(today, -(DAYS - 1))

  useEffect(() => {
    let alive = true
    window.vox.history.range(from, today).then((d) => alive && setDays(d))
    return () => {
      alive = false
    }
  }, [from, today])

  const adult = profile?.mode !== 'teen'
  const last30 = (days ?? []).slice(-30)
  const sum = summarizeRange(last30)
  const series = (pick: (d: DaySummary) => number): { label: string; value: number }[] =>
    last30.map((d) => ({ label: shortDate(d.date), value: pick(d) }))
  const latestWeighIn = [...(days ?? [])].reverse().find((d) => d.bodyWeightKg !== null)?.bodyWeightKg

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Progress</h1>
          <p className="sub">A longer view of your health and fitness journey.</p>
        </div>
      </div>
      {days === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="stack">
          {adult && <WeightChart days={days} />}
          {adult && (
            <section className="panel">
              <h3 className="panel-title">Body Metrics</h3>
              <div className="metric">
                <Ruler size={16} aria-hidden="true" /> Height <span className="v">{profile?.heightCm} cm</span>
              </div>
              <div className="metric">
                <Scale size={16} aria-hidden="true" /> Weight <span className="v">{latestWeighIn ?? profile?.weightKg} kg</span>
              </div>
            </section>
          )}
          <p className="sub">Last 30 days</p>
          <div className="grid-2">
            <BarCard icon={Activity} title="Active minutes" value={String(sum.activeMinutes)} unit="min total" data={series((d) => d.activeMinutes)} color={t.primary} compact />
            <BarCard icon={Moon} title="Sleep" value={sum.avgSleepHours === null ? '—' : `${sum.avgSleepHours} h`} unit="avg per night" data={series((d) => d.sleepHours)} color={t.sleep} compact />
            <BarCard icon={Droplet} title="Hydration" value={sum.avgWaterGlasses === null ? '—' : String(sum.avgWaterGlasses)} unit="glasses avg per day" data={series((d) => d.waterGlasses)} color={t.water} compact />
          </div>
        </div>
      )}
    </div>
  )
}
```

The weight value shown is the latest stored weigh-in, else the profile weight; no new number.

- [ ] **Step 2: `Settings.tsx`**

```tsx
import { Cpu, Monitor, Moon, ShieldCheck, Sun, User, CircleCheck } from 'lucide-react'
import { ageYears } from '@shared/calc'
import { useVox } from '../store'
import type { ThemePref } from '../theme'
import { AiChip } from '../components/AiChip'

const THEMES: { id: ThemePref; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor }
]

const SEX_LABEL = { male: 'Male', female: 'Female', unspecified: 'Prefer not to say' } as const

export function Settings(): React.JSX.Element {
  const { profile, setScreen, themePref, setThemePref, ai } = useVox()
  if (!profile) return <div className="page" />
  const teen = profile.mode === 'teen'
  const initials = profile.nickname.slice(0, 2).toUpperCase()
  const dob = new Date(`${profile.birthDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">Manage your profile, appearance and privacy.</p>
        </div>
      </div>
      <div className="grid-2">
        <section className="panel">
          <div className="review-head">
            <h3 className="panel-title">
              <User size={18} aria-hidden="true" /> Profile Information
            </h3>
            <button className="btn sm" onClick={() => setScreen('onboarding')}>
              Edit
            </button>
          </div>
          <div style={{ display: 'flex', gap: '1.6rem', marginTop: '1.2rem' }}>
            <span className="avatar" style={{ width: '5.6rem', height: '5.6rem', fontSize: '1.8rem', fontWeight: 600 }}>
              {initials}
            </span>
            <dl className="dl" style={{ marginTop: 0 }}>
              <dt>Name</dt>
              <dd>{profile.nickname}</dd>
              <dt>Date of Birth</dt>
              <dd>
                {dob} ({ageYears(profile.birthDate)} years old)
              </dd>
              {!teen && (
                <>
                  <dt>Sex</dt>
                  <dd>{SEX_LABEL[profile.sexForFormula]}</dd>
                </>
              )}
              <dt>Height</dt>
              <dd>{profile.heightCm} cm</dd>
              {!teen && (
                <>
                  <dt>Weight</dt>
                  <dd>{profile.weightKg} kg</dd>
                </>
              )}
            </dl>
          </div>
        </section>

        <section className="panel">
          <h3 className="panel-title">
            <Monitor size={18} aria-hidden="true" /> Appearance
          </h3>
          <p className="sub">Theme</p>
          <div className="theme-opts">
            {THEMES.map(({ id, label, icon: Icon }) => (
              <button key={id} className="theme-opt" aria-pressed={themePref === id} onClick={() => setThemePref(id)}>
                <Icon size={18} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <p className="note">Choose how VOX looks on this computer.</p>
        </section>

        <section className="panel">
          <h3 className="panel-title">
            <ShieldCheck size={18} aria-hidden="true" /> Privacy Overview
          </h3>
          <ul className="checks">
            <li>
              <CircleCheck size={18} aria-hidden="true" /> Your data is stored only on this computer
            </li>
            <li>
              <CircleCheck size={18} aria-hidden="true" /> Nothing is uploaded
            </li>
            <li>
              <CircleCheck size={18} aria-hidden="true" /> The AI runs inside this app
            </li>
          </ul>
        </section>

        <section className="panel">
          <h3 className="panel-title">
            <Cpu size={18} aria-hidden="true" /> On-device AI
          </h3>
          <div style={{ marginTop: '1.2rem' }}>
            <AiChip status={ai} />
          </div>
        </section>
      </div>
    </div>
  )
}
```

Teen Settings hide Weight as well as Sex (teen mode: no weight content anywhere).

Check `"Nothing is uploaded"` against the code before committing: `grep -rn "fetch(\|https://\|http://" src/main src/renderer/src src/preload | grep -v "//.*http"` must show no runtime network calls. If anything appears, stop and report instead of committing the claim.

- [ ] **Step 3: Restyle `Setup.tsx`**

Wrap the existing content (same text and logic) as:

```tsx
    <div className="setup panel">
      <Brand />
      <h1>…</h1>
      <p>…</p>
      {status.message && <pre>{status.message}</pre>}
    </div>
```

with `import { Brand } from '../components/Brand'`.

- [ ] **Step 4: Final `App.tsx` routing**

```tsx
  let body: React.JSX.Element
  if (screen === 'today' || screen === 'weekly' || screen === 'monthly')
    body = <Dashboard key={screen} tab={screen} />
  else if (screen === 'progress') body = <Progress />
  else if (screen === 'settings') body = <Settings />
  else body = <Talk />
```

Imports: `Talk`, `Dashboard`, `Progress`, `Settings`, `Onboarding`, `Setup`, `Sidebar` only.

- [ ] **Step 5: Check**

`npm run typecheck && npm run lint && npm test`. In `npm run dev:mock`: Settings → Light/Dark/System
switch immediately, survive restart; Edit opens onboarding at Review, Cancel returns to Settings,
Save returns to Talk; Progress for adult and teen. Rename the model folder (or set an invalid model
path the way Phase 5's exit check did) to see the restyled error screen, then restore it.

- [ ] **Step 6: Commit**

```bash
git add -A src/renderer/src
git commit -m "feat(renderer): add progress and settings, restyle the model error"
```

---

### Task 11: Side-by-side visual check and tuning

**Files:**
- Modify (tuning only): `src/renderer/src/styles.css`
- Create (temporary folder, not committed): screenshots

- [ ] **Step 1: Capture each screen** at the default 1200×800 window in `npm run dev:mock` with demo history: Talk (with one confirmed log), Today, Weekly, Monthly, Progress, Settings, each onboarding step, error screen; light and dark. Use macOS `screencapture -l <windowid>` or ⌘⇧4 + Space, saving into a temporary folder.

- [ ] **Step 2: Compare** each capture with the matching wireframe file (see the spec's file map) using the Read tool on both images. List differences in spacing, size, weight, colour, radius.

- [ ] **Step 3: Tune** only token values and sizes in `styles.css`. Do not add cards or numbers that the spec excludes. Keep a short list of what changed.

- [ ] **Step 4: Run the matrix** and tick each:
  - Adult with calories, adult with "Prefer not to say", teen (born 2010), under-13 blocked.
  - Light, Dark, System (switch macOS appearance while on System).
  - Teen: no kcal, no weight, no Sex, no "Manage my weight" on any screen.
  - No red used to mark a number as over/under anything.

- [ ] **Step 5: Final verification**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all pass. Paste the summary lines into the report.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/styles.css
git commit -m "style(renderer): tune spacing and colours against the wireframes"
```

Then report to the user with screenshots and the list of known gaps (no hero art, items excluded by
the spec, sizes matched by proportion). Do not merge or push.
