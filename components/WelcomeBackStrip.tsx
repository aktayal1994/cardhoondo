"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { AUTH_ENABLED } from "../lib/auth/config";
import { useMe } from "../lib/auth/useMe";
import {
  clearPendingClaim,
  clearSaveIntent,
  hasSaveIntent,
  loadPendingClaim,
  type PendingClaim,
} from "../lib/auth/pendingClaim";
import { claimSearch } from "../lib/auth/claimClient";
import { disambiguate } from "../lib/persona/derivePersona";
import { trackEvent } from "../lib/analytics";
import SavedSearchCard from "./SavedSearchCard";

/**
 * "Welcome back" strip under the landing nav for signed-in users. Anonymous
 * visitors see nothing and make no extra request (useMe only calls the server
 * when the ch_hint cookie is present). Space is reserved by CSS before the
 * page hydrates (see .welcome-slot in globals.css), so nothing jumps.
 *
 * It also finishes a save that was started before the round trip to Google:
 * if the person tapped "Save this search" while signed out, the intent and the
 * claim token are still in this browser's storage, and we claim it here.
 */
export default function WelcomeBackStrip({ onStart }: { onStart: (location: string) => void }) {
  const me = useMe();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [nudge, setNudge] = useState<PendingClaim | null>(null);
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const handled = useRef(false);

  // Finish a pending save (or offer one) once we know the user is signed in.
  useEffect(() => {
    if (me.status !== "authed" || handled.current) return;
    handled.current = true;

    const pending = loadPendingClaim();
    if (!pending) {
      clearSaveIntent();
      return;
    }
    if (hasSaveIntent()) {
      clearSaveIntent();
      void claimSearch(pending).then((result) => {
        if (result.ok) {
          clearPendingClaim();
          trackEvent("search_saved", { origin: "after_signin" });
          setNotice({ kind: "ok", text: `Saved “${result.item?.custom_name ?? pending.persona.title}”.` });
        } else if (result.code === "already_claimed" || result.code === "invalid_claim") {
          clearPendingClaim();
          setNotice({ kind: "error", text: result.message });
        } else {
          setNotice({ kind: "error", text: result.message });
        }
      });
    } else {
      setNudge(pending);
    }
  }, [me.status]);

  const suffixes = useMemo(
    () =>
      disambiguate(
        me.searches
          .filter((s) => !s.custom_name)
          .map((s) => ({ id: s.id, created_at: s.created_at, persona: s.persona })),
      ),
    [me.searches],
  );

  if (!AUTH_ENABLED) return null;
  if (me.status === "anonymous") return null;

  const firstName = me.user?.name?.split(" ")[0] ?? null;
  const shown = me.searches.slice(0, 3);

  return (
    <section id="saved-searches" aria-label="Your saved searches" className="mx-auto max-w-6xl scroll-mt-20 px-6 pt-8">
      {me.status === "unknown" ? (
        <div aria-hidden>
          <div className="h-5 w-40 animate-pulse rounded bg-charcoal-800 motion-reduce:animate-none" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-44 animate-pulse rounded-[20px] bg-charcoal-800/70 motion-reduce:animate-none" />
            <div className="hidden h-44 animate-pulse rounded-[20px] bg-charcoal-800/70 motion-reduce:animate-none sm:block" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">
                Welcome back{firstName ? `, ${firstName}` : ""}
              </h2>
              {me.searches.length > 0 && (
                <p className="mt-1 font-mono text-xs text-ink-faint">
                  {me.searches.length} saved {me.searches.length === 1 ? "search" : "searches"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onStart("welcome_back")}
              className="inline-flex items-center gap-2 rounded-full bg-accent-rust px-5 py-2.5 text-sm font-semibold text-charcoal-950 shadow-glow-sm transition hover:brightness-110 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Start a new search
            </button>
          </div>

          {notice && (
            <p
              role={notice.kind === "error" ? "alert" : "status"}
              className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
                notice.kind === "ok" ? "bg-positive-bg text-positive" : "bg-negative-bg text-negative"
              }`}
            >
              {notice.kind === "ok" && <Check className="h-4 w-4" strokeWidth={2.5} />}
              {notice.text}
            </p>
          )}

          {nudge && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border bg-paper-raised px-5 py-4">
              <p className="text-sm text-ink-soft">
                Save your last search?{" "}
                <span className="font-display text-base font-semibold text-ink">{nudge.persona.title}</span>
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={nudgeBusy}
                  onClick={async () => {
                    setNudgeBusy(true);
                    const result = await claimSearch(nudge);
                    setNudgeBusy(false);
                    if (result.ok) {
                      clearPendingClaim();
                      setNudge(null);
                      setNotice({ kind: "ok", text: `Saved “${nudge.persona.title}”.` });
                    } else {
                      setNudge(null);
                      setNotice({ kind: "error", text: result.message });
                    }
                  }}
                  className="rounded-full bg-accent-rust px-5 py-2 text-sm font-semibold text-charcoal-950 disabled:opacity-60"
                >
                  {nudgeBusy ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearPendingClaim();
                    setNudge(null);
                  }}
                  className="rounded-full px-4 py-2 text-sm text-ink-soft hover:text-ink"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {me.searches.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-border bg-paper-raised p-6">
              <p className="font-display text-lg font-semibold text-ink">No saved searches yet</p>
              <p className="mt-1 text-sm text-ink-soft">
                Run a search and tap “Save this search” on your results to find it here next time.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((s) => (
                  <SavedSearchCard key={s.id} item={s} suffix={suffixes[s.id] ?? null} />
                ))}
              </div>
              {me.searches.length > 3 && (
                <p className="mt-4 text-sm">
                  <Link href="/account" className="text-accent-rust-soft underline underline-offset-2">
                    View all {me.searches.length} saved searches
                  </Link>
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
