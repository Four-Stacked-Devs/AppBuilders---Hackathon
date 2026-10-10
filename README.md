<p align="center">
  <img src="resources/icon.png" alt="VOX panther mark" width="140" />
</p>

<h1 align="center">VOX</h1>

<p align="center"><b>The fitness companion that understands how Filipinos actually talk, and never needs the internet.</b></p>

<p align="center">
  Say it in Tagalog, English or Taglish. VOX logs it, plans your week, and coaches you,<br />
  with the AI, the speech recognition and your data all staying on your own computer.
</p>

> Not medical advice. Every energy number is an estimate from published tables.

---

## Run it: copy and paste this into your terminal

Needs [Node.js 22 LTS](https://nodejs.org) and git. The first run downloads the local AI models
(a few GB, one time only). After that, VOX needs no internet.

**macOS, Linux, or Windows with Git Bash / PowerShell 7:**

```bash
git clone https://github.com/Four-Stacked-Devs/Vox-Fitness.git && cd Vox-Fitness && npm install && npm run models:download && npm run dev
```

**Windows PowerShell (the blue one):**

```powershell
git clone https://github.com/Four-Stacked-Devs/Vox-Fitness.git; cd Vox-Fitness; npm install; npm run models:download; npm run dev
```

When the app opens, click the small round **database button in the bottom-right corner** and choose **Seed 6 weeks of data** to fill it with sample history, lifts, plans and chats. On
macOS, run `xcode-select --install` first if it asks for developer tools.

---

## Why VOX

Most fitness apps are built for English speakers, don't know sinigang from sinangag, and send
your weight, sleep and meals to someone else's servers. Many people quit before the habit forms,
because logging feels foreign, slow and invasive.

VOX flips that:

- **Talk the way you talk.** "Nag-jog ako ng 30 minutes kanina, tapos kumain ng 2 cups kanin at
  adobo." VOX understands Filipino number words, tenses and day words like *kahapon* and *kagabi*.
- **Philippine food, Philippine data.** Calories come from PhilFCT, the DOST-FNRI food
  composition table (1,539 foods), not a foreign database.
- **Private by design.** No account, no cloud, no API keys. The language model, speech
  recognition and your logs all live on your computer, so it works in a gym basement with no signal.
- **Numbers you can check.** The AI never calculates. Every result has a "How was this
  calculated?" breakdown, and estimated portions are labelled as estimates.
- **Kind, never guilty.** No guilt language, no "burn it off" messaging, and a teen mode with no
  calorie, weight or diet content.

## What you can do

| | |
| --- | --- |
| **Log by voice or text** | Foods, movement, water, sleep and weight in one sentence. Review and confirm before anything is saved. |
| **Coach chat** | Ask about your week, ask about any food, or say "gawan mo ako ng workout plan". The coach builds the plan on the Plans page, opens pages for you, and can read replies aloud. Chats are saved as separate sessions. |
| **Workout plans** | Rule-based weekly plans by goal, equipment and level, a session player with timers, a muscle map and lifting PRs. Or build your own. |
| **Meal prep** | Pinggang Pinoy plates, 22 Filipino recipes, a grocery list and a prep schedule. Or build your own. |
| **Plano ko bukas** | Plan tomorrow in a few taps and get gentle follow-up when you keep it. |
| **Progress and motivation** | A streak flame that changes color the longer your streak, a streak calendar, trends, habit insights and a Weekly Wrapped. |
| **Optional AI helpers** | "Ask VOX" buttons across the app. Everything works without them. |
| **Proof it is offline** | Settings shows a live count of outside network requests. It stays at zero. |

## Quick start

Needs Node.js 22 LTS (20.19+ or 22.12+) and git. On macOS, also run `xcode-select --install`.

```bash
npm install
npm run models:download   # one-time download of the local models
npm run dev
```

`models:download` fetches the language model and Whisper into `models/` and
`src/renderer/public/models/`. Model files are never committed. After this step the app needs no
internet.

Open **Settings → Load demo month (dev)** to fill the app with 46 days of sample history, lifts,
plans and chats.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app with hot reload |
| `npm run dev:mock` | UI work without loading the model (`VOX_FAKE_LLM=1`) |
| `npm test` | 206 unit tests: calc, data, matching, store, safety, validator, streaks, plans |
| `npm run test:golden` | Parse accuracy on real Taglish sentences against the downloaded model |
| `npm run typecheck` | TypeScript checks for main, preload and renderer |
| `npm run bench -- <file.gguf>` | Times a model on the golden sentences |
| `npm run build:win` / `build:mac` / `build:linux` | Package the app |

## How it works

```text
voice or text
     │
 safety check (rules, before anything else; crisis text is never parsed or saved)
     │
 Taglish reader (plain code, about 1 ms)
     ├── understood ──────────────► structured log, no AI call
     ├── partly understood ───────► short AI prompt for the leftover words only
     └── a question or a plan ────► intent router → coach handlers
                                         │
                      facts computed in code (calc + sourced tables)
                                         │
                      AI phrases the reply → validator → fixed template if rejected
```

1. **Safety first.** Crisis, medical and eating-related keywords are checked on the raw text
   before any AI runs. Safety messages are fixed text, never generated.
2. **Rules before the model.** A rule-based Taglish reader handles most sentences instantly. The
   language model only sees what the rules could not place.
3. **Code does the math.** Calories, METs, BMR, grams and totals come from `src/shared/calc` and
   `data/*.json`. A validator rejects any AI reply with a number the code did not produce.
4. **You stay in control.** Unknown items are shown with suggestions, never guessed, and nothing is
   saved until you confirm.

## Everything runs locally

| Part | What runs, and where |
| --- | --- |
| Language model | Qwen GGUF models run in-process by node-llama-cpp. The app picks the best model that fits the computer's free memory, with a lite profile for low-RAM laptops. |
| Speech to text | Whisper (ONNX) via transformers.js in a Web Worker, with remote models disabled. |
| Text to speech | The operating system's own voices (Windows speech, macOS `say`). |
| Data | A local SQLite file in the app's user-data folder. |
| Network | The Content-Security-Policy sets `connect-src 'self'`. There are no API calls at runtime. |

The only things that need the internet are `npm install` and `npm run models:download`.

## Measured results

Real numbers only, with the machine and settings, in [docs/bench.md](docs/bench.md).

| Measure | Result |
| --- | --- |
| Rule-based Taglish reader: log sentences parsed correctly | 20 / 20 |
| Sentences understood without calling the model | 20 / 20 |
| Chat intents classified correctly | 10 / 10 |
| Rule-based parse, average per sentence | 0.82 ms |
| Intent routing, average per message | 10.8 ms |
| Automated tests passing | 206 / 206 |

Model comparison, speech timings and the exact conditions are in the benchmark file. Benchmarking
also found and fixed two real misparses before release. The test sets are small, so read the
percentages as indicative.

## Disclosures

| Category | Used |
| --- | --- |
| Models | Qwen3-4B-Instruct-2507 (Apache-2.0), Qwen2.5-3B-Instruct and Qwen2.5-1.5B-Instruct GGUF from [Qwen](https://huggingface.co/Qwen) (the 3B model is under the Qwen Research License, non-commercial: research or evaluation; Qwen is licensed under the Qwen RESEARCH LICENSE AGREEMENT, Copyright (c) Alibaba Cloud. All Rights Reserved.). Whisper small and base from [onnx-community](https://huggingface.co/onnx-community), ONNX conversions of OpenAI Whisper (Apache-2.0) |
| Frameworks and libraries | Electron, electron-vite, React, TypeScript, Zustand, Recharts, Lucide, Zod, node-llama-cpp, @huggingface/transformers, ONNX Runtime Web, Fuse.js, Vitest, Inter font via @fontsource (OFL-1.1), Node's built-in SQLite. Exact versions in `package-lock.json` |
| Data sources | DOST-FNRI Philippine Food Composition Tables (PhilFCT) for energy and macros; 2024 Adult Compendium of Physical Activities for METs; Mifflin–St Jeor (1990) BMR equation; Pinggang Pinoy and WHO activity guidance for plan structure. Portion sizes are team estimates, labelled as estimated in the app. Per-row citations in [data/SOURCES.md](data/SOURCES.md) |
| APIs and cloud services | None at runtime |
| Existing code and assets | electron-vite `react-ts` template. Mascot art and icon provided by the team |
| AI development tools | Devin, Claude Code and Codex were used as coding assistants during development. The team set the architecture, rules and product decisions and reviewed the output. None of them is part of the running app |

## Project layout

```text
src/shared/      calc functions, Zod schemas, the window.vox API type, plan generators
src/main/        model service, Taglish reader, coach, matching, facts, validator, safety, SQLite store
src/preload/     the sandboxed bridge (contextBridge + ipcRenderer only)
src/renderer/    React screens, Whisper worker, recorder, voice playback
data/            sourced food and activity tables, recipes, exercises, SOURCES.md
docs/            implementation plan, measured benchmarks
tests/           unit tests, golden parse test, rule-layer benchmark
scripts/         model download, PhilFCT importer, benchmark runner
```

## The team

**Four-Stacked-Devs**: Sebastian Angelo Meer, Keith Justin Nario, Ivan Joseph Jaurigue and Eduard
King Anterola.

*Built for the hackathon, for Filipino users first.*
