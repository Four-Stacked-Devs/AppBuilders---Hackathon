import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

// Real-model golden tests only (see tests/parse.golden.test.ts).
export default defineConfig({
  resolve: { alias: { '@shared': resolve('src/shared') } },
  test: { include: ['tests/**/*.golden.test.ts'], fileParallelism: false }
})
