/**
 * Analytics cookie consent.
 *
 * Rule (since 3 Oct 2026, founder's decision): Google Analytics is ON by
 * default for every visit, so ad clicks are counted -- with the opt-in banner
 * almost no ad visitor pressed Accept and GA showed nothing. No banner is
 * shown. A visitor can turn analytics off from "Cookie settings" in the
 * footer; "denied" (including Rejects made under the old banner) is always
 * honoured: nothing is loaded or sent. The choice lives in this
 * browser's localStorage only -- it is a preference, not personal data, so
 * there is no server record.
 *
 * Everything here must fail soft: localStorage can throw (private windows,
 * blocked storage) and tracking must never be able to break the product. When
 * storage is unavailable we behave as "no choice", which now means analytics on.
 */

export const GA_MEASUREMENT_ID = "G-YQ93EFYPEZ";

const STORAGE_KEY = "cardhoondo_cookie_choice_v1";

/** Fired on window whenever the choice changes, and (with no detail) to ask
 * the banner to reopen from a "Cookie settings" link. */
export const CONSENT_CHANGED_EVENT = "cardhoondo:cookie-choice-changed";
export const OPEN_SETTINGS_EVENT = "cardhoondo:open-cookie-settings";

export type CookieChoice = "granted" | "denied" | null;

export function getCookieChoice(): CookieChoice {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { analytics?: string };
    return parsed.analytics === "granted" || parsed.analytics === "denied" ? parsed.analytics : null;
  } catch {
    return null;
  }
}

export function analyticsAllowed(): boolean {
  return getCookieChoice() !== "denied";
}

export function setCookieChoice(choice: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: choice, at: new Date().toISOString() }));
  } catch {
    // storage unavailable: the choice applies for this page view only
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: choice }));
}

let analyticsLoaded = false;

/** Loads gtag.js and configures GA4. Idempotent. Never call when the visitor turned analytics off. */
export function loadAnalytics(): void {
  if (typeof window === "undefined" || analyticsLoaded) return;
  analyticsLoaded = true;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  // gtag() is defined as "push the arguments object", exactly as Google's
  // snippet does; it must push `arguments`, not an array.
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    (w.dataLayer as unknown[]).push(arguments);
  }
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/** Removes Google Analytics cookies set for this site (used on Reject). */
export function clearAnalyticsCookies(): void {
  if (typeof document === "undefined") return;
  const names = document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter((n) => n === "_ga" || n.startsWith("_ga_") || n === "_gid" || n.startsWith("_gat"));
  const host = window.location.hostname;
  const parts = host.split(".");
  const domains = new Set<string>([host]);
  for (let i = 0; i < parts.length - 1; i++) domains.add("." + parts.slice(i).join("."));
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
    }
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}
