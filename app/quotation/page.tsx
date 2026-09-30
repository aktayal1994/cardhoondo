import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "../../components/Breadcrumbs";
import QuotationFlowWithParams from "../../components/QuotationFlowWithParams";

/**
 * Standalone dealer-quote check -- reachable directly (nav links) and, with
 * ?car=&variant=, as a pre-filled deep link from a shortlisted car on the
 * results/evidence screens. Not part of the questionnaire SPA state machine
 * in app/page.tsx: a real route, same pattern /guides/* uses.
 *
 * This file is a server component on purpose: the interactive flow reads the
 * query string (which forces it to render only in the browser), so the H1,
 * intro and explanatory sections live out here where crawlers get real text
 * in the first HTML response.
 */
export default function QuotationPage() {
  return (
    <main className="min-h-screen bg-paper">
      <QuotationNav />
      <div className="mx-auto max-w-xl px-4 pt-6 sm:px-6">
        <Breadcrumbs trail={[{ name: "Dealer quote check" }]} />
      </div>
      <Suspense fallback={<QuoteIntro />}>
        <QuotationFlowWithParams />
      </Suspense>
      <QuoteExplainer />
    </main>
  );
}

/** Server-rendered stand-in shown until the interactive flow loads; same
 * words as the flow's own header so the swap is invisible. */
function QuoteIntro() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">Dealer quote check</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">Got a quote from a dealer? See where you can save.</h1>
      <p className="mt-2 text-ink-soft">
        Enter what the dealer quoted. We compare it with real prices for your city and flag the insurance, accessories,
        service add-ons and fees you can question, with the exact words to ask.
      </p>
    </div>
  );
}

function QuoteExplainer() {
  return (
    <section className="mx-auto max-w-xl px-4 pb-16 sm:px-6">
      <div className="border-t border-border pt-10">
        <h2 className="font-display text-xl font-bold text-ink">What the car dealer quote check looks at</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          A dealer&rsquo;s on-road price quote is rarely just the car, RTO and insurance. It is often padded with extras that
          are optional or negotiable. We split your quote into its lines and compare them with real on-road prices for your
          city.
        </p>

        <h3 className="mt-6 font-display text-base font-semibold text-ink">Car insurance quoted by the dealer</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Dealers often quote their own insurance. You are free to buy a policy elsewhere, so we flag an insurance line that
          looks high and tell you what to ask.
        </p>

        <h3 className="mt-5 font-display text-base font-semibold text-ink">Accessories and add-on packages</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Seat covers, mats, coatings and &ldquo;compulsory&rdquo; accessory kits are usually optional and often cheaper
          outside the showroom. We separate them from the price of the car itself.
        </p>

        <h3 className="mt-5 font-display text-base font-semibold text-ink">Extended warranty and service packages</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Extended warranty, service and maintenance plans can be worth it, but you can decide later. We flag them so they
          don&rsquo;t slip in unnoticed.
        </p>

        <h3 className="mt-5 font-display text-base font-semibold text-ink">Dealer fees and handling charges</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Handling, documentation and &ldquo;logistics&rdquo; charges vary a lot between dealers. We show which lines you can
          question and the exact words to use.
        </p>

        <h2 className="mt-10 font-display text-xl font-bold text-ink">How the dealer quote check works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>Pick the car and variant the dealer quoted, and your city or pincode.</li>
          <li>Type or paste the lines of the quote.</li>
          <li>See the lines worth questioning, what they could add up to in rupees, and questions to ask the dealer.</li>
        </ol>

        <h2 className="mt-10 font-display text-xl font-bold text-ink">Dealer quote check: common questions</h2>
        <h3 className="mt-4 font-display text-base font-semibold text-ink">Does the quote check use AI?</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          No. The analysis follows fixed rules against on-road prices, and your quote is not sent to an AI model.
        </p>
        <h3 className="mt-5 font-display text-base font-semibold text-ink">Which cities have exact prices?</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          We hold on-road prices for 25 major cities. For other places we use a state-level estimate and say so in the
          result.
        </p>
        <h3 className="mt-5 font-display text-base font-semibold text-ink">Is my quote shared with the dealer?</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          No. We do not share your details with dealers. See our{" "}
          <Link href="/privacy" className="text-accent-rust underline underline-offset-2">
            privacy policy
          </Link>
          . Still deciding which car to buy? Read our{" "}
          <Link href="/guides/dealer-tricks-first-car" className="text-accent-rust underline underline-offset-2">
            guide to dealer tricks
          </Link>{" "}
          or{" "}
          <Link href="/cars" className="text-accent-rust underline underline-offset-2">
            browse car reviews
          </Link>
          .
        </p>
      </div>
    </section>
  );
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
          <Link href="/cars" className="transition hover:text-ink">
            Car reviews
          </Link>
          <Link href="/guides" className="transition hover:text-ink">
            Guides
          </Link>
          <Link href="/#why-cardhoondo" className="transition hover:text-ink">
            Why CarDhoondo
          </Link>
        </nav>
        <Link
          href="/questionnaire/core-requirements"
          className="rounded-full bg-accent-rust px-5 py-2.5 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
        >
          Find my car
        </Link>
      </div>
    </header>
  );
}
