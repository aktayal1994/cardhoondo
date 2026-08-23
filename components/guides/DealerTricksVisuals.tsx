import { ArrowRight, Check } from "lucide-react";

/**
 * Custom editorial data-viz for the dealer-tricks guide -- deliberately not
 * stock photography or generic "salesperson talking to buyer" illustrations.
 * Each one answers a specific question the surrounding prose just raised
 * ("what does this look like", "what should I check"), per the visual brief:
 * decoration is out, information is in. Prices throughout are illustrative
 * examples, explicitly labelled as such -- not a claim about any real car
 * or dealership.
 */

function VisualLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-xs font-semibold uppercase tracking-wide text-navy-600">
      {children}
    </p>
  );
}

function VisualCaption({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-center text-sm text-ink-soft">{children}</p>;
}

/* ---------------------------------------------------------------------- */
/* Visual 1 -- The Variant Ladder                                          */
/* ---------------------------------------------------------------------- */

const VARIANT_TIERS = [
  { name: "Base", price: "₹9.99L", adds: ["Manual AC", "Steel wheels"] },
  { name: "Mid", price: "₹10.69L", adds: ["+ Touchscreen", "+ Rear camera"] },
  { name: "Top", price: "₹11.49L", adds: ["+ Alloy wheels", "+ Sunroof"] },
] as const;

export function VariantLadderVisual() {
  return (
    <div className="not-prose my-8 rounded-2xl border border-border bg-paper-raised p-6">
      <VisualLabel>Illustrative example</VisualLabel>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {VARIANT_TIERS.map((tier, i) => (
          <div
            key={tier.name}
            className={`rounded-xl border p-3 sm:p-4 ${
              i === 2 ? "border-accent-gold bg-accent-gold/5" : "border-border bg-paper"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{tier.name}</p>
            <p className="mt-1 font-mono text-lg font-semibold text-ink sm:text-xl">{tier.price}</p>
            <ul className="mt-3 space-y-1.5">
              {tier.adds.map((f) => (
                <li key={f} className="text-xs leading-snug text-ink-soft sm:text-sm">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <VisualCaption>
        The question that matters: are the extra features worth the extra ₹1.50L? Price out the gap
        per feature, not as one bundled &ldquo;upgrade.&rdquo;
      </VisualCaption>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Visual 2 -- The Quote Breakdown                                         */
/* ---------------------------------------------------------------------- */

const QUOTE_LINES = [
  { label: "Ex-showroom price", amount: "₹9,45,000", verify: false },
  { label: "RTO registration", amount: "₹1,08,000", verify: false },
  { label: "Insurance (dealer-arranged)", amount: "₹52,000", verify: true },
  { label: "Accessories package", amount: "₹38,000", verify: true },
  { label: "Extended warranty", amount: "₹24,000", verify: true },
] as const;

export function QuoteBreakdownVisual() {
  const total = "₹11,67,000";
  return (
    <div className="not-prose my-8 rounded-2xl border border-border bg-paper-raised p-6">
      <VisualLabel>Illustrative example</VisualLabel>
      <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
        {QUOTE_LINES.map((line) => (
          <div key={line.label} className="flex items-center justify-between gap-3 bg-paper px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-ink">
              {line.label}
              {line.verify && (
                <span className="rounded-full bg-accent-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-gold">
                  Verify separately
                </span>
              )}
            </span>
            <span className="shrink-0 font-mono text-sm text-ink-soft">{line.amount}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 bg-stage px-4 py-3">
          <span className="text-sm font-semibold text-stage-ink">On-road price</span>
          <span className="font-mono text-sm font-semibold text-stage-ink">{total}</span>
        </div>
      </div>
      <VisualCaption>
        Don&rsquo;t just look at the final on-road number — ask for every line item, and get an
        independent quote for anything marked &ldquo;verify separately.&rdquo;
      </VisualCaption>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Visual 3 -- The "Only Today" Pressure                                   */
/* ---------------------------------------------------------------------- */

export function UrgencyVisual() {
  return (
    <div className="not-prose my-8 rounded-2xl border border-border bg-paper-raised p-6">
      <VisualLabel>Illustrative example</VisualLabel>
      <div className="mt-4 rounded-xl border border-accent-gold/40 bg-accent-gold/5 p-4 text-center">
        <p className="font-display text-lg font-bold text-ink sm:text-xl">₹45,000 off — today only</p>
        <p className="mt-1 text-xs text-ink-faint">Verbal offer, no validity date given</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft sm:text-sm">
        <span className="rounded-full border border-border bg-paper px-3 py-1.5">Get it in writing</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
        <span className="rounded-full border border-border bg-paper px-3 py-1.5">Compare elsewhere</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
        <span className="rounded-full bg-accent-gold px-3 py-1.5 text-stage">Then decide</span>
      </div>
      <VisualCaption>
        A genuine best price survives a written quotation and a second opinion. One that
        can&rsquo;t is telling you something.
      </VisualCaption>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Visual 4 -- EMI vs Total Cost                                           */
/* ---------------------------------------------------------------------- */

export function EmiVsTotalVisual() {
  return (
    <div className="not-prose my-8 rounded-2xl border border-border bg-paper-raised p-6">
      <VisualLabel>Illustrative example</VisualLabel>
      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="rounded-xl border border-border bg-paper px-5 py-3 text-center">
          <p className="font-mono text-xl font-semibold text-ink">₹2,000 more / month</p>
          <p className="mt-0.5 text-xs text-ink-faint">how it&rsquo;s pitched to you</p>
        </div>
        <span className="font-mono text-xs text-ink-faint">× 60 months</span>
        <div className="flex items-center gap-2 rounded-xl border border-accent-gold bg-accent-gold/10 px-5 py-3 text-center">
          <Check className="h-4 w-4 shrink-0 text-accent-gold" />
          <div>
            <p className="font-mono text-xl font-semibold text-ink">₹1,20,000 more</p>
            <p className="mt-0.5 text-xs text-ink-faint">what it actually costs, before interest</p>
          </div>
        </div>
      </div>
      <VisualCaption>
        Always compare the total amount payable over the loan, not just the monthly number — a
        smaller EMI can hide a longer tenure, not a better deal.
      </VisualCaption>
    </div>
  );
}
