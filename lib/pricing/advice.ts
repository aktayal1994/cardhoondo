/**
 * Rule-based "how to bring this number down" tips for the quotation flow.
 * Deliberately not an LLM call (unlike the recommendation write-up) -- every
 * tip here is either a plain fact about how Indian dealer pricing works, or
 * a real comparison computed straight from catalog data already in hand, so
 * there's nothing that needs generation. Keeps the whole quotation flow free
 * of LLM cost/quota risk and, per the same "never re-derive or adjust a
 * score" instinct the recommendation-writeup skill follows, never invents a
 * number that isn't already sitting in the catalog/price breakdown.
 *
 * This is the free version of the idea logged in CLAUDE.md's "Paid Report
 * Add-On" section (brand-specific negotiation/PDI reports) -- deliberately
 * kept free for now, matching the project's Phase 1 trust-building stance;
 * a paid, deeper version is a possible future upsell, not built here.
 */

export interface VariantForComparison {
  variant_id: string;
  ex_showroom_price: number | null;
  spec_sections: Record<string, Record<string, unknown>>;
}

export interface AdviceTip {
  id: string;
  title: string;
  body: string;
}

function flattenTrueFeatures(specSections: Record<string, Record<string, unknown>>): Set<string> {
  const out = new Set<string>();
  for (const section of Object.values(specSections ?? {})) {
    for (const [label, value] of Object.entries(section ?? {})) {
      if (value === true) out.add(label);
    }
  }
  return out;
}

/** Finds the next-cheapest variant of the same car and, if the gap is small
 * relative to the target's own price, lists what that gap is actually
 * buying -- the concrete version of "don't let the dealer walk you up to
 * the top variant" rather than just saying it in the abstract. */
function variantTrapTip(target: VariantForComparison, siblings: VariantForComparison[]): AdviceTip | null {
  if (target.ex_showroom_price == null) return null;
  const cheaper = siblings
    .filter((v) => v.variant_id !== target.variant_id && v.ex_showroom_price != null && v.ex_showroom_price < target.ex_showroom_price!)
    .sort((a, b) => b.ex_showroom_price! - a.ex_showroom_price!)[0];
  if (!cheaper) return null;

  const gap = target.ex_showroom_price - cheaper.ex_showroom_price!;
  const gapPct = gap / target.ex_showroom_price;

  // Below this, the "gap" is just two trim badges landing on the same
  // showroom price point (a real, common CarDekho pattern -- e.g. two
  // otherwise-identical variants a few rupees apart) rather than a real
  // negotiating lever. A ₹1 "you could save ₹1" tip reads as a bug, not
  // advice, so skip it rather than surface noise as a finding.
  const MIN_MEANINGFUL_GAP = 10_000;
  if (gap < MIN_MEANINGFUL_GAP) return null;

  const targetFeatures = flattenTrueFeatures(target.spec_sections);
  const cheaperFeatures = flattenTrueFeatures(cheaper.spec_sections);
  const gained = [...targetFeatures].filter((f) => !cheaperFeatures.has(f));

  if (gapPct > 0.12) {
    // A big jump to the next variant down usually means a real trim/engine
    // change, not a thin "trap" gap -- not worth a misleading tip here.
    return null;
  }

  const gainedList = gained.slice(0, 6);
  const body = gainedList.length
    ? `Going with ${cheaper.variant_id} instead saves about ₹${gap.toLocaleString("en-IN")} (ex-showroom). What you'd give up: ${gainedList.join(", ")}${gained.length > gainedList.length ? ", and a few more" : ""}. Worth deciding upfront whether you'd actually use these, rather than getting walked up to this variant in the showroom.`
    : `Going with ${cheaper.variant_id} instead saves about ₹${gap.toLocaleString("en-IN")} (ex-showroom) for a similar spec sheet on paper — worth asking your dealer exactly what the difference is before paying the premium.`;

  return {
    id: "variant_trap",
    title: `The ${cheaper.variant_id} is close in price`,
    body,
  };
}

function optionalAccessoriesTip(optionalAccessoriesAmount: number | null | undefined): AdviceTip | null {
  if (!optionalAccessoriesAmount || optionalAccessoriesAmount <= 0) return null;
  return {
    id: "optional_accessories",
    title: "Some of this quote is optional",
    body: `About ₹${optionalAccessoriesAmount.toLocaleString("en-IN")} of a typical on-road quote for this car is optional accessories and extended warranty, not a legal requirement to register the car. It's fine to say no to some or all of it, or to price it separately, rather than accepting it as part of a single bundled number.`,
  };
}

const STATIC_TIPS: AdviceTip[] = [
  {
    id: "insurance_shop_around",
    title: "Buy insurance separately if the numbers don't match",
    body: "Dealer-bundled insurance is sometimes priced higher than buying the same coverage directly from an insurer or a broker. It's worth comparing before you sign — the coverage can be identical either way.",
  },
  {
    id: "multiple_dealer_quotes",
    title: "Ex-showroom price isn't always fixed",
    body: "The same variant can be quoted a few thousand rupees apart by different dealers in the same city. Getting quotes from at least two dealers before finalizing is a real, if small, negotiating lever.",
  },
  {
    id: "timing",
    title: "Timing affects the discount you're offered",
    body: "Dealers typically work against monthly and quarterly sales targets. Asking for a best-and-final offer in the last week of the month, or during a festive/year-end clearance window, tends to surface a bigger discount than the same ask mid-month.",
  },
  {
    id: "exchange_loyalty",
    title: "Ask about exchange and loyalty bonuses directly",
    body: "If you're exchanging an old car, or someone in your family already owns a car from the same brand, exchange bonus and loyalty discounts usually exist — but dealers don't always volunteer them unless you specifically ask.",
  },
];

export function buildAdvice(params: {
  targetVariant: VariantForComparison;
  siblingVariants: VariantForComparison[];
  optionalAccessoriesAmount?: number | null;
}): AdviceTip[] {
  const tips: AdviceTip[] = [];
  const trap = variantTrapTip(params.targetVariant, params.siblingVariants);
  if (trap) tips.push(trap);
  const accessories = optionalAccessoriesTip(params.optionalAccessoriesAmount);
  if (accessories) tips.push(accessories);
  tips.push(...STATIC_TIPS);
  return tips;
}
