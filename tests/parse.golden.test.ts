// Golden parse test against the real model. Needs a downloaded GGUF, so it is not part of
// `npm test`; run it with `npm run test:golden` after any prompt change and record the model
// and pass rate in the commit message. Scores the parse output after the app's own water
// rule, which is what the confirmation card receives.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Llama, LlamaContext, LlamaGrammar } from 'node-llama-cpp'
import { applyWaterRule } from '../src/main/matching/match'
import { ParsedLog } from '../src/shared/schemas'
import { checkParse } from './fixtures/checkParse.mjs'

const MODEL_FILE = process.env.VOX_MODEL_FILE ?? 'qwen2.5-3b-instruct-q4_k_m.gguf'
const prompt = readFileSync('src/main/ai/prompts/parse.md', 'utf8')
const schema = JSON.parse(readFileSync('src/main/ai/parse.schema.json', 'utf8'))
const golden: { note: string; expect: object }[] = JSON.parse(
  readFileSync('tests/fixtures/parse.golden.json', 'utf8')
)

let nlc: typeof import('node-llama-cpp')
let llama: Llama
let context: LlamaContext
let grammar: LlamaGrammar
const results: boolean[] = []

beforeAll(async () => {
  nlc = await import('node-llama-cpp')
  llama = await nlc.getLlama()
  const model = await llama.loadModel({ modelPath: join('models', 'llm', MODEL_FILE) })
  context = await model.createContext({ contextSize: 4096 })
  grammar = await llama.createGrammarForJsonSchema(schema)
}, 120_000)

afterAll(async () => {
  console.log(`golden parse: ${MODEL_FILE} ${results.filter(Boolean).length}/${golden.length}`)
  await llama?.dispose()
})

describe(`golden parse (${MODEL_FILE})`, () => {
  it.each(golden)(
    '$note',
    async ({ note, expect: want }) => {
      const session = new nlc.LlamaChatSession({
        contextSequence: context.getSequence(),
        systemPrompt: prompt
      })
      try {
        const raw = await session.prompt(note, { grammar, temperature: 0, maxTokens: 300 })
        const parsed = applyWaterRule(ParsedLog.parse(JSON.parse(raw)), note)
        const errors = checkParse(parsed, want)
        results.push(errors.length === 0)
        expect(errors, raw).toEqual([])
      } finally {
        session.dispose({ disposeSequence: true })
      }
    },
    60_000
  )
})
