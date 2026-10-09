import { useEffect, useState } from 'react'
import type { AiStatus } from '@shared/status'
import { PantherLoader } from './PantherLoader'

// Full-window loading screen while the on-device model loads, with the real load progress from
// the main process. The app does not need the AI to open, so after a few seconds the person can
// continue anyway (onboarding, calendar and diary all work without it).
export function Splash(props: { status: AiStatus; onSkip: () => void }): React.JSX.Element {
  const { status, onSkip } = props
  const [waited, setWaited] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(true), 6000)
    return () => window.clearTimeout(timer)
  }, [])

  const pct = status.progress === undefined ? null : Math.round(status.progress * 100)
  return (
    <div className="splash">
      <PantherLoader size="lg" progress={status.progress} />
      <h1>VOX</h1>
      <p className="muted">
        Loading the AI on this computer{pct !== null ? `, ${pct}%` : '…'}
        <br />
        Nothing leaves your device.
      </p>
      {waited && (
        <button className="btn sm" onClick={onSkip}>
          Open VOX anyway
        </button>
      )}
    </div>
  )
}
