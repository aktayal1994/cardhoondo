import { analyticsAllowed, loadAnalytics } from "./cookieConsent";

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
 * FORMAT: gtag.js only acts on entries that are an `arguments` object. A
 * plain array (`["event", name, params]`) is silently ignored -- that bug
 * meant no custom event or page_view reached GA4 until 1 Oct 2026. The
 * pushArgs helper below mirrors Google's own `function gtag(){...}`.
 *
 * ORDER: loadAnalytics() is called first (idempotent) so the "js"/"config"
 * commands are always queued before the first event, whichever component's
 * effect runs first on page load.
 *
 * OPT-OUT: analytics is on by default (since 3 Oct 2026). Nothing is queued
 * if the visitor turned analytics off in "Cookie settings"
 * (lib/cookieConsent.ts).
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!analyticsAllowed()) return;
  const w = window as unknown as { dataLayer?: unknown[] };
  try {
    loadAnalytics();
    w.dataLayer = w.dataLayer || [];
    const dl = w.dataLayer;
    const pushArgs = function (..._args: unknown[]) {
      // eslint-disable-next-line prefer-rest-params
      dl.push(arguments);
    };
    pushArgs("event", name, params ?? {});
  } catch {
    // tracking is best-effort, never worth surfacing to the user
  }
}
