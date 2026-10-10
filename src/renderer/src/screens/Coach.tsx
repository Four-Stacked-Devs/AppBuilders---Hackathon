import { useCallback, useEffect, useRef, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen, SendHorizontal, Volume2, VolumeX } from 'lucide-react'
import { getAutoRead, setAutoRead, speak } from '../voice/speak'
import { LiveText, Speaker } from '../components/LiveText'
import type { ChatMessage, Chip, ConversationSummary, MsgBody } from '@shared/chat'
import type { ConfirmInput } from '@shared/schemas'
import { useVox, type Screen } from '../store'
import { ChatSessions } from '../components/ChatSessions'
import { ConfirmCard } from '../components/ConfirmCard'
import { MicButton } from '../components/MicButton'
import { ReactionView } from '../components/ReactionView'
import { WorkingSteps } from '../components/WorkingSteps'
import mark from '../assets/logo-mark.png'

const ACTIVE_KEY = 'vox.coach.active'
const AUTO_SEND_MS = 1800

const EXAMPLES = [
  'Nag-jog ako ng 30 minutes kanina',
  'Kumain ako ng 2 cups kanin at adobo',
  'Ilang minuto ako gumalaw this week?',
  '7 hrs tulog ko kagabi',
  'Gawan mo ako ng 4-day workout plan',
  'Gumawa ng meal plan, walang baboy',
  'Bukas mag-jog ako ng 20 minutes',
  'Buksan ang calendar ko',
  'Ilang calories ang sinigang?'
]

const cleanError = (err: unknown): string =>
  String(err).replace(/^Error: (Error invoking remote method '[^']+': )?(Error: )?/, '')

const readActive = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}
const writeActive = (id: string | null): void => {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    /* ignore: the last chat just will not be remembered */
  }
}

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

export function Coach(): React.JSX.Element {
  const setScreen = useVox((s) => s.setScreen)
  const profile = useVox((s) => s.profile)
  const [items, setItems] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(readActive())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [auto, setAuto] = useState(false)
  const [error, setError] = useState('')
  const [sessionsOpen, setSessionsOpen] = useState(true)
  const [autoRead, setAutoReadState] = useState(getAutoRead())
  const end = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  const refresh = useCallback(async (): Promise<ConversationSummary[]> => {
    const list = await window.vox.chat.list()
    setItems(list)
    return list
  }, [])

  useEffect(() => {
    let alive = true
    window.vox.chat.list().then((list) => {
      if (!alive) return
      setItems(list)
      const keep =
        activeId && list.some((c) => c.id === activeId) ? activeId : (list[0]?.id ?? null)
      setActiveId(keep)
      writeActive(keep)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let alive = true
    if (!activeId) {
      Promise.resolve().then(() => alive && setMessages([]))
      return () => {
        alive = false
      }
    }
    window.vox.chat.history(activeId).then((m) => alive && setMessages(m))
    return () => {
      alive = false
    }
  }, [activeId])

  useEffect(
    () => end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }),
    [messages, sending]
  )

  const select = (id: string): void => {
    setActiveId(id)
    writeActive(id)
    setError('')
  }

  const newChat = async (): Promise<void> => {
    const { id } = await window.vox.chat.create()
    await refresh()
    select(id)
    setMessages([])
  }

  const send = useCallback(
    async (raw: string): Promise<void> => {
      const note = raw.trim()
      if (!note || sending) return
      window.clearTimeout(timer.current)
      setAuto(false)
      setText('')
      setSending(true)
      setError('')
      try {
        let id = activeId
        if (!id) {
          id = (await window.vox.chat.create()).id
          setActiveId(id)
          writeActive(id)
        }
        const out = await window.vox.chat.send(id, note)
        setMessages((m) => [...m, ...out])
        if (getAutoRead()) {
          const first = out.find((m) => m.role === 'vox' && (m.body.type === 'text' || m.body.type === 'chips'))
          const t = first && 'text' in first.body ? first.body.text : ''
          if (t) speak(t)
        }
        const go = out.flatMap((m) => (m.body.type === 'chips' ? m.body.chips : [])).find((c) => c.go && c.screen)
        if (go?.screen) window.setTimeout(() => setScreen(go.screen as Screen), 900)
        void refresh()
      } catch (err) {
        setError(cleanError(err))
      } finally {
        setSending(false)
      }
    },
    [activeId, refresh, sending]
  )

  const onTranscript = (t: string): void => {
    setText((cur) => (cur ? `${cur} ${t}` : t))
    setAuto(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setText((cur) => {
        void send(cur)
        return cur
      })
    }, AUTO_SEND_MS)
  }

  const cancelAuto = (): void => {
    window.clearTimeout(timer.current)
    setAuto(false)
  }

  const replace = (m: ChatMessage): void =>
    setMessages((all) => all.map((x) => (x.id === m.id ? m : x)))

  const confirm = async (msg: ChatMessage, input: ConfirmInput): Promise<void> => {
    try {
      replace(await window.vox.chat.confirm(msg.id, input))
    } catch (err) {
      setError(cleanError(err))
    }
  }

  const rename = async (id: string, title: string): Promise<void> => {
    await window.vox.chat.rename(id, title)
    await refresh()
  }

  const remove = async (id: string): Promise<void> => {
    await window.vox.chat.delete(id)
    const list = await refresh()
    if (id === activeId) {
      const next = list[0]?.id ?? null
      setActiveId(next)
      writeActive(next)
    }
  }

  const onChip = (c: Chip): void => {
    if (c.send) void send(c.send)
    else if (c.screen) setScreen(c.screen as Screen)
  }

  return (
    <div className="coach" data-closed={!sessionsOpen}>
      <ChatSessions
        items={items}
        activeId={activeId}
        onSelect={select}
        onNew={() => void newChat()}
        onRename={(id, t) => void rename(id, t)}
        onDelete={(id) => void remove(id)}
      />
      <section className="talk">
        <header className="talk-head">
          <div className="talk-title">
            <button className="icon-btn" aria-label={sessionsOpen ? 'Hide chats' : 'Show chats'} onClick={() => setSessionsOpen(!sessionsOpen)}>
              {sessionsOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
            </button>
            <h1>Coach</h1>
            <button
              className="btn sm"
              aria-pressed={autoRead}
              title="Read VOX replies out loud"
              onClick={() => {
                setAutoRead(!autoRead)
                setAutoReadState(!autoRead)
              }}
            >
              {autoRead ? <Volume2 size={14} /> : <VolumeX size={14} />} {autoRead ? 'Reading aloud' : 'Read replies aloud'}
            </button>
          </div>
          <p className="sub">
            Say or type what you ate, how you moved or slept, or ask about your progress.
          </p>
        </header>
        <div className="thread">
          <div className="thread-inner">
            {messages.length === 0 && !sending && (
              <VoxMsg>
                <div className="vox empty-log">
                  <h2>Ano ginawa mo today, {profile?.nickname}?</h2>
                  <p className="muted">
                    Tagalog, English o Taglish, ayos lang. Nasa computer mo lang ang lahat ng usapan
                    natin.
                  </p>
                </div>
              </VoxMsg>
            )}
            {messages.map((m) => (
              <MessageView
                key={`${m.id}-${m.body.type}`}
                msg={m}
                onChip={onChip}
                onConfirm={confirm}
                onDiscard={async (x) => replace(await window.vox.chat.discard(x.id))}
              />
            ))}
            {sending && (
              <VoxMsg>
                <WorkingSteps kind="parse" />
              </VoxMsg>
            )}
            {error && <p className="error">{error}</p>}
            <div ref={end} />
          </div>
        </div>
        <div>
          {messages.length === 0 && !sending && (
            <div className="suggestions">
              {EXAMPLES.map((e) => (
                <button key={e} className="example" onClick={() => void send(e)}>
                  {e}
                </button>
              ))}
            </div>
          )}
          <div className="composer">
            {auto && (
              <div
                className="auto-send"
                onClick={cancelAuto}
                role="button"
                aria-label="Cancel sending"
              >
                <span style={{ animationDuration: `${AUTO_SEND_MS}ms` }} />
                <small>Sending… tap to edit first</small>
              </div>
            )}
            <div className="composer-inner">
              <textarea
                aria-label="Message VOX"
                placeholder="Message VOX…"
                rows={1}
                value={text}
                maxLength={500}
                onChange={(e) => {
                  cancelAuto()
                  setText(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send(text)
                  }
                }}
              />
              <MicButton disabled={sending} onTranscript={onTranscript} />
              <button
                className="round send"
                aria-label="Send"
                disabled={sending || !text.trim()}
                onClick={() => void send(text)}
              >
                <SendHorizontal size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="composer-hint">
              Enter para i-send. Hawakan ang mic (o Space) para magsalita. Dito lang sa computer mo ang lahat.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function MessageView(props: {
  msg: ChatMessage
  onChip: (c: Chip) => void
  onConfirm: (m: ChatMessage, input: ConfirmInput) => Promise<void>
  onDiscard: (m: ChatMessage) => Promise<void>
}): React.JSX.Element {
  const { msg, onChip, onConfirm, onDiscard } = props
  const [busy, setBusy] = useState(false)
  const b: MsgBody = msg.body
  if (msg.role === 'user' && b.type === 'text') return <div className="you">{b.text}</div>

  let body: React.JSX.Element | null = null
  const speaker = (t: string): React.JSX.Element | null => (t ? <Speaker text={t} /> : null)
  if (b.type === 'text')
    body = (
      <div className="vox">
        <LiveText text={b.text} />
        {speaker(b.text)}
      </div>
    )
  else if (b.type === 'notice')
    body = (
      <div className="safety" role="alert">
        <p>{b.text}</p>
      </div>
    )
  else if (b.type === 'chips')
    body = (
      <div className="vox">
        {b.text && (
          <p>
            {b.text} {speaker(b.text)}
          </p>
        )}
        <div className="chip-row">
          {b.chips.map((c) => (
            <button key={c.label} className="example" onClick={() => onChip(c)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
    )
  else if (b.type === 'stats') body = <StatsCard b={b} />
  else if (b.type === 'log') {
    const r = b.result
    if (b.state === 'done' && b.confirmed) body = <ReactionView result={b.confirmed} />
    else if (b.state === 'skipped')
      body = <div className="vox muted">Sige, hindi ko na isinama. Walang nasave.</div>
    else if (r.ok)
      body = (
        <>
          {r.safetyMessage && (
            <div className="safety" role="alert" style={{ marginBottom: '0.8rem' }}>
              <p>{r.safetyMessage}</p>
            </div>
          )}
          {r.parsed.unclear.length > 0 && (
            <div className="vox muted small" style={{ marginBottom: '0.8rem' }}>
              Not sure about: {r.parsed.unclear.join(' · ')}. Pick the right item below or skip it.
            </div>
          )}
          <ConfirmCard
            result={r}
            rawText={b.rawText}
            busy={busy}
            onConfirm={(input) => {
              setBusy(true)
              void onConfirm(msg, input).finally(() => setBusy(false))
            }}
            onCancel={() => void onDiscard(msg)}
          />
        </>
      )
  }
  return body ? <VoxMsg>{body}</VoxMsg> : <></>
}

function StatsCard({ b }: { b: Extract<MsgBody, { type: 'stats' }> }): React.JSX.Element {
  const max = Math.max(1, ...(b.series ?? []).map((s) => s.value))
  return (
    <div className="stats-card">
      <div className="stats-title">{b.title}</div>
      <div className="stats-value">{b.value}</div>
      {b.sub && <div className="muted small">{b.sub}</div>}
      {b.series && b.series.length > 1 && (
        <div className="mini-bars" role="img" aria-label={b.title}>
          {b.series.map((s) => (
            <i
              key={s.label}
              style={{ height: `${Math.max(6, (s.value / max) * 100)}%` }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
