// Counts every request this app makes to the internet, for the "0 requests" proof in Settings.
// Local dev-server traffic and in-app URLs are not the internet, so they don't count.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
const IN_APP = new Set(['file:', 'devtools:', 'data:', 'blob:', 'chrome-extension:', 'chrome:'])

export function isOutsideRequest(url: string): boolean {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return true // unknown shapes count, so the proof can only err towards showing a request
  }
  if (IN_APP.has(u.protocol)) return false
  return !LOCAL_HOSTS.has(u.hostname)
}

export type RequestCount = { outsideRequests: number; lastOutsideHost: string | null }

export function createRequestCounter(): {
  record: (url: string) => void
  snapshot: () => RequestCount
} {
  let outsideRequests = 0
  let lastOutsideHost: string | null = null
  return {
    record(url) {
      if (!isOutsideRequest(url)) return
      outsideRequests++
      try {
        lastOutsideHost = new URL(url).hostname
      } catch {
        lastOutsideHost = 'unknown'
      }
    },
    snapshot: () => ({ outsideRequests, lastOutsideHost })
  }
}
