import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { startRecording } from '../voice/recorder'
import { onSttState, sttError, sttState, transcribe } from '../voice/stt'
import { Mic } from 'lucide-react'

const MAX_MS = 30_000

// Push-to-talk: hold the button (or Space outside a text field), release to transcribe.
// Whisper runs inside this app, so audio never leaves the computer.
export function MicButton({
  disabled,
  onTranscript
}: {
  disabled: boolean
  onTranscript: (text: string) => void
}): React.JSX.Element {
  const stt = useSyncExternalStore(onSttState, sttState)
  const [phase, setPhase] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const stopRef = useRef<null | (() => Promise<Float32Array>)>(null)
  const timer = useRef<number | undefined>(undefined)

  const stop = useCallback(async () => {
    window.clearInterval(timer.current)
    const stopFn = stopRef.current
    stopRef.current = null
    if (!stopFn) return
    setPhase('transcribing')
    try {
      const audio = await stopFn()
      if (audio.length < 16_000 * 0.4) throw new Error('Ang ikli. Hawakan ang mic habang nagsasalita.')
      const text = await transcribe(audio)
      if (text) onTranscript(text)
      else setError('Wala akong narinig. Ulitin mo, medyo mas malapit sa mic.')
    } catch (err) {
      setError(String(err).replace(/^Error: /, ''))
    } finally {
      setPhase('idle')
    }
  }, [onTranscript])

  const start = useCallback(async () => {
    if (stopRef.current || phase !== 'idle' || disabled || stt !== 'ready') return
    setError('')
    try {
      stopRef.current = await startRecording()
      setPhase('recording')
      const t0 = Date.now()
      setElapsed(0)
      timer.current = window.setInterval(() => {
        const ms = Date.now() - t0
        setElapsed(ms)
        if (ms >= MAX_MS) void stop()
      }, 200)
    } catch {
      setError('Microphone not available. Allow mic access, or type instead.')
    }
  }, [phase, disabled, stt, stop])

  // Hold Space to talk when focus isn't in a text field or on a button.
  useEffect(() => {
    const typing = (el: EventTarget | null): boolean =>
      el instanceof HTMLElement &&
      (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName))
    const down = (e: KeyboardEvent): void => {
      if (e.code === 'Space' && !e.repeat && !typing(e.target)) {
        e.preventDefault()
        void start()
      }
    }
    const up = (e: KeyboardEvent): void => {
      if (e.code === 'Space' && stopRef.current) {
        e.preventDefault()
        void stop()
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [start, stop])

  const label =
    stt === 'loading'
      ? 'Inihahanda ang tenga ni VOX…'
      : stt === 'error'
        ? 'Hindi pa gumagana ang boses. Mag-type muna tayo.'
        : phase === 'recording'
          ? `Listening ${Math.floor(elapsed / 1000)}s, release to stop`
          : phase === 'transcribing'
            ? 'Pinakikinggan ka ni VOX…'
            : 'Pindutin at magsalita'

  return (
    <div className="mic-wrap">
      <button
        className="round mic"
        data-recording={phase === 'recording'}
        aria-label={label}
        title={error || (stt === 'error' ? sttError() : label)}
        disabled={disabled || stt !== 'ready' || phase === 'transcribing'}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          void start()
        }}
        onPointerUp={() => void stop()}
        onPointerCancel={() => void stop()}
      >
        <Mic size={18} aria-hidden="true" />
      </button>
      <span
        className="mic-status"
        role="status"
        data-active={Boolean(error) || phase !== 'idle' || stt !== 'ready'}
      >
        {error || label}
      </span>
    </div>
  )
}
