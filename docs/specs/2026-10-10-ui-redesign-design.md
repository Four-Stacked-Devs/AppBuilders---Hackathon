# UI redesign to match the VOX wireframes

As of 2026-10-10. Branch `feat/ui-redesign`, not merged into `main` (main stays as submitted).

## Goal

Restyle the renderer so it looks like the VOX wireframes (light and dark), using the panther
icon from the icon sheet. Only screens and cards the app can back with real data are built.
Behaviour, IPC, calc, safety and the main process are unchanged.

## Source material

- Wireframes: `wireframe/*.png` (local only, untracked, not committed). File map:

| File | Shows |
| --- | --- |
| `839959866_…png` | Icon sheet (app, desktop, tray icons, loader) |
| `837536054_…png` | Light: login, welcome, personal info, fitness setup |
| `836294632_…png` | Dark: login, personal info, fitness setup, review |
| `840263457_…png` | Light: review (small, 259×273) |
| `838649701_…png` | Light: Talk to VOX, Today, Weekly, Monthly |
| `841814966_…png` | Dark: Talk to VOX, Today, Weekly, Monthly |
| `839707472_…png` | Light: Calendar, Program (not built) |
| `843041082_…png` | Dark: Calendar, Program (not built) |
| `840498421_…png` | Light: Progress, Progress Insights, Settings |
| `837714285_…png` | Dark: Progress, Progress Insights, Settings |

- The wireframes are scaled-down composites. Layout, spacing and colour are matched by eye and
  by sampled pixels; exact pixel measurements are not available.
- No original artwork files exist. Hero illustrations are not used (see Assets).

## Constraints (from AGENTS.md and the plan)

- No network at runtime; CSP unchanged. Fonts and icons are bundled npm packages.
- Renderer only calls `window.vox.*`. No new IPC in this change.
- No invented numbers: no targets, rings, macros or percentages the app does not store.
- Teen mode: no calorie, weight or diet content on any screen.
- Every energy number keeps "~" and "estimate".
- Red is the brand accent only. It never marks being over or under a number (plan 5.2).
- No guilt language. Existing safety messages, disclaimers and Taglish examples are kept verbatim.
- "Lahat ng data mo, nasa computer mo lang." and the not-medical-advice disclaimer stay in onboarding.

## Visual system

Colours sampled from the wireframe PNGs:

| Token | Light | Dark | Sampled from |
| --- | --- | --- | --- |
| `--bg` page | `#f1f2f4` | `#0e1113` | outer frame |
| `--sidebar` | `#fafcfb` | `#0b0f13` | sidebar body |
| `--surface` cards | `#ffffff` | `#121618` | main panel, cards |
| `--surface-2` inputs, chips | `#f7f8f9` | `#0b0d0f` | ring track, inputs |
| `--primary` | `#eb0a14` | `#eb1e24` | Sign in / send buttons |
| `--primary-soft` active nav | `#feeeee` | `#341315` | active sidebar pill |
| `--insight` tint | `#fdeaeb` | `#20161a` | VOX Insight card |

Text, muted-text and border tokens are sampled during implementation from headings, captions and
card edges in the same files and recorded in `styles.css` comments.

Chart series: activity and food red (`--primary`), sleep purple, water blue (sampled from the
Weekly cards during implementation).

- Font: Inter via `@fontsource-variable/inter` (closest visual match; not confirmed by the
  designer). Replaces `@fontsource-variable/bricolage-grotesque`, which is removed.
- Icons: `lucide-react`.
- Radius, shadow and spacing: cards with large radius and a faint border, as in the wireframes.
- Theme: `light | dark | system`, default `system`. Applied as `data-theme` on `<html>`, stored in
  `localStorage` (wrapped in try/catch; falls back to `system`). Tokens defined on `:root`,
  overridden for `[data-theme="dark"]` and for `system` via `prefers-color-scheme`.

## Assets

- App icon: panther cropped from the icon sheet (about 400×400), upscaled to 1024×1024 for
  `build/icon.png`, then `build/icon.icns`, `build/icon.ico`, `resources/icon.png`.
  It will be softer than a source file would be.
- Logo mark: panther head from the "desktop icon" crop, saved to
  `src/renderer/src/assets/logo-mark.png`, shown at about 32 px next to the "VOX" wordmark in text.
- Hero banners (welcome, Today, Weekly, Monthly, Progress, Privacy): same layout with a red to dark
  gradient and no illustration. One CSS variable / image import to swap in real art later.
- Food photos and avatars: not used. The VOX avatar in chat is the logo mark.

## Screens

### Shell

Left sidebar: logo + VOX, nav items **Talk to VOX**, **Today · Weekly · Monthly**, **Progress**,
then **Settings** pinned at the bottom with the AI status chip above it. Active item uses the red
pill. Not built: Calendar, Program, Chat History. Hidden while onboarding or on the model error
screen.

`Screen` in the store becomes
`'talk' | 'today' | 'weekly' | 'monthly' | 'progress' | 'settings' | 'onboarding'`.

### Onboarding (replaces the Profile form)

Top bar: logo + stepper (1 Welcome, 2 Personal Info, 3 Fitness Setup, 4 Review), completed steps
show a red check.

1. **Welcome**: "Welcome to VOX" heading, subtitle, the local-data line, "Let's get started".
2. **Personal Info**: Name / Nickname, Date of Birth, Sex (for calculations) as radios
   Male / Female / Prefer not to say (the last turns calorie estimates off, as now), Height (cm),
   Weight (kg). Units are fixed labels, no dropdowns. Teen mode hides Sex; under-13 shows the
   existing block message.
3. **Fitness Setup**: Activity level as cards (the schema's 5 levels with the existing labels),
   Primary goal as cards (existing adult/teen goal lists). Training preference, workout days and
   dietary preference are not built.
4. **Review**: Personal Information and Fitness Settings cards with Edit links to their step,
   the privacy banner with true text only, the disclaimer, and **Save Profile**.

Validation uses `ProfileInput` exactly as now; errors show inline. When editing an existing
profile the wizard opens at Review with a Cancel action.

### Talk to VOX (restyled Log)

Header "Talk to VOX" and subtitle. User messages right-aligned in a bordered bubble; VOX messages
left with the logo avatar. Thinking, safety, crisis, failed, discarded and reaction states keep
their current logic and text. ConfirmCard restyled as the "I've logged the following for you"
card with one row per item and its edit controls. Empty state shows the existing Taglish examples
as chips above the composer. Composer: rounded input, mic button, red round send button, existing
hint line.

### Today / Weekly / Monthly

One screen with three tabs, plus ‹ › to move by day, week or month (only reads
`day.get` / `history.range`; no future dates).

- **Today**: date heading, greeting banner ("Good morning, {nickname}!" by local time), stat cards
  with icon and value only (no rings): ~kcal eaten estimate (adults with calories on), active
  minutes, water glasses, sleep hours. "VOX Insight" card shows `latestReaction` when present.
  The "includes demo data" label stays. TDEE line stays for adults.
- **Weekly**: recap banner using real counts (days with entries out of 7, total active minutes),
  four bar cards: active minutes, ~kcal eaten (adults), sleep, water. Headline numbers are the
  values already returned per day; any average shown is computed in `src/shared/calc` with tests.
- **Monthly**: summary banner, weight trend line (adults; existing moving average), four mini bar
  cards as Weekly.
- Not built: macro donut, timeline, ring targets, Key Patterns text.

### Progress

Adults: Weight Trend (moved from Today, existing 7-day moving average) and Body Metrics (height
and weight from the profile). Teens: active-minutes, water and sleep trend cards; no weight.
Not built: body fat, muscle mass, milestones, Progress Insights tabs.

### Settings

- Profile Information card (name, date of birth with age, sex, height, weight), Edit opens the
  wizard at Review.
- Appearance: Light / Dark / System buttons.
- Privacy Overview: "Your data is stored only on this computer", "Nothing is uploaded", "The AI
  runs inside this app". No encryption claim.
- AI status chip.
- Not built: units, voice preferences, notifications, integrations, help, export, delete.

### Model error (Setup)

Restyled card, same text and logic.

## Code layout

- `src/renderer/src/styles.css`: rewritten with the tokens above.
- `src/renderer/src/theme.ts`: read/apply/store theme.
- `src/renderer/src/components/`: `Sidebar`, `Stepper`, `StatCard`, `BarCard`, `Banner`,
  `ChoiceCard`, plus restyled `ConfirmCard`, `MicButton`, `AiChip`.
- `src/renderer/src/screens/`: `Onboarding`, `Talk` (from `Log`), `Dashboard` (Today/Weekly/
  Monthly), `Progress`, `Settings`, `Setup`. `Profile.tsx` and `Today.tsx` are removed once their
  logic has moved.

## Testing

- `npm test` and `npm run typecheck` pass.
- New calc helpers (weekly averages, counts) get tests in `tests/`.
- Manual check in mock mode (`npm run dev:mock`) with seeded demo history: every built screen in
  light and dark, adult and teen profiles, calories-off profile, model-error screen. Screenshots
  compared side by side with the wireframes.

## Out of scope

Login and Google sign-in, Calendar, Program, Chat History, macros, notifications, integrations,
data export/delete, unit conversion, hero illustrations, merging into `main`.
