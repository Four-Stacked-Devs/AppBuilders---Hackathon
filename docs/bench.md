# Measured benchmarks

Only real, measured numbers go here. Each row says what was measured and on which machine.

## LLM parse benchmark (Phase 1)

- **Date:** 2026-10-10, ~03:30 PHT
- **Machine:** MacBook Air (Mac15,12), Apple M3, 16 GB RAM, macOS 25.5.0
- **Backend:** node-llama-cpp 3.22.1, Metal (Apple M3), run from plain Node 24.11.1
- **Conditions:** other apps open; RAM was ~94% used with ~2.3 GB swap before the run,
  so these are not best-case numbers
- **Settings:** same as the app: parse prompt `src/main/ai/prompts/parse.md`, JSON-schema
  grammar `src/main/ai/parse.schema.json`, context 4096, temperature 0, maxTokens 300,
  fresh session per sentence
- **Sentences:** the 10 in `tests/fixtures/parse.golden.json`; pass = every expected field
  matches (`tests/fixtures/checkParse.mjs`). The `unclear` field is not scored.
- **Command:** `npm run bench -- <file.gguf>`

| Model file | Size on disk | Load (s) | Avg per sentence (s) | Output tok/s, end to end* | Golden pass |
| --- | --- | --- | --- | --- | --- |
| `qwen2.5-3b-instruct-q4_k_m.gguf` | 2.10 GB | 1.9 | 3.6 | 14.6 | **8/10** |
| `Llama-3.2-3B-Instruct-Q4_K_M.gguf` | 2.02 GB | 2.2 | 3.8 | 13.1 | 6/10 |
| `qwen2.5-1.5b-instruct-q4_k_m.gguf` | 1.12 GB | 1.3 | 2.5 | 29.9 | 6/10 |

\* Output tokens divided by total time per sentence, which includes prompt processing. It is
not pure generation speed.

### Failures seen

- **Qwen2.5-3B:** logged water as a food (`tubig`, unit `baso`) as well as `waterGlasses: 5`;
  gave `saging` the unit `serving` instead of `piece`. Also copied `"yung blahblah"` from a
  prompt example into `unclear` (not scored).
- **Llama-3.2-3B:** pretty-prints its JSON (more tokens per reply); returned no foods for
  "kumain ako ng tapsilog tsaka isang Coke" and "almusal ko 2 pandesal tapos kape";
  returned all-empty output for "uhm ano, kumain ng tatlong lumpia tapos nag bike 20 minutes";
  `saging` unit.
- **Qwen2.5-1.5B:** read "2 hours" of basketball as sleep and dropped the milk tea; logged
  water as a food; mixed up units in the adobo/rice/saging sentence; split lumpia into two items.

### In-app check (Electron)

Loaded `qwen2.5-3b-instruct-q4_k_m.gguf` inside Electron 39.8.10 (`npm run dev`) on the
same machine: status went loading → ready within about 4 s of launch, and a short debug
prompt returned in 0.7 s.

## Windows laptop, full pipeline (Phases 3–6)

- **Date:** 2026-10-10, ~04:30–05:00 PHT
- **Machine:** Windows 11 laptop, Intel Core i5-11400H, 16 GB RAM, NVIDIA RTX 3050 Laptop GPU
- **Backend:** node-llama-cpp 3.22.1 prebuilt, **Vulkan** (`inspect gpu`: CUDA runtime not
  installed). Electron 39 via `npm run dev`.
- **Conditions:** memory was tight: `inspect gpu` reported 96% RAM used and 32 GB of swap in
  use while the app and other programs were open. Not best-case numbers.
- **Model:** `qwen2.5-3b-instruct-q4_k_m.gguf`; Whisper `onnx-community/whisper-base` q8 on WASM.

| What | Measured |
| --- | --- |
| Golden parse (`npm run test:golden`, after the app's water rule) | **9/10**; 73.5 s for all 10 sentences including model load. Miss: `saging` got unit `serving` |
| In-app parse, "I went jogging for 30 minutes and drank 3 glasses of water." | 1.75 s (`window.vox.log.parse`, timed in the renderer) |
| In-app confirm with AI explain (basketball 120 min) | 1.8 s from Confirm click to reaction shown |
| First parse right after launch, under heavy swap | still running at 12 s, finished before 32 s; not timed precisely |
| Whisper, 4.4 s English clip (Windows SAPI voice, 16 kHz) | 4.72 s first run, 4.55 s second; transcript exact |
| Outside network requests from the page during the voice test | 0 (`performance.getEntriesByType('resource')`) |

Whisper was only tested with a synthetic English clip. Taglish speech and the `language`
setting (auto, english, tagalog) still need testing with a real voice on the demo laptop.
