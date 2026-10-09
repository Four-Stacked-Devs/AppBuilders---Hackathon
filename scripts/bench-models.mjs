// Times each downloaded GGUF on the golden Taglish sentences with the real parse prompt and
// schema, and checks each output against its expectation. Record results in docs/bench.md.
// Usage: npm run bench -- [file.gguf ...]   (default: every .gguf in models/llm)
import { readdirSync, readFileSync } from 'node:fs'
import { cpus, totalmem } from 'node:os'
import { join } from 'node:path'
import { getLlama, LlamaChatSession } from 'node-llama-cpp'
import { checkParse } from '../tests/fixtures/checkParse.mjs'

const DIR = join('models', 'llm')
const prompt = readFileSync('src/main/ai/prompts/parse.md', 'utf8')
const schema = JSON.parse(readFileSync('src/main/ai/parse.schema.json', 'utf8'))
const golden = JSON.parse(readFileSync('tests/fixtures/parse.golden.json', 'utf8'))

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(DIR).filter((f) => f.endsWith('.gguf'))
if (!files.length) throw new Error(`no .gguf files in ${DIR}; run npm run models:download`)

const llama = await getLlama()
const gpuNames = llama.gpu ? await llama.getGpuDeviceNames() : []
console.log(`machine: ${cpus()[0].model}, ${(totalmem() / 2 ** 30).toFixed(0)} GB RAM`)
console.log(`backend: ${llama.gpu || 'cpu'} ${gpuNames.join(', ')}`)
console.log(`node-llama-cpp context 4096, temperature 0, maxTokens 300 (same as the app)\n`)

const summary = []
for (const file of files) {
  console.log(`=== ${file}`)
  let t = performance.now()
  const model = await llama.loadModel({ modelPath: join(DIR, file) })
  const context = await model.createContext({ contextSize: 4096 })
  const grammar = await llama.createGrammarForJsonSchema(schema)
  const loadS = (performance.now() - t) / 1000
  console.log(`load ${loadS.toFixed(1)} s`)

  let passed = 0
  let totalS = 0
  let totalTokens = 0
  for (const { note, expect } of golden) {
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
      systemPrompt: prompt
    })
    t = performance.now()
    const raw = await session.prompt(note, { grammar, temperature: 0, maxTokens: 300 })
    const s = (performance.now() - t) / 1000
    session.dispose({ disposeSequence: true })
    totalS += s
    totalTokens += model.tokenize(raw).length
    let errors
    try {
      errors = checkParse(JSON.parse(raw), expect)
    } catch (err) {
      errors = [`invalid JSON: ${err.message}`]
    }
    if (!errors.length) passed++
    console.log(`${errors.length ? 'FAIL' : 'pass'} ${s.toFixed(1)}s  ${note}\n     ${raw}`)
    for (const e of errors) console.log(`     - ${e}`)
  }
  const row = {
    file,
    loadS: loadS.toFixed(1),
    avgS: (totalS / golden.length).toFixed(1),
    outTokPerSEndToEnd: (totalTokens / totalS).toFixed(1), // includes prompt processing
    passed: `${passed}/${golden.length}`
  }
  summary.push(row)
  console.log(row, '\n')
  await context.dispose()
  await model.dispose()
}
console.table(summary)
