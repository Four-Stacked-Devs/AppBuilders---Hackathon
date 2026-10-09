import { useEffect, useState } from 'react'
import type { AiStatus } from '@shared/status'

function App(): React.JSX.Element {
  const [status, setStatus] = useState<AiStatus>({ state: 'loading' })
  const [text, setText] = useState('Nag-jog ako ng 30 minutes tapos kumain ng 2 cups rice')
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const off = window.vox.ai.onStatus(setStatus)
    window.vox.ai.status().then(setStatus)
    return off
  }, [])

  // Temporary Phase 1 debug: send a sentence, log and show the raw model output.
  const send = async (): Promise<void> => {
    setBusy(true)
    const started = performance.now()
    try {
      const raw = await window.vox.debug.generate(text)
      const secs = ((performance.now() - started) / 1000).toFixed(1)
      console.log(`[vox debug] ${secs}s raw output:`, raw)
      setOutput(`${raw}\n\n(${secs}s)`)
    } catch (err) {
      setOutput(String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ width: 640, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p>
        AI: <b>{status.state}</b>
        {status.message ? ` (${status.message})` : ''}
      </p>
      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      <button disabled={busy || status.state !== 'ready' || !text.trim()} onClick={send}>
        {busy ? 'Thinking on this computer…' : 'Debug: send to model'}
      </button>
      <pre style={{ whiteSpace: 'pre-wrap', userSelect: 'text' }}>{output}</pre>
    </div>
  )
}

export default App
