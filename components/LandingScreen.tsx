"use client";

import { ShieldCheck, Ban, MessageCircleQuestion } from "lucide-react";

export default function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col justify-center px-6 py-16 sm:py-24">
        <p className="text-sm font-medium tracking-wide text-navy-600 uppercase mb-4">
          CarDhoondo
        </p>

        <h1 className="text-3xl sm:text-5xl font-semibold text-ink leading-tight text-balance">
          Asked chacha. Asked colleagues. Watched 15 YouTube videos.
          <br className="hidden sm:block" /> Still confused which car to buy?
        </h1>

        <p className="mt-6 text-lg text-ink-soft max-w-xl">
          Answer 13 quick questions about how you actually drive and live. We'll match your
          answers against real, evidence-backed car reviews and recommend 2–3 cars that
          genuinely fit — with the reasoning shown, not just the verdict.
        </p>

        <button
          onClick={onStart}
          className="mt-10 w-fit rounded-full bg-navy-800 px-8 py-4 text-base font-medium text-white shadow-sm transition hover:bg-navy-900 active:scale-[0.98]"
        >
          Find my car
        </button>
        <p className="mt-3 text-sm text-ink-faint">Takes about 3 minutes. No signup required.</p>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <TrustPoint
            icon={Ban}
            title="No dealer commissions"
            body="We don't take a cut from any dealer or manufacturer for a recommendation."
          />
          <TrustPoint
            icon={MessageCircleQuestion}
            title="No sponsored results"
            body="Every car shown is ranked purely on how well it fits your answers."
          />
          <TrustPoint
            icon={ShieldCheck}
            title="Evidence, not opinion"
            body="Every reason we give is backed by a real review — you can see the quote."
          />
        </div>
      </div>
    </main>
  );
}

function TrustPoint({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Icon className="h-5 w-5 text-navy-700" strokeWidth={1.75} />
      <p className="font-medium text-ink text-sm">{title}</p>
      <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
    </div>
  );
}
