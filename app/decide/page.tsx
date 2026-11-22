import type { Metadata } from "next";
import { Suspense } from "react";
import Breadcrumbs from "../../components/Breadcrumbs";
import DecideFlow from "../../components/DecideFlow";
import { GuideFooter, GuideNav } from "../../components/GuideLayout";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Baleno or Swift? Creta or Seltos? Pick the Car That Suits You | CarDhoondo",
  description:
    "Stuck between two or three cars? Answer a few questions about how you drive and see which one suits you, based on real owner and expert reviews.",
  path: "/decide",
});

/**
 * "Decide between": the buyer brings 2-3 cars they already have in mind.
 * Server shell (heading and explainer in the first HTML) around the client
 * flow, which reads ?cars= so it renders only in the browser.
 */
export default function DecidePage() {
  return (
    <main className="min-h-screen bg-paper">
      <GuideNav />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="page-band">
          <Breadcrumbs trail={[{ name: "Decide between cars" }]} />
          <h1 className="mt-4 font-display text-3xl font-bold text-balance text-ink sm:text-4xl">
            Stuck between two cars? See which one suits you.
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-soft">
            Pick the cars you are deciding between, tell us how you drive, and we rank just those, using what owners and
            expert reviewers say. Takes about a minute. No phone number needed.
          </p>
        </div>
        <Suspense fallback={<p className="mt-8 text-sm text-ink-soft">Loading cars…</p>}>
          <DecideFlow />
        </Suspense>
      </article>
      <GuideFooter />
    </main>
  );
}
