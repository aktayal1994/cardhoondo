import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign-in problem",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, { title: string; body: string }> = {
  cancelled: { title: "Sign-in cancelled", body: "You didn't finish signing in with Google. Nothing was changed." },
  expired: { title: "That sign-in didn't complete", body: "The sign-in link expired or was already used. Please try again." },
  browser: {
    title: "Please start the sign-in again",
    body: "The sign-in started in a different browser or address than it finished in, or your browser cleared its data partway through. Open cardhoondo.com and tap Sign in again; it should work the second time.",
  },
  provider: {
    title: "Google sign-in isn't available right now",
    body: "We couldn't reach Google to start the sign-in. Please try again in a few minutes.",
  },
};

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const msg = MESSAGES[code ?? ""] ?? MESSAGES.expired;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="max-w-md rounded-[20px] border border-border bg-paper-raised p-8 text-center shadow-card">
        <h1 className="font-display text-2xl font-bold text-ink">{msg.title}</h1>
        <p className="mt-3 text-ink-soft">{msg.body}</p>
        <p className="mt-2 text-sm text-ink-faint">You can keep using CarDhoondo without signing in.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-accent-rust px-7 py-3 text-[15px] font-semibold text-charcoal-950 shadow-glow-sm transition hover:brightness-110"
        >
          Back to CarDhoondo
        </Link>
      </div>
    </main>
  );
}
