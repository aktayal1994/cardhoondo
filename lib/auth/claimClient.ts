"use client";

import type { PendingClaim } from "./pendingClaim";
import { refreshMe } from "./useMe";
import type { SavedSearchItem } from "../saved/items";

export type ClaimResult =
  | { ok: true; item: SavedSearchItem | null; created: boolean }
  | { ok: false; code: string; message: string };

const FRIENDLY: Record<string, string> = {
  session_expired: "Your sign-in ended. Please sign in again.",
  invalid_claim: "We couldn't save this search automatically. Run it again and tap Save.",
  already_claimed: "This search is already saved to another account.",
  limit_reached: "You've reached 20 saved searches. Delete one to save this.",
  bad_origin: "Something went wrong. Please refresh and try again.",
};

/** Saves an anonymous search to the signed-in account (server checks the claim token). */
export async function claimSearch(claim: PendingClaim, name?: string): Promise<ClaimResult> {
  try {
    const res = await fetch("/api/saved-searches/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ response_id: claim.response_id, claim_token: claim.claim_token, name }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = (json?.code as string) ?? "server_error";
      return { ok: false, code, message: FRIENDLY[code] ?? json?.error ?? "Couldn't save your search. Please try again." };
    }
    void refreshMe();
    return { ok: true, item: json.saved_search ?? null, created: !!json.created };
  } catch {
    return { ok: false, code: "network", message: "Can't reach CarDhoondo. Check your connection and try again." };
  }
}
