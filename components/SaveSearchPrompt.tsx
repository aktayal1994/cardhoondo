"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, Check } from "lucide-react";
import { AUTH_ENABLED } from "../lib/auth/config";
import { clearPendingClaim, type PendingClaim } from "../lib/auth/pendingClaim";
import { claimSearch } from "../lib/auth/claimClient";
import { useMe } from "../lib/auth/useMe";
import { trackEvent } from "../lib/analytics";
import AuthSheet from "./AuthSheet";

/**
 * "Keep this shortlist" card on a fresh results screen. Signed in: one tap
 * saves it. Signed out: opens the Google sheet, and the save completes
 * automatically when they come back (see WelcomeBackStrip). Renders nothing
 * when the feature is off or the search has no claim token.
 */
export default function SaveSearchPrompt({ claim }: { claim: PendingClaim | null }) {
  const me = useMe();
  const [sheet, setSheet] = useState(false);
  const [phase, setPhase] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  if (!AUTH_ENABLED || !claim) return null;

  const title = claim.persona.title;

  async function save() {
    if (me.status !== "authed") {
      setSheet(true);
      return;
    }
    setPhase("saving");
    setError(null);
    const result = await claimSearch(claim!);
    if (result.ok) {
      clearPendingClaim();
      setSavedName(result.item?.custom_name ?? result.item?.persona.title ?? title);
      setPhase("saved");
      trackEvent("search_saved", { origin: "results" });
    } else {
      setError({ code: result.code, message: result.message });
      setPhase("error");
      if (result.code === "session_expired") setSheet(true);
    }
  }

  return (
    <>
      <div className="mt-6 rounded-[20px] border border-border bg-paper-raised p-4 sm:p-5">
        {phase === "saved" ? (
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-positive-bg text-positive">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-semibold text-ink">Saved as “{savedName}”</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                It&apos;s in your saved searches on the home page.{" "}
                <Link href="/#saved-searches" className="text-accent-rust-soft underline underline-offset-2">
                  View saved searches
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-charcoal-800/70 text-accent-rust-soft">
                <Bookmark className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-display text-base font-semibold text-ink">Keep this shortlist</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  “{title}” — save it to revisit or compare later. Optional, no spam.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={phase === "saving"}
              className="shrink-0 rounded-full bg-accent-rust px-6 py-3 text-[15px] font-semibold text-charcoal-950 shadow-glow-sm transition hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
            >
              {phase === "saving" ? "Saving…" : "Save this search"}
            </button>
          </div>
        )}

        {phase === "error" && error && (
          <p className="mt-3 text-sm text-negative" role="alert">
            {error.message}{" "}
            {error.code === "limit_reached" && (
              <Link href="/account" className="underline underline-offset-2">
                Manage saved searches
              </Link>
            )}
          </p>
        )}
      </div>

      <AuthSheet open={sheet} onClose={() => setSheet(false)} next="/" personaTitle={title} saveIntent />
    </>
  );
}
