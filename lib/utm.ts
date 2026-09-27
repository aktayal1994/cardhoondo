/**
 * Remembers which campaign brought a visitor (utm_source, utm_medium,
 * utm_campaign, utm_content, utm_term) so the questionnaire submission can be
 * attributed to the ad that earned it. Ad links land on "/" but the submit
 * happens several pages later, so the values are kept in localStorage.
 * First touch wins for a visit: a later utm-bearing page load replaces it
 * (a new campaign click), but plain navigation never clears it.
 * These are campaign labels, not identifiers -- no personal data.
 */
const KEY = "ch_utm";
const ALLOWED = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

export function captureUtm(search: string): void {
  try {
    const params = new URLSearchParams(search);
    const found: Record<string, string> = {};
    for (const k of ALLOWED) {
      const v = params.get(k);
      if (v) found[k] = v.slice(0, 100);
    }
    if (Object.keys(found).length > 0) localStorage.setItem(KEY, JSON.stringify(found));
  } catch {
    /* storage blocked -- attribution is best-effort */
  }
}

export function readUtm(): Record<string, string> | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const k of ALLOWED) {
      if (typeof parsed[k] === "string") out[k] = parsed[k] as string;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}
