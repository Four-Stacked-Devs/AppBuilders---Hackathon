import type { AiStatus } from '@shared/status'

// Shown when the on-device model can't load. Never fails silently.
export function Setup({ status }: { status: AiStatus }): React.JSX.Element {
  const missing = /no such file|ENOENT|not found|does not exist/i.test(status.message ?? '')
  return (
    <div className="setup">
      <h1>{missing ? 'Model file missing' : 'The AI model did not load'}</h1>
      <p>
        {missing ? (
          <>
            Run <code>npm run models:download</code> in the project folder, then restart Vox.
          </>
        ) : (
          'Close other heavy apps to free memory, then restart Vox. The details below can help.'
        )}
      </p>
      {status.message && <pre>{status.message}</pre>}
    </div>
  )
}
