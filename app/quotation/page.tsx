"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QuotationFlow from "../../components/QuotationFlow";

/**
 * Standalone "check my on-road price" route -- reachable directly (nav link
 * in LandingScreen.tsx / GuideLayout.tsx) and, with ?car=&variant=, as a
 * pre-filled deep link from a shortlisted car on the results/evidence
 * screens. Not part of the questionnaire SPA state machine in app/page.tsx
 * -- same "real route, not a client callback" pattern /guides/* already
 * uses (see GuideLayout.tsx).
 */
export default function QuotationPage() {
  return (
    <main className="min-h-screen bg-paper">
      <QuotationNav />
      <Suspense fallback={null}>
        <QuotationFlowWithParams />
      </Suspense>
    </main>
  );
}

function QuotationFlowWithParams() {
  const searchParams = useSearchParams();
  const car = searchParams.get("car") ?? undefined;
  const variant = searchParams.get("variant") ?? undefined;
  return <QuotationFlow initialCarId={car} initialVariantId={variant} />;
}

function QuotationNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5" aria-label="CarDhoondo home">
          <Image src="/cardhoondo-icon.png" alt="" width={237} height={237} className="h-8 w-8" />
          <span className="font-display text-base font-bold text-ink">CarDhoondo</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft sm:flex">
          <Link href="/guides" className="transition hover:text-ink">
            Guides
          </Link>
          <Link href="/#why-cardhoondo" className="transition hover:text-ink">
            Why CarDhoondo
          </Link>
        </nav>
        <Link
          href="/questionnaire/intro"
          className="rounded-full bg-accent-rust px-5 py-2.5 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
        >
          Find my car
        </Link>
      </div>
    </header>
  );
}
