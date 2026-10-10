import { Cpu } from 'lucide-react'
import type { AiStatus } from '@shared/status'

const LABEL: Record<AiStatus['state'], string> = {
  loading: 'Ginigising si VOX…',
  ready: 'AI running on this computer',
  error: 'AI not loaded'
}

// Visible on every screen: the language model runs inside this app, offline.
export function AiChip({ status }: { status: AiStatus }): React.JSX.Element {
  return (
    <div className="ai-chip" data-state={status.state} title={status.message ?? ''}>
      <Cpu size={16} aria-hidden="true" />
      <span>{LABEL[status.state]}</span>
    </div>
  )
}
