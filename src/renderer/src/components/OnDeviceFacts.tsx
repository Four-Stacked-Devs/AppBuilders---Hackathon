import { useEffect, useState } from 'react'
import type { VoxApi } from '@shared/api'

type Meta = Awaited<ReturnType<VoxApi['meta']['get']>>

const GPU: Record<string, string> = {
  metal: 'Apple GPU (Metal)',
  vulkan: 'GPU (Vulkan)',
  cuda: 'NVIDIA GPU (CUDA)',
  cpu: 'CPU',
  'mock mode': 'Mock mode (no model loaded)'
}

// Facts read from the running app: which model, where it runs, where the data lives, and how
// many requests the window has made to the internet. Refreshed every 5 s.
export function OnDeviceFacts(): React.JSX.Element | null {
  const [meta, setMeta] = useState<Meta | null>(null)

  useEffect(() => {
    let alive = true
    const load = (): void => {
      window.vox.meta.get().then((m) => alive && setMeta(m))
    }
    load()
    const timer = window.setInterval(load, 5000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])

  if (!meta) return null
  return (
    <>
      <dl className="dl">
        <dt>Language model</dt>
        <dd>{meta.modelFile}</dd>
        <dt>Runs on</dt>
        <dd>{meta.gpu ? (GPU[meta.gpu] ?? meta.gpu) : 'Loading…'}</dd>
        <dt>Speech to text</dt>
        <dd>{meta.whisperModel}, on this computer</dd>
        <dt>Requests to the internet</dt>
        <dd>
          <strong>{meta.outsideRequests}</strong> since VOX opened
          {meta.lastOutsideHost && ` (last: ${meta.lastOutsideHost})`}
        </dd>
        <dt>Your data file</dt>
        <dd className="path">{meta.dataFile}</dd>
      </dl>
      <p className="note">
        Counted by VOX for everything this window loads. Any request to the internet would show
        here.
      </p>
    </>
  )
}
