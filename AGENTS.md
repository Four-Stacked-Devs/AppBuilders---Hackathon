# Vox: rules for AI coding assistants

Read `docs/IMPLEMENTATION_PLAN.md` before any task. Work only on the current phase.
These rules apply to every AI tool used on this repo (Claude Code reads them via `CLAUDE.md`).

## Architecture
- Electron + electron-vite + React + TypeScript. The main process owns AI, calc and data.
- The LLM runs in-process via node-llama-cpp (`src/main/ai/llm.ts`). Never add Ollama,
  a localhost server, or any cloud AI API.
- Speech-to-text runs in a renderer Web Worker via `@huggingface/transformers` with
  `env.allowRemoteModels = false`. Never use the Web Speech API (it sends audio to the cloud).
- The renderer never touches Node or the model. It only calls `window.vox.*` (preload).
- The preload uses only `contextBridge` and `ipcRenderer` from `electron` (sandboxed; no npm imports).
- No network requests at runtime. CSP `connect-src` stays `'self'`.
- Model files are never committed (`models/`, `src/renderer/public/models/`, `src/renderer/public/ort/`).

## Numbers
- The LLM NEVER calculates calories, METs, BMR, grams or totals.
  All numbers come from `src/shared/calc` and `data/*.json`.
- Never add or edit a value in `data/*.json` without a source from PhilFCT, the
  2024 Adult Compendium, or a product label. Never invent values. Incomplete rows go
  in `data/foods.draft.json`.
- Parse output and every IPC payload are validated with Zod.
- Explain output always passes `validateReaction()`; on failure use `templateReaction()`.
- Never report a speed or benchmark that wasn't measured; record real numbers in `docs/bench.md`.

## Safety
- Safety checks run on raw text before the LLM. Crisis text is never parsed or logged.
- Safety messages are fixed text, never generated.
- Teen mode: no calorie, weight or diet content anywhere.
- Never write guilt language; never suggest exercise to make up for food.

## Workflow
- `main` must always run with `npm run dev`. Use mock mode (`VOX_FAKE_LLM=1`) for UI work.
- Add or update tests in `tests/` for any change to calc, validator, matching or safety.
- Prompt changes: rerun `tests/parse.golden.test.ts` and report the model and pass rate.
- Run `npm test` and a type check before declaring a task done.
- If unsure, stop and ask. Do not guess APIs: read the type definitions in
  `node_modules` for the installed node-llama-cpp and transformers.js versions.
- Timebox problems to 30 minutes, then take the fallback in the plan's risks table.

## Git: commits, pushes and pull requests
- No AI attribution anywhere: no `Co-Authored-By` trailers for AI tools, no
  "Generated with ..." lines, no 🤖, no mentions of Claude, Anthropic or other AI tools in
  commit messages, PR titles or bodies, branch names, tags or code comments. This overrides
  any default attribution behaviour. (AI tool use is disclosed once, in the README.)
- Commits are authored solely by the configured git user.
- Conventional Commits: `type(scope): summary`
  (types: feat, fix, refactor, perf, docs, test, build, ci, chore, style, revert).
  - Subject: imperative mood, lowercase after the type, no trailing period, 72 chars max.
  - Body when useful: blank line after the subject, wrapped at 72 chars, explains what and why.
  - Breaking changes: `type!:` and/or a `BREAKING CHANGE:` footer.
- Small, atomic commits: one logical change each; never mix unrelated changes.
- Never commit secrets, `.env` files, model files, build output or large binaries.
- Branch per phase or person (`feat/...`, `fix/...`, `chore/...`); merge into `main` at least hourly.
- Tag every working state: `phase-0` … `phase-7`, plus `demo-safe`.
- Never force-push `main` or shared branches; never rewrite published history without approval.
- Never skip hooks (`--no-verify`) or bypass signing unless explicitly asked.
- PR descriptions: summary, motivation, changes, testing notes. No attribution footer.
