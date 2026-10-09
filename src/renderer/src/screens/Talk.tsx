import { useEffect, useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import type { ConfirmInput, ConfirmResult } from '@shared/schemas'
import { useVox, type Turn } from '../store'
import { ConfirmCard } from '../components/ConfirmCard'
import { MicButton } from '../components/MicButton'
import mark from '../assets/logo-mark.png'

const EXAMPLES = [
  'Nag-jog ako ng 30 minutes kanina',
  'nag basketball kami 2 hours tapos 3 baso ng tubig',
  '7 hrs tulog ko kagabi'
]

const cleanError = (err: unknown): string =>
  String(err).replace(/^Error: (Error invoking remote method '[^']+': )?(Error: )?/, '')

function VoxMsg({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="msg">
      <span className="avatar">
        <img src={mark} alt="VOX" />
      </span>
      <div className="msg-body">{children}</div>
    </div>
  )
}

export function Talk(): React.JSX.Element {
  const { turns, addTurn, updateTurn, ai, profile } = useVox()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const busy = turns.some((t) => t.state === 'parsing' || t.state === 'confirming')

  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [turns])

  const send = async (raw = text): Promise<void> => {
    const note = raw.trim()
    if (!note || busy) return
    setText('')
    const id = addTurn(note)
    try {
      const result = await window.vox.log.parse(note)
      if (result.ok) updateTurn(id, { state: 'card', result })
      else updateTurn(id, { state: result.safety === 'crisis' ? 'crisis' : 'failed', result })
    } catch (err) {
      updateTurn(id, { state: 'failed', error: cleanError(err) })
    }
  }

  const confirm = async (turn: Turn, input: ConfirmInput): Promise<void> => {
    updateTurn(turn.id, { state: 'confirming' })
    try {
      updateTurn(turn.id, { state: 'done', confirmed: await window.vox.log.confirm(input) })
    } catch (err) {
      updateTurn(turn.id, { state: 'card', error: cleanError(err) })
    }
  }

  const ready = ai.state === 'ready'

  return (
    <div className="talk">
      <header className="talk-head">
        <h1>Talk to VOX</h1>
        <p className="sub">
          Your AI fitness coach. Log what you ate, how you moved and how you slept.
        </p>
      </header>
      <div className="thread">
        <div className="thread-inner">
          {turns.length === 0 && (
            <VoxMsg>
              <div className="vox empty-log">
                <h2>Ano ginawa mo today, {profile?.nickname}?</h2>
                <p className="muted">
                  Say or type what you ate, how you moved, how you slept. Vox works it out on this
                  computer and asks you to check before saving.
                </p>
              </div>
            </VoxMsg>
          )}
          {turns.map((t) => (
            <TurnView
              key={t.id}
              turn={t}
              onConfirm={(i) => confirm(t, i)}
              onDiscard={() => updateTurn(t.id, { state: 'skipped' })}
            />
          ))}
          <div ref={end} />
        </div>
      </div>
      <div>
        <div className="suggestions">
          {EXAMPLES.map((e) => (
            <button key={e} className="example" disabled={!ready || busy} onClick={() => send(e)}>
              {e}
            </button>
          ))}
        </div>
        <div className="composer">
          <div className="composer-inner">
            <textarea
              aria-label="What did you do today?"
              placeholder={ready ? 'Message VOX…' : 'Loading AI on this computer…'}
              rows={1}
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <MicButton
              disabled={busy}
              onTranscript={(t) => setText((cur) => (cur ? `${cur} ${t}` : t))}
            />
            <button
              className="round send"
              aria-label="Send"
              disabled={!ready || busy || !text.trim()}
              onClick={() => send()}
            >
              <SendHorizontal size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="composer-hint">
            Enter to send. Hold the mic (or Space) to talk. Nothing leaves this computer.
          </p>
        </div>
      </div>
    </div>
  )
}

function TurnView({
  turn,
  onConfirm,
  onDiscard
}: {
  turn: Turn
  onConfirm: (i: ConfirmInput) => void
  onDiscard: () => void
}): React.JSX.Element {
  const r = turn.result
  const safety = r?.ok && turn.state !== 'skipped' ? r.safetyMessage : undefined
  const card = r?.ok && (turn.state === 'card' || turn.state === 'confirming') ? r : null
  return (
    <>
      <div className="you">{turn.text}</div>
      {turn.state === 'parsing' && (
        <VoxMsg>
          <div className="vox thinking">Thinking on this computer…</div>
        </VoxMsg>
      )}
      {turn.state === 'crisis' && r && !r.ok && (
        <VoxMsg>
          <div className="safety" role="alert">
            <h3>Nandito kami para sa’yo</h3>
            <p>{r.reason}</p>
          </div>
        </VoxMsg>
      )}
      {turn.state === 'failed' && (
        <VoxMsg>
          <div className="vox">{r && !r.ok ? r.reason : `Something went wrong: ${turn.error}`}</div>
        </VoxMsg>
      )}
      {safety && (
        <VoxMsg>
          <div className="safety" role="alert">
            <p>{safety}</p>
          </div>
        </VoxMsg>
      )}
      {card && (
        <VoxMsg>
          {turn.error && <p className="error">{turn.error}</p>}
          <ConfirmCard
            result={card}
            rawText={turn.text}
            busy={turn.state === 'confirming'}
            onConfirm={onConfirm}
            onCancel={onDiscard}
          />
        </VoxMsg>
      )}
      {turn.state === 'skipped' && (
        <VoxMsg>
          <div className="vox muted">Discarded. Nothing was saved.</div>
        </VoxMsg>
      )}
      {turn.state === 'done' && turn.confirmed && (
        <VoxMsg>
          <Reaction result={turn.confirmed} />
        </VoxMsg>
      )}
    </>
  )
}

function Reaction({ result }: { result: ConfirmResult }): React.JSX.Element {
  const { entry, reaction } = result
  const lines = entry.facts.items.map((i) => {
    const amount = i.minutes !== undefined ? `${i.minutes} min, ${i.intensity}` : i.quantityLabel
    const kcal = i.kcal !== undefined ? `, ~${i.kcal} kcal estimate` : ''
    return `${i.displayName} (${amount}${kcal})`
  })
  return (
    <div className="vox">
      <p>{reaction.text}</p>
      <div className="meta">
        {lines.length > 0 && <div>Saved: {lines.join('; ')}.</div>}
        {reaction.source === 'ai' ? (
          <div>Written by the AI on this computer, numbers checked against the facts.</div>
        ) : (
          <details>
            <summary>Template reply</summary>
            {reaction.rejectedReason
              ? `The AI reply was replaced: ${reaction.rejectedReason}`
              : 'The AI was not used for this reply.'}
          </details>
        )}
      </div>
    </div>
  )
}
