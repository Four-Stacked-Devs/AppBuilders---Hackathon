// Copies the ONNX runtime WebAssembly files into the renderer so Whisper works offline.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'

const src = 'node_modules/onnxruntime-web/dist'
const dest = 'src/renderer/public/ort'

if (!existsSync(src)) {
  console.warn(`skip ort:copy, ${src} not found (is @huggingface/transformers installed?)`)
  process.exit(0)
}
mkdirSync(dest, { recursive: true })
let copied = 0
for (const f of readdirSync(src)) {
  if (/^ort-wasm.*\.(wasm|mjs)$/.test(f)) {
    cpSync(`${src}/${f}`, `${dest}/${f}`)
    copied++
  }
}
console.log(`copied ${copied} ort wasm files to ${dest}`)
