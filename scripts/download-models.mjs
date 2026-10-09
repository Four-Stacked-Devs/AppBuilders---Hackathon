// Downloads the GGUF language model(s) and Whisper ONNX files from Hugging Face.
// Usage: npm run models:download -- [qwen3b] [llama3b] [qwen15b]   (default: qwen3b)
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

// Repo and file names verified on huggingface.co on 2026-10-10
const LLMS = {
  qwen3b: { repo: 'Qwen/Qwen2.5-3B-Instruct-GGUF', file: 'qwen2.5-3b-instruct-q4_k_m.gguf' },
  llama3b: { repo: 'bartowski/Llama-3.2-3B-Instruct-GGUF', file: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf' },
  qwen15b: { repo: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF', file: 'qwen2.5-1.5b-instruct-q4_k_m.gguf' }
}
const WHISPER = {
  repo: 'onnx-community/whisper-base',
  files: [
    'config.json',
    'generation_config.json',
    'preprocessor_config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'onnx/encoder_model_quantized.onnx',
    'onnx/decoder_model_merged_quantized.onnx'
  ]
}

async function get(repo, file, dest) {
  if (existsSync(dest) && statSync(dest).size > 0) return console.log('skip', dest)
  mkdirSync(dirname(dest), { recursive: true })
  const url = `https://huggingface.co/${repo}/resolve/main/${file}`
  console.log('get ', url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest + '.part'))
  renameSync(dest + '.part', dest)
}

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : ['qwen3b']
for (const key of wanted) {
  const m = LLMS[key]
  if (!m) throw new Error(`unknown model key ${key} (expected one of ${Object.keys(LLMS).join(', ')})`)
  await get(m.repo, m.file, join('models', 'llm', m.file))
}
for (const f of WHISPER.files) {
  await get(WHISPER.repo, f, join('src/renderer/public/models', WHISPER.repo, f))
}
console.log('done')
