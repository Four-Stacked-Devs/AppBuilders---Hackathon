import type { AiStatus } from '@shared/status'

const LABEL: Record<AiStatus['state'], string> = {
  loading: 'Loading AI on this computer…',
  ready: 'AI running on this computer',
  error: 'AI not loaded'
}

// Visible on every screen: the language model runs inside this app, offline.
export function AiChip({ status }: { status: AiStatus }): React.JSX.Element {
  return (
    <div className="ai-chip" data-state={status.state} title={status.message ?? ''}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle className="dot" cx="12" cy="12" r="2.2" fill="var(--mango)" />
      </svg>
      <span>{LABEL[status.state]}</span>
    </div>
  )
}
