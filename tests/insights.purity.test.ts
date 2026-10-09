import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Insights and calc decide what VOX tells people about their habits and numbers, so they must
// be pure: no I/O, no AI, no network and no hidden clock. "Now" is always passed in. This test
// fails the build if any of that sneaks into these folders.
const DIRS = ['src/shared/insights', 'src/shared/calc']

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) ? [p] : []
  })

const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const BANNED: [RegExp, string][] = [
  [/from\s+['"]electron['"]/, 'imports electron'],
  [/from\s+['"]node:/, 'imports a node: module'],
  [/from\s+['"](fs|path|os|child_process)['"]/, 'imports a node module'],
  [/from\s+['"]node-llama-cpp['"]/, 'imports the LLM'],
  [/from\s+['"]@huggingface\//, 'imports transformers.js'],
  [/\bfetch\s*\(/, 'calls fetch'],
  [/\brequire\s*\(/, 'uses require'],
  [/Date\.now\s*\(/, 'reads the clock with Date.now()'],
  [/new\s+Date\s*\(\s*\)/, 'reads the clock with new Date()']
]

describe('insights and calc are pure', () => {
  const all = DIRS.flatMap(files)
  it('finds the files to check', () => expect(all.length).toBeGreaterThan(3))
  it.each(all)('%s', (file) => {
    const src = stripComments(readFileSync(file, 'utf8'))
    const hits = BANNED.filter(([re]) => re.test(src)).map(([, why]) => why)
    expect(hits, file).toEqual([])
  })
})
