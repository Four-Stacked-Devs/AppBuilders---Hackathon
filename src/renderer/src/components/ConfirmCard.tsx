import { useState } from 'react'
import type { ConfirmInput, MatchedItem, ParseResult } from '@shared/schemas'
import { useVox } from '../store'

type Ok = Extract<ParseResult, { ok: true }>
type Row = MatchedItem & { key: number; removed?: boolean }

const UNIT_LABEL: Record<string, string> = {
  cup: 'cup',
  piece: 'piece',
  glass: 'glass',
  bowl: 'bowl',
  plate: 'plate',
  can: 'can',
  serving: 'serving'
}

// What the AI understood, editable before anything is calculated or saved.
export function ConfirmCard({
  result,
  rawText,
  busy,
  onConfirm,
  onCancel
}: {
  result: Ok
  rawText: string
  busy: boolean
  onConfirm: (input: ConfirmInput) => void
  onCancel: () => void
}): React.JSX.Element {
  const [rows, setRows] = useState<Row[]>(() => result.items.map((it, key) => ({ ...it, key })))
  const teen = useVox((s) => s.profile?.mode === 'teen')
  const [extras, setExtras] = useState({
    sleepHours: result.parsed.sleepHours,
    waterGlasses: result.parsed.waterGlasses,
    // Teen mode has no weight content anywhere (main also drops it).
    bodyWeightKg: teen ? 0 : result.parsed.bodyWeightKg
  })
  const [swapOpen, setSwapOpen] = useState<number | null>(null)

  const update = (key: number, patch: Partial<MatchedItem>): void =>
    setRows((rs) => rs.map((r) => (r.key === key ? ({ ...r, ...patch } as Row) : r)))

  const live = rows.filter((r) => !r.removed)
  const unmatched = live.filter((r) => r.refId === null)
  const toSend = live.filter((r) => r.refId !== null)
  const hasAnything =
    toSend.length > 0 || extras.sleepHours > 0 || extras.waterGlasses > 0 || extras.bodyWeightKg > 0

  const confirm = (): void => {
    const items: ConfirmInput['items'] = toSend.map((r) =>
      r.kind === 'food'
        ? { kind: 'food', refId: r.refId as string, quantity: r.quantity, unit: r.unit }
        : {
            kind: 'exercise',
            refId: r.refId as string,
            durationMin: r.durationMin,
            effort: r.effort
          }
    )
    // A word matched by hand (it had no match, or the person swapped it) is remembered.
    const taught: NonNullable<ConfirmInput['taught']> = toSend.flatMap((r) => {
      const was = result.items[r.key]
      return was && was.refId !== r.refId && r.refId
        ? [
            {
              alias: r.rawName,
              kind: r.kind === 'exercise' ? ('activity' as const) : ('food' as const),
              refId: r.refId
            }
          ]
        : []
    })
    onConfirm({
      rawText,
      items,
      ...extras,
      safety: result.safety,
      dayOffset: result.dayOffset ?? 0,
      ...(taught.length ? { taught } : {})
    })
  }

  return (
    <div className="card" aria-label="What Vox understood">
      <h3>Tama ba ’to?</h3>
      {live.length === 0 && <p className="row muted">No food or activity found in this note.</p>}
      {live.map((r) => (
        <div className="row" key={r.key} data-unmatched={r.refId === null}>
          <div>
            <div className="name">{r.refId === null ? `“${r.rawName}”` : r.displayName}</div>
            <div className="said">
              {r.refId === null
                ? 'Not in the food and activity tables yet'
                : r.kind === 'food' && r.fromCombo
                  ? `part of ${r.fromCombo}`
                  : r.rawName.toLowerCase() !== r.displayName.toLowerCase()
                    ? `you said “${r.rawName}”`
                    : ''}
              {r.kind === 'food' &&
                r.refId !== null &&
                r.unitAssumed &&
                ' · assumed unit, change it if needed'}
              {r.refId !== null && r.candidates.length > 0 && (
                <>
                  {' '}
                  <button
                    className="link small"
                    onClick={() => setSwapOpen(swapOpen === r.key ? null : r.key)}
                  >
                    Not this?
                  </button>
                </>
              )}
            </div>
          </div>
          {r.kind === 'food' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Stepper
                value={r.quantity}
                step={r.unit === 'gram' ? 10 : 0.5}
                min={0.5}
                max={r.unit === 'gram' ? 5000 : 20}
                label={`${r.displayName} quantity`}
                onChange={(quantity) => update(r.key, { quantity })}
              />
              {r.units.length > 1 ? (
                <select
                  className="unit-select"
                  aria-label={`${r.displayName} unit`}
                  value={r.unit}
                  onChange={(e) => update(r.key, { unit: e.target.value, unitAssumed: false })}
                >
                  {r.units.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABEL[u] ?? u}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="small muted">{UNIT_LABEL[r.unit] ?? r.unit}</span>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Stepper
                value={r.durationMin}
                step={5}
                min={1}
                max={600}
                label={`${r.displayName} minutes`}
                onChange={(durationMin) => update(r.key, { durationMin })}
              />
              <span className="small muted">min</span>
            </div>
          )}
          <button
            className="remove"
            aria-label={`Remove ${r.displayName}`}
            onClick={() => update(r.key, { removed: true } as never)}
          >
            ×
          </button>
          {(r.refId === null || swapOpen === r.key) && (
            <div className="candidates">
              {r.candidates.length > 0 && <span className="small muted">Did you mean</span>}
              {r.candidates.map((c) => (
                <button
                  key={c.refId}
                  className="candidate"
                  onClick={() => {
                    // The new food's units come back from main on confirm; its default unit is used.
                    update(r.key, {
                      refId: c.refId,
                      displayName: c.name,
                      candidates: [],
                      ...(r.kind === 'food' ? { units: [], unitAssumed: true } : {})
                    })
                    setSwapOpen(null)
                  }}
                >
                  {c.name}
                </button>
              ))}
              <button
                className="link small"
                onClick={() => update(r.key, { removed: true } as never)}
              >
                Skip
              </button>
            </div>
          )}
        </div>
      ))}
      {(extras.sleepHours > 0 || extras.waterGlasses > 0 || extras.bodyWeightKg > 0) && (
        <div className="chips">
          {extras.sleepHours > 0 && (
            <Chip
              label={`${extras.sleepHours} h sleep`}
              onRemove={() => setExtras({ ...extras, sleepHours: 0 })}
            />
          )}
          {extras.waterGlasses > 0 && (
            <Chip
              label={`${extras.waterGlasses} glasses water`}
              onRemove={() => setExtras({ ...extras, waterGlasses: 0 })}
            />
          )}
          {extras.bodyWeightKg > 0 && (
            <Chip
              label={`${extras.bodyWeightKg} kg`}
              onRemove={() => setExtras({ ...extras, bodyWeightKg: 0 })}
            />
          )}
        </div>
      )}
      <div className="card-actions">
        <button className="btn primary" disabled={busy || !hasAnything} onClick={confirm}>
          {busy ? 'Saving…' : 'Confirm'}
        </button>
        <button className="link" disabled={busy} onClick={onCancel}>
          Discard
        </button>
        {unmatched.length > 0 && (
          <span className="small muted">
            {unmatched.length} unknown {unmatched.length === 1 ? 'item' : 'items'} won’t be logged
          </span>
        )}
      </div>
    </div>
  )
}

function Stepper(props: {
  value: number
  step: number
  min: number
  max: number
  label: string
  onChange: (n: number) => void
}): React.JSX.Element {
  const { value, step, min, max, label, onChange } = props
  const clamp = (n: number): number => Math.min(max, Math.max(min, n))
  return (
    <span className="stepper">
      <button aria-label={`Less ${label}`} onClick={() => onChange(clamp(value - step))}>
        −
      </button>
      <input
        aria-label={label}
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n) && n > 0) onChange(clamp(n))
        }}
      />
      <button aria-label={`More ${label}`} onClick={() => onChange(clamp(value + step))}>
        +
      </button>
    </span>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }): React.JSX.Element {
  return (
    <span className="chip">
      {label}{' '}
      <button className="remove small" aria-label={`Remove ${label}`} onClick={onRemove}>
        ×
      </button>
    </span>
  )
}
