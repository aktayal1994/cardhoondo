import { createHash, randomBytes } from "node:crypto";

/**
 * Claim proof for saving an anonymous search to an account.
 *
 * The questionnaire_response_id is just an identifier and can leak (URLs,
 * logs, analytics), so claiming needs a secret: a 256-bit random token that
 * /api/recommend returns once to the submitter and stores only as a SHA-256
 * hash. Node runtime only (route handlers), never middleware or the browser.
 */
export function newClaimToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashClaimToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cheap shape check before hashing: base64url of 32 bytes is 43 chars. */
export function looksLikeClaimToken(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t);
}
