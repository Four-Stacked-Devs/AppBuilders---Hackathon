# Vox

Vox is a Taglish fitness log you can talk to: say "nag-jog ako ng 30 minutes tapos 3 baso ng
tubig", check what it understood, and get a short, warm reaction. Every AI model runs inside the
app on your own computer, and nothing you log ever leaves it.

> Not medical advice. Every energy number is an estimate from published tables.

## Setup

Needs Node.js 22 LTS (20.19+ or 22.12+) and git. On macOS, also `xcode-select --install`.

```bash
npm install
npm run models:download
npm run dev
```

`models:download` is a one-time download of about 2.2 GB: the language model (~2.1 GB) into
`models/llm/` and Whisper base (~80 MB) into `src/renderer/public/models/`. Model files are
never committed.

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests: calc, reference data, matching, store, safety, validator |
| `npm run test:golden` | Parse accuracy on 10 real Taglish sentences against the downloaded model |
| `npm run typecheck` | TypeScript checks for main, preload and renderer |
| `npm run bench -- <file.gguf>` | Times a model on the golden sentences (results in `docs/bench.md`) |

Mock mode for UI work, without loading the model: `VOX_FAKE_LLM=1 npm run dev` (macOS/Linux) or
`$env:VOX_FAKE_LLM=1; npm run dev` (Windows PowerShell).

## What runs locally

Everything, at runtime:

- **Language model:** Qwen2.5-3B-Instruct (GGUF, Q4_K_M) loaded by node-llama-cpp inside the
  app's main process. It is used twice per log: to turn the note into JSON (forced by a
  JSON-schema grammar) and to write the reaction.
- **Speech-to-text:** Whisper base (ONNX, 8-bit) run by transformers.js in a Web Worker. The
  ONNX runtime files are served from the app, not a CDN.
- **All numbers:** calories, METs, BMR, minutes and totals come from plain TypeScript in
  `src/shared/calc` and sourced tables in `data/`. The AI never calculates. A validator rejects
  any AI reply containing a number that the code didn't compute and swaps in a template.
- **Safety checks:** crisis, medical and eating-related keywords are checked on the raw text
  before any AI runs. Crisis text is never parsed or saved. The messages are fixed text.
- **Storage:** one JSON file in the app's user-data folder.

## What needs the internet

Only the one-time `npm install` and `npm run models:download`. Nothing at runtime: the page's
Content-Security-Policy sets `connect-src 'self'`, remote model loading is switched off, and
the demo runs with Wi-Fi turned off.

## Why local AI

Vox reads some of the most private data a person has: what they eat, their weight, their
sleep and how they feel. Running the language model and speech recognition on the laptop
means none of that leaves the device, not even to an AI provider. Logging also works with no
signal, like in a gym basement, and costs nothing per message for an app people use many
times a day.

## How it works

1. Hold the mic (or type). Whisper turns speech into an editable transcript.
2. Safety keywords are checked on the raw text.
3. The language model turns the note into JSON: foods, exercises, sleep, water, weight.
4. Code matches each item to the food and activity tables (aliases plus fuzzy search). Unknown
   items are shown with suggestions and are never guessed.
5. You fix anything on the confirmation card and tap Confirm.
6. Code computes the facts, rounded, and the model writes a reaction from those facts only.
7. The validator checks the reaction; the entry is saved.

Teen mode (ages 13–17) removes every calorie, weight and diet reference. Under-13s can't create
a profile.

## Measured performance

Real numbers only, with the machine and conditions, are in [docs/bench.md](docs/bench.md).
Highlights on a Windows laptop (i5-11400H, RTX 3050 via Vulkan, 16 GB RAM): golden parse 9/10,
parse 1.75 s, confirm with AI reaction 1.8 s, a 4.4 s voice clip transcribed in about 4.6 s.

## Disclosures

| Category | Used |
| --- | --- |
| Models | `qwen2.5-3b-instruct-q4_k_m.gguf` from [Qwen/Qwen2.5-3B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF), Qwen Research License (non-commercial: research or evaluation). Qwen is licensed under the Qwen RESEARCH LICENSE AGREEMENT, Copyright (c) Alibaba Cloud. All Rights Reserved. [onnx-community/whisper-base](https://huggingface.co/onnx-community/whisper-base), an ONNX conversion of OpenAI Whisper base (Apache-2.0) |
| Frameworks and libraries | Electron, electron-vite, React, TypeScript, node-llama-cpp, @huggingface/transformers, Zod, Fuse.js, Recharts, Zustand, Vitest, Bricolage Grotesque font via @fontsource (OFL-1.1). Exact versions in `package-lock.json` |
| Data sources | 2024 Adult Compendium of Physical Activities (MET values); DOST-FNRI Philippine Food Composition Tables and product labels (food energy); Mifflin–St Jeor (1990) BMR equation. Per-row citations in [data/SOURCES.md](data/SOURCES.md) |
| APIs and cloud services | None at runtime |
| Existing code and assets | electron-vite `react-ts` template |
| AI development tools | Claude Code (Anthropic). TODO before submitting: add every other AI tool the team used |

## Project layout

```
src/shared/      calc functions, Zod schemas, the window.vox API type
src/main/        model service, parse, matching, facts, explain, validator, safety, JSON store
src/preload/     the sandboxed bridge (contextBridge + ipcRenderer only)
src/renderer/    React screens, Whisper worker, recorder
data/            sourced food and activity tables, combo meals, SOURCES.md
docs/            implementation plan, measured benchmarks
tests/           unit tests and the golden parse test
```
