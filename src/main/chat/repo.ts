import { randomUUID } from 'node:crypto'
import type { ChatMessage, ConversationSummary, MsgBody } from '@shared/chat'
import { db } from '../store/db'

// Chat storage in the same SQLite file as everything else.

type ConvRow = { id: string; title: string; updated_at: string; preview: string | null }
type MsgRow = { id: number; conversation_id: string; role: string; body: string; created_at: string }

const now = (): string => new Date().toISOString()

export function listConversations(): ConversationSummary[] {
  const rows = db()
    .sql.prepare(
      `SELECT c.id, c.title, c.updated_at,
         (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS preview
       FROM conversations c ORDER BY c.updated_at DESC`
    )
    .all() as ConvRow[]
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at,
    preview: previewOf(r.preview)
  }))
}

function previewOf(body: string | null): string {
  if (!body) return ''
  try {
    const b = JSON.parse(body) as MsgBody
    if (b.type === 'text' || b.type === 'notice') return b.text.slice(0, 80)
    if (b.type === 'log') return b.rawText.slice(0, 80)
    if (b.type === 'stats') return b.title
    if (b.type === 'chips') return b.text?.slice(0, 80) ?? ''
  } catch {
    /* ignore */
  }
  return ''
}

export function createConversation(title = 'New chat'): string {
  const id = randomUUID()
  const t = now()
  db().sql.prepare('INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').run(id, title, t, t)
  return id
}

export function renameConversation(id: string, title: string): void {
  db().sql.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(title, id)
}

export function deleteConversation(id: string): void {
  const sql = db().sql
  sql.exec('BEGIN')
  try {
    sql.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id)
    sql.prepare('DELETE FROM conversations WHERE id = ?').run(id)
    sql.exec('COMMIT')
  } catch (err) {
    sql.exec('ROLLBACK')
    throw err
  }
}

const toMsg = (r: MsgRow): ChatMessage => ({
  id: r.id,
  conversationId: r.conversation_id,
  role: r.role === 'user' ? 'user' : 'vox',
  body: JSON.parse(r.body) as MsgBody,
  createdAt: r.created_at
})

export function getMessages(conversationId: string): ChatMessage[] {
  return (
    db()
      .sql.prepare('SELECT id, conversation_id, role, body, created_at FROM messages WHERE conversation_id = ? ORDER BY id')
      .all(conversationId) as MsgRow[]
  ).map(toMsg)
}

export function getMessage(id: number): ChatMessage | null {
  const r = db()
    .sql.prepare('SELECT id, conversation_id, role, body, created_at FROM messages WHERE id = ?')
    .get(id) as MsgRow | undefined
  return r ? toMsg(r) : null
}

// A conversation's title comes from its first message, by rule (no waiting on the model).
const titleFrom = (text: string): string => {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > 40 ? `${t.slice(0, 40).trim()}…` : t
}

export function addMessage(conversationId: string, role: 'user' | 'vox', body: MsgBody): ChatMessage {
  const sql = db().sql
  const t = now()
  const res = sql
    .prepare('INSERT INTO messages (conversation_id, role, kind, body, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(conversationId, role, body.type, JSON.stringify(body), t)
  sql.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(t, conversationId)
  if (role === 'user' && body.type === 'text')
    sql
      .prepare("UPDATE conversations SET title = ? WHERE id = ? AND title = 'New chat'")
      .run(titleFrom(body.text), conversationId)
  return { id: Number(res.lastInsertRowid), conversationId, role, body, createdAt: t }
}

export function updateMessageBody(id: number, body: MsgBody): void {
  db().sql.prepare('UPDATE messages SET body = ?, kind = ? WHERE id = ?').run(JSON.stringify(body), body.type, id)
}
