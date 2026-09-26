"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AUTH_ENABLED } from "../lib/auth/config";
import { signOut, useMe } from "../lib/auth/useMe";
import { clearPendingClaim } from "../lib/auth/pendingClaim";
import { disambiguate } from "../lib/persona/derivePersona";
import { trackEvent } from "../lib/analytics";
import AuthSheet from "./AuthSheet";
import SavedSearchCard from "./SavedSearchCard";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="CarDhoondo home">
            <Image src="/cardhoondo-icon.png" alt="" width={237} height={237} className="h-8 w-8" />
            <span className="font-display text-lg font-bold text-ink">CarDhoondo</span>
          </Link>
          <Link href="/" className="text-sm text-ink-soft hover:text-ink">
            Back to home
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-10">{children}</div>
    </main>
  );
}

/** Account page: who you are, your saved searches, sign out, and erase everything. */
export default function AccountClient() {
  const me = useMe();
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reauth, setReauth] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const suffixes = useMemo(
    () =>
      disambiguate(
        me.searches.filter((s) => !s.custom_name).map((s) => ({ id: s.id, created_at: s.created_at, persona: s.persona })),
      ),
    [me.searches],
  );

  if (!AUTH_ENABLED) {
    return (
      <Shell>
        <p className="text-ink-soft">Accounts aren&apos;t available yet.</p>
      </Shell>
    );
  }

  if (deleted) {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold text-ink">Your account and data were deleted</h1>
        <p className="mt-2 text-ink-soft">
          Your account, saved searches, and the details you entered on them are gone. You can still use CarDhoondo without
          an account.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-accent-rust px-6 py-3 text-[15px] font-semibold text-charcoal-950 shadow-glow-sm"
        >
          Back to CarDhoondo
        </Link>
      </Shell>
    );
  }

  if (me.status === "unknown") {
    return (
      <Shell>
        <div aria-hidden className="h-8 w-56 animate-pulse rounded bg-charcoal-800 motion-reduce:animate-none" />
      </Shell>
    );
  }

  if (me.status === "anonymous") {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold text-ink">Sign in to see your account</h1>
        <p className="mt-2 text-ink-soft">Your saved searches and account settings are only visible to you.</p>
        <button
          type="button"
          onClick={() => setSheet(true)}
          className="mt-6 rounded-full bg-accent-rust px-6 py-3 text-[15px] font-semibold text-charcoal-950 shadow-glow-sm"
        >
          Sign in
        </button>
        <AuthSheet open={sheet} onClose={() => setSheet(false)} next="/account" heading="Sign in" />
      </Shell>
    );
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        trackEvent("account_delete");
        clearPendingClaim();
        await signOut();
        setDeleted(true);
        return;
      }
      if (json?.code === "reauth_required") {
        setReauth(true);
        setSheet(true);
        setDeleteError("For your security, please sign in again, then delete.");
      } else {
        setDeleteError(json?.error ?? "Couldn't delete your account. Please try again.");
      }
    } catch {
      setDeleteError("Can't reach CarDhoondo. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Shell>
      <h1 className="font-display text-3xl font-bold text-ink">Your account</h1>

      <section className="mt-8 rounded-[20px] border border-border bg-paper-raised p-5">
        <h2 className="font-display text-lg font-semibold text-ink">Profile</h2>
        <dl className="mt-3 space-y-2 text-sm">
          {me.user?.name && (
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-ink-faint">Name</dt>
              <dd className="text-ink">{me.user.name}</dd>
            </div>
          )}
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-faint">Email</dt>
            <dd className="break-all text-ink">{me.user?.email}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-faint">Sign-in</dt>
            <dd className="text-ink">Google</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-ink">Saved searches</h2>
        {me.searches.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            None yet. Run a search and tap “Save this search” on your results.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {me.searches.map((s) => (
              <SavedSearchCard key={s.id} item={s} suffix={suffixes[s.id] ?? null} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-[20px] border border-border bg-paper-raised p-5">
        <h2 className="font-display text-lg font-semibold text-ink">Your data</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Read how we use your data in our{" "}
          <Link href="/privacy" className="text-accent-rust-soft underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-accent-rust-soft underline underline-offset-2">
            Terms
          </Link>
          . To see, correct or take a copy of your data, email mycardhoondo@gmail.com.
        </p>
        <button
          type="button"
          onClick={async () => {
            clearPendingClaim();
            await signOut();
            router.push("/");
          }}
          className="mt-4 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-ink transition hover:border-accent-rust/50"
        >
          Sign out
        </button>
      </section>

      <section className="mt-6 rounded-[20px] border border-negative/40 bg-negative-bg p-5">
        <h2 className="font-display text-lg font-semibold text-negative">Delete account and data</h2>
        <p className="mt-2 text-sm text-ink-soft">This permanently deletes:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-soft">
          <li>your account ({me.user?.email})</li>
          <li>
            your {me.searches.length} saved {me.searches.length === 1 ? "search" : "searches"} and the answers behind them
          </li>
          <li>the results and feedback linked to those searches</li>
          <li>the name, pincode and phone number you entered on them (unless used elsewhere)</li>
        </ul>
        <p className="mt-2 text-sm text-ink-soft">This can&apos;t be undone.</p>

        <label htmlFor="delete-confirm" className="mt-4 block text-sm text-ink">
          Type <span className="font-mono font-semibold">DELETE</span> to confirm
        </label>
        <input
          id="delete-confirm"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
          className="mt-1.5 w-full max-w-xs rounded-xl border border-border bg-paper px-4 py-2.5 font-mono text-sm text-ink focus:border-negative/70 focus:outline-none"
        />
        {deleteError && (
          <p className="mt-2 text-sm text-negative" role="alert">
            {deleteError}
          </p>
        )}
        <button
          type="button"
          disabled={confirmText !== "DELETE" || deleting}
          onClick={deleteAccount}
          className="mt-4 rounded-full border border-negative/50 bg-negative-bg px-6 py-2.5 text-sm font-semibold text-negative transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting ? "Deleting…" : "Delete everything"}
        </button>
      </section>

      <AuthSheet
        open={sheet && reauth}
        onClose={() => setSheet(false)}
        next="/account"
        heading="Sign in again to continue"
      />
    </Shell>
  );
}
