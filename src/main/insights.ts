import { localDate } from '@shared/dates'
import { habitFindings } from '@shared/insights/habits'
import type { FindingId, InsightList } from '@shared/schemas'
import { db } from './store/db'

// Habit patterns with the logs that show them, minus any the person said are not right.
export function getInsights(): InsightList {
  const { entries, dismissed } = db().get()
  const { enough, findings } = habitFindings(entries, localDate(), dismissed)
  const byId = new Map(entries.map((e) => [e.id, e]))
  return {
    enough,
    findings: findings.map((f) => ({
      id: f.id,
      text: f.text,
      evidence: f.entryIds
        .map((id) => byId.get(id))
        .filter((e) => e !== undefined)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((e) => ({ id: e.id, date: e.date, rawText: e.rawText, seeded: e.seeded }))
    }))
  }
}

// "This isn't right": that insight is not shown again.
export function dismissInsight(id: FindingId): { ok: true } {
  db().update((d) => ({
    ...d,
    dismissed: d.dismissed.includes(id) ? d.dismissed : [...d.dismissed, id]
  }))
  return { ok: true }
}
