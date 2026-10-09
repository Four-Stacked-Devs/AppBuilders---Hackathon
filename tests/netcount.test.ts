import { describe, it, expect } from 'vitest'
import { createRequestCounter, isOutsideRequest } from '../src/main/netcount'

describe('isOutsideRequest', () => {
  it.each([
    'http://localhost:5173/src/main.tsx',
    'ws://localhost:5173/',
    'http://127.0.0.1:5174/@vite/client',
    'http://[::1]:5173/',
    'file:///C:/app/out/renderer/index.html',
    'devtools://devtools/bundled/inspector.html',
    'data:image/png;base64,AAAA',
    'blob:http://localhost:5173/abc',
    'chrome-extension://abc/x.js'
  ])('does not count %s', (url) => expect(isOutsideRequest(url)).toBe(false))

  it.each([
    'https://huggingface.co/x',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.wasm',
    'http://example.com/',
    'wss://example.com/socket'
  ])('counts %s', (url) => expect(isOutsideRequest(url)).toBe(true))

  it('treats an unparsable URL as outside, to stay on the safe side', () =>
    expect(isOutsideRequest('not a url')).toBe(true))
})

describe('createRequestCounter', () => {
  it('counts only outside requests and remembers the last host', () => {
    const c = createRequestCounter()
    c.record('http://localhost:5173/a')
    c.record('https://example.com/b')
    c.record('https://example.com/c')
    expect(c.snapshot()).toEqual({ outsideRequests: 2, lastOutsideHost: 'example.com' })
  })
})
