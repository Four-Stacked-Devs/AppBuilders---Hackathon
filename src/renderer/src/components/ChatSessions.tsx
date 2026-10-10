import { useMemo, useState } from 'react'
import { Check, MessageSquarePlus, Pencil, Search, Trash2, X } from 'lucide-react'
import type { ConversationSummary } from '@shared/chat'

// The list of chat sessions, like other assistants: newest first, grouped by day, searchable,
// with rename and delete. Each session is its own thread.
function groupOf(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const day = (x: Date): number =>
    Math.floor(new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() / 86_400_000)
  const diff = day(now) - day(d)
  return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff <= 7 ? 'Previous 7 days' : 'Older'
}

export function ChatSessions(props: {
  items: ConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}): React.JSX.Element {
  const { items, activeId, onSelect, onNew, onRename, onDelete } = props
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)

  const groups = useMemo(() => {
    const filtered = items.filter((c) =>
      `${c.title} ${c.preview}`.toLowerCase().includes(q.toLowerCase())
    )
    const order = ['Today', 'Yesterday', 'Previous 7 days', 'Older']
    return order
      .map((g) => ({ g, rows: filtered.filter((c) => groupOf(c.updatedAt) === g) }))
      .filter((x) => x.rows.length > 0)
  }, [items, q])

  return (
    <aside className="sessions" aria-label="Chats">
      <div className="sessions-head">
        <h3>Chats</h3>
        <button className="btn sm primary" onClick={onNew}>
          <MessageSquarePlus size={15} aria-hidden="true" /> New chat
        </button>
      </div>
      <label className="session-search">
        <Search size={15} aria-hidden="true" />
        <input placeholder="Search chats" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="session-list">
        {groups.length === 0 && (
          <p className="muted small session-empty">Wala pang kwentuhan. Kumustahin mo si VOX.</p>
        )}
        {groups.map(({ g, rows }) => (
          <div key={g}>
            <div className="session-group">{g}</div>
            {rows.map((c) => (
              <div key={c.id} className="session" data-active={c.id === activeId}>
                {editing === c.id ? (
                  <form
                    className="session-edit"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (draft.trim()) onRename(c.id, draft.trim())
                      setEditing(null)
                    }}
                  >
                    <input
                      autoFocus
                      value={draft}
                      maxLength={60}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <button className="icon-btn" aria-label="Save name" type="submit">
                      <Check size={15} />
                    </button>
                  </form>
                ) : confirm === c.id ? (
                  <div className="session-confirm">
                    <span className="small">Delete this chat?</span>
                    <button
                      className="btn sm primary"
                      onClick={() => {
                        onDelete(c.id)
                        setConfirm(null)
                      }}
                    >
                      Delete
                    </button>
                    <button
                      className="icon-btn"
                      aria-label="Cancel"
                      onClick={() => setConfirm(null)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button className="session-main" onClick={() => onSelect(c.id)}>
                      <b>{c.title}</b>
                      <span>{c.preview}</span>
                    </button>
                    <div className="session-actions">
                      <button
                        className="icon-btn"
                        aria-label="Rename chat"
                        onClick={() => {
                          setEditing(c.id)
                          setDraft(c.title)
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="Delete chat"
                        onClick={() => setConfirm(c.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}
