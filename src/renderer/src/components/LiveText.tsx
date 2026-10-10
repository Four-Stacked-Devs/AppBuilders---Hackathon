import { useState } from 'react'
import { Sparkles, Square, Volume2 } from 'lucide-react'
import { speak, stopSpeaking } from '../voice/speak'
import { PantherLoader } from './PantherLoader'

// Numbers with a unit pop out in the brand colour; words fade in one after another so a reply
// feels spoken, not pasted. The animation is switched off for reduced-motion by the global rule.
const NUM = /(\d[\d,.]*\s?(?:kcal|minutes?|mins?|min|oras|hrs?|hours?|glasses?|baso|km|kg|g)\b|\d[\d,.]*)/gi

export function LiveText({ text, className }: { text: string; className?: string }): React.JSX.Element {
  const parts = text.split(NUM)
  let n = 0
  return (
    <p className={`live-text ${className ?? ''}`}>
      {parts.map((part, i) => {
        const hot = i % 2 === 1
        return part.split(/(\s+)/).map((w, k) => {
          if (/^\s*$/.test(w)) return w
          const delay = Math.min(n++ * 24, 1400)
          return (
            <span key={`${i}-${k}`} className={hot ? 'live-word hot' : 'live-word'} style={{ animationDelay: `${delay}ms` }}>
              {w}
            </span>
          )
        })
      })}
    </p>
  )
}

export function Speaker({ text }: { text: string }): React.JSX.Element {
  const [talking, setTalking] = useState(false)
  return (
    <button
      className="icon-btn speak"
      aria-label={talking ? 'Stop reading' : 'Read aloud'}
      title={talking ? 'Stop' : 'Read aloud'}
      onClick={() => {
        if (talking) {
          stopSpeaking()
          setTalking(false)
        } else {
          setTalking(true)
          speak(text, () => setTalking(false))
        }
      }}
    >
      {talking ? <Square size={12} /> : <Volume2 size={14} />}
    </button>
  )
}

// An optional AI helper. Nothing runs until a button is pressed; the model only phrases the facts it is given.
export function AiAssist(props: {
  context: string
  options: { label: string; task: string }[]
  title?: string
}): React.JSX.Element {
  const [out, setOut] = useState<{ text: string; ai: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const run = (task: string): void => {
    setBusy(true)
    setOut(null)
    window.vox.ai
      .assist(task, props.context)
      .then(setOut)
      .catch(() => setOut({ text: 'Hindi ko nagawa iyon ngayon. Subukan ulit.', ai: false }))
      .finally(() => setBusy(false))
  }
  return (
    <div className="ai-assist">
      <div className="ai-assist-row">
        <span className="ai-assist-tag">
          <Sparkles size={14} aria-hidden="true" /> {props.title ?? 'Ask VOX'} <i>optional</i>
        </span>
        {props.options.map((o) => (
          <button key={o.label} className="example" disabled={busy} onClick={() => run(o.task)}>
            {o.label}
          </button>
        ))}
      </div>
      {busy && <PantherLoader size="sm" label="Nag-iisip si VOX…" />}
      {out && (
        <div className="ai-assist-out">
          <LiveText text={out.text} />
          <Speaker text={out.text} />
        </div>
      )}
    </div>
  )
}
