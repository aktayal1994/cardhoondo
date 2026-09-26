import { analyticsAllowed } from "./cookieConsent";

/**
 * Pushes straight to window.dataLayer rather than calling window.gtag(...)
 * -- gtag.js itself is just `function gtag(){dataLayer.push(arguments)}`,
 * so this is equivalent, but it works even before the external gtag.js
 * script has actually finished loading. That race matters most for the
 * landing-page pageview, the one event every ad-driven session is guaranteed
 * to fire -- losing it would silently undercount every campaign's true reach.
 * Silently no-ops on SSR; tracking must never be able to break the actual
 * product.
 *
 * CONSENT: nothing is queued unless the visitor pressed "Accept" in the
 * cookie banner (lib/cookieConsent.ts). Queuing events before consent would
 * be a leak, because gtag.js replays the whole queue when it later loads.
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!analyticsAllowed()) return;
  const w = window as unknown as { dataLayer?: unknown[] };
  try {
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(["event", name, params ?? {}]);
  } catch {
    // tracking is best-effort, never worth surfacing to the user
  }
}
