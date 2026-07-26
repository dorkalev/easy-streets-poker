// Thin wrapper over the GA4 gtag loaded in index.html. No-op if gtag is
// absent (blocked, offline, or dev) so callers never need to guard.

type GtagArgs = [string, string, Record<string, unknown>?]
interface WithGtag {
  gtag?: (...args: GtagArgs) => void
}

export function track(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return
  const gtag = (window as unknown as WithGtag).gtag
  gtag?.('event', event, params)
}
