import type { ConfirmResult } from '@shared/schemas'
import { calcLine } from '../format'

// The saved result of a log: VOX's reply, what was counted, how each number was calculated, and
// whether the reply came from the AI or a fixed template.
export function ReactionView({ result }: { result: ConfirmResult }): React.JSX.Element {
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
        {entry.calc && entry.calc.length > 0 && (
          <details>
            <summary>How was this calculated?</summary>
            <ul className="calc-lines">
              {entry.calc.map((c, i) => (
                <li key={i}>{calcLine(c)}</li>
              ))}
            </ul>
          </details>
        )}
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
