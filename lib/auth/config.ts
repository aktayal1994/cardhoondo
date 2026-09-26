/**
 * Google sign-in / saved searches feature switch and shared constants.
 *
 * NEXT_PUBLIC_AUTH_ENABLED=1 turns the feature on. It is OFF by default so the
 * code can ship before the Google + Supabase console setup is done: with it
 * off, no sign-in UI renders and every auth/saved-search route answers 404.
 */
export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "1";

/** Max saved searches per account (counts archived ones too). */
export const SAVED_SEARCH_LIMIT = 20;

/** Versions of the legal documents a user accepts by signing in
 *  (web/content/legal/*.md). Bump when those documents change materially. */
export const LEGAL_VERSIONS = { terms: "1.1", privacy: "1.2" } as const;

/** Non-httpOnly cookie that only says "this browser recently had a session",
 *  so the landing page can reserve space without an extra request. It carries
 *  no identity and grants no access. */
export const HINT_COOKIE = "ch_hint";

export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30;
