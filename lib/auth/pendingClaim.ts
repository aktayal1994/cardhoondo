import type { Persona } from "../persona/derivePersona";

/**
 * Remembers, in this browser only, the one thing needed to save an anonymous
 * search once the person signs in: the secret claim token /api/recommend
 * returned. Plus a short-lived "save after sign-in" intent, so the save can
 * finish after the round trip to Google.
 *
 * Everything is wrapped in try/catch: localStorage can be blocked or full
 * (private windows), and the product must keep working without it. Both keys
 * are listed in the Privacy Policy's storage table.
 */

const CLAIM_KEY = "cardhoondo_pending_claim_v1";
const INTENT_KEY = "cardhoondo_post_auth_intent_v1";
const CLAIM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INTENT_TTL_MS = 10 * 60 * 1000;

export interface PendingClaim {
  response_id: string;
  claim_token: string;
  persona: Persona;
}

function read<T>(key: string, ttl: number): (T & { at: number }) | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T & { at: number };
    if (typeof parsed.at !== "number" || Date.now() - parsed.at > ttl) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function write(key: string, value: object) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ ...value, at: Date.now() }));
  } catch {
    /* storage unavailable: saving still works while signed in */
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function savePendingClaim(claim: PendingClaim) {
  write(CLAIM_KEY, claim);
}

export function loadPendingClaim(): PendingClaim | null {
  const c = read<PendingClaim>(CLAIM_KEY, CLAIM_TTL_MS);
  return c ? { response_id: c.response_id, claim_token: c.claim_token, persona: c.persona } : null;
}

export function clearPendingClaim() {
  remove(CLAIM_KEY);
}

export function setSaveIntent() {
  write(INTENT_KEY, { kind: "save" });
}

export function hasSaveIntent(): boolean {
  return read<{ kind: string }>(INTENT_KEY, INTENT_TTL_MS)?.kind === "save";
}

export function clearSaveIntent() {
  remove(INTENT_KEY);
}
