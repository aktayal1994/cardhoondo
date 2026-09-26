"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { AUTH_ENABLED } from "../lib/auth/config";
import { signOut, useMe } from "../lib/auth/useMe";
import { clearPendingClaim } from "../lib/auth/pendingClaim";
import AuthSheet from "./AuthSheet";

/**
 * Account entry point in the nav. Anonymous: a "Sign in" control (text on
 * wider screens, an icon on phones where the nav links are hidden). Signed in:
 * an avatar that opens a small menu. Renders nothing while the feature is off.
 */
export default function AccountMenu() {
  const me = useMe();
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  if (!AUTH_ENABLED) return null;

  if (me.status === "unknown") {
    return <div aria-hidden className="h-9 w-9 animate-pulse rounded-full bg-charcoal-800 motion-reduce:animate-none" />;
  }

  if (me.status === "anonymous") {
    return (
      <>
        <button
          type="button"
          onClick={() => setSheet(true)}
          aria-label="Sign in"
          className="flex h-11 items-center gap-2 rounded-full px-2 text-sm font-medium text-ink-soft transition hover:text-ink sm:px-3"
        >
          <UserRound className="h-5 w-5 sm:hidden" strokeWidth={1.75} />
          <span className="hidden sm:inline">Sign in</span>
        </button>
        <AuthSheet open={sheet} onClose={() => setSheet(false)} next="/" heading="Sign in to CarDhoondo" />
      </>
    );
  }

  const initial = (me.user?.name ?? me.user?.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setMenu((v) => !v)}
        aria-label="Account menu"
        aria-expanded={menu}
        className="flex h-11 w-11 items-center justify-center rounded-full"
      >
        {me.user?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={me.user.avatar_url}
            alt=""
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-full border border-border object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-charcoal-800 text-sm font-semibold text-ink">
            {initial}
          </span>
        )}
      </button>

      {menu && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-border bg-paper-raised p-2 shadow-card">
          <div className="px-3 py-2">
            {me.user?.name && <p className="truncate text-sm font-medium text-ink">{me.user.name}</p>}
            <p className="truncate text-xs text-ink-faint">{me.user?.email}</p>
          </div>
          <div className="my-1 border-t border-border" />
          <Link
            href="/#saved-searches"
            onClick={() => setMenu(false)}
            className="block rounded-xl px-3 py-2.5 text-sm text-ink-soft transition hover:bg-charcoal-800/60 hover:text-ink"
          >
            Saved searches
          </Link>
          <Link
            href="/account"
            onClick={() => setMenu(false)}
            className="block rounded-xl px-3 py-2.5 text-sm text-ink-soft transition hover:bg-charcoal-800/60 hover:text-ink"
          >
            Account &amp; privacy
          </Link>
          <button
            type="button"
            onClick={async () => {
              setMenu(false);
              clearPendingClaim();
              await signOut();
              router.refresh();
            }}
            className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-ink-soft transition hover:bg-charcoal-800/60 hover:text-ink"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
