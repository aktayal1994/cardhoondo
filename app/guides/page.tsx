import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const TITLE = "Car Buying Guides for India";
const DESCRIPTION =
  "Straight answers to the questions every Indian car buyer gets stuck on — fuel type, transmission, dealer tactics, and why everyone's advice conflicts. No sponsored picks.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guides" },
};

const GUIDES = [
  {
    href: "/guides/why-everyone-has-different-opinion",
    eyebrow: "Decision paralysis",
    title: "Why Does Everyone Have a Different Opinion on Which Car to Buy?",
    dek: "Asked chacha, asked colleagues, watched 15 YouTube videos — here's why the advice always conflicts.",
  },
  {
    href: "/guides/petrol-diesel-or-cng",
    eyebrow: "Fuel type",
    title: "Petrol, Diesel or CNG? How to Actually Decide in 2026",
    dek: "The real running-cost math, and why the right fuel type depends on your mileage, not a general ranking.",
  },
  {
    href: "/guides/manual-vs-automatic-india",
    eyebrow: "Transmission",
    title: "Manual or Automatic for Indian Traffic? The Honest Answer",
    dek: "AMT, CVT, torque-converter, DCT — they're not the same, and the right one depends on your commute.",
  },
  {
    href: "/guides/dealer-tricks-first-car",
    eyebrow: "Before you sign",
    title: "5 Car Dealer Tricks First-Time Buyers in India Should Know",
    dek: "The variant ladder, the quote with hidden line items, EMI framing, and what to actually check before you sign.",
  },
];

export default function GuidesIndexPage() {
  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center" aria-label="CarDhoondo home">
            <Image
              src="/cardhoondo-logo.png"
              alt="CarDhoondo — Your Perfect Car Found"
              width={489}
              height={105}
              className="h-8 w-auto sm:h-9"
            />
          </Link>
          <Link
            href="/questionnaire/intro"
            className="rounded-full bg-accent-gold px-5 py-2.5 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
          >
            Find my car
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-14">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-navy-600">Guides</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-balance text-ink sm:text-4xl">{TITLE}</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">{DESCRIPTION}</p>

        <div className="mt-10 flex flex-col gap-4">
          {GUIDES.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="group rounded-2xl border border-border bg-paper-raised p-6 transition hover:border-accent-gold/50 hover:shadow-sm"
            >
              <p className="font-display text-xs font-semibold uppercase tracking-wide text-navy-600">
                {g.eyebrow}
              </p>
              <h2 className="mt-2 font-display text-xl font-bold text-ink">{g.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{g.dek}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-gold">
                Read guide{" "}
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
