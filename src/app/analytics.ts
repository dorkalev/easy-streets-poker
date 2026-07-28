// Thin wrapper over the GA4 gtag loaded in index.html. No-op if gtag is
// absent (blocked, offline, or dev) so callers never need to guard.

interface WithGtag {
  gtag?: (...args: unknown[]) => void
}

function gtag(): WithGtag['gtag'] {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as WithGtag).gtag
}

export function track(event: string, params: Record<string, unknown> = {}): void {
  gtag()?.('event', event, params)
}

/** Persistent per-user dimensions (e.g. how far they've progressed). GA4
 * attaches these to every subsequent event and to the user in reports. */
export function setUserProps(props: Record<string, unknown>): void {
  gtag()?.('set', 'user_properties', props)
}

const startedAt = typeof performance !== 'undefined' ? performance.now() : 0

/** Seconds since the app loaded — a simple session-time signal for events. */
export function sessionSeconds(): number {
  return typeof performance !== 'undefined' ? Math.round((performance.now() - startedAt) / 1000) : 0
}
