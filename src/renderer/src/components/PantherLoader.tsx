import { useEffect, useState } from 'react'
import f1 from '../assets/loader/panther-1.png'
import f2 from '../assets/loader/panther-2.png'
import f3 from '../assets/loader/panther-3.png'

import f4 from '../assets/loader/panther-4.png'
import f5 from '../assets/loader/panther-5.png'
import f6 from '../assets/loader/panther-6.png'
import f7 from '../assets/loader/panther-7.png'
import f8 from '../assets/loader/panther-8.png'

const FRAMES = [f1, f4, f2, f5, f3, f6, f7, f8]

// The running panther from the VOX icon sheet, cycling its frames over a progress bar. Pass
// `progress` (0..1) for a real value; leave it out for an endless sweep. Reduced motion holds
// one frame (the global rule also stops the sweep).
export function PantherLoader(props: {
  progress?: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
}): React.JSX.Element {
  const { progress, size = 'md', label } = props
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setFrame((n) => (n + 1) % FRAMES.length), 90)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="panther-loader" data-size={size} role="status" aria-label={label ?? 'Loading'}>
      <img src={FRAMES[frame]} alt="" draggable={false} />
      <div className="panther-bar" data-indeterminate={progress === undefined}>
        <span
          style={progress === undefined ? undefined : { width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      {label && <div className="panther-label">{label}</div>}
    </div>
  )
}
