import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@shared': resolve('src/shared') } },
  // Golden tests need the downloaded model: `npm run test:golden`.
  test: { exclude: ['**/node_modules/**', 'tests/**/*.golden.test.ts'] }
})
