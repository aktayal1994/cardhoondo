import { PRESSURE_WORDS } from "./categorize";
import {
  CATEGORY_LABELS,
  type Finding,
  type QuoteAnalysis,
  type QuoteBenchmark,
  type QuoteCategory,
  type QuoteItem,
} from "./types";

/**
 * Compares a dealer's quote against our own price data and against what is
 * generally avoidable, and says where the buyer can save. Pure and
 * deterministic: the same quote always gives the same answer, no AI is
 * involved, and every rupee figure in the output is either a line the person
 * entered or a benchmark from our catalog -- never an invented "typical price"
 * for an accessory or a service.
 *
 * Tone rule: this is not a verdict on the dealer. Some extras are worth
 * having. Each finding says what the item is, why it can be trimmed, and
 * exactly what to ask.
 */

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const sum = (items: QuoteItem[]) => items.reduce((t, i) => t + i.amount, 0);
const listItems = (items: QuoteItem[]) => items.map((i) => ({ label: i.label, amount: i.amount }));

type Bucket = "challenge" | "optional" | null;
interface Internal extends Finding {
  bucket: Bucket;
}

export function analyzeQuote(input: {
  items: QuoteItem[];
  declared_total: number | null;
  benchmark: QuoteBenchmark | null;
  brand: string;
  variantLabel: string;
}): QuoteAnalysis {
  const { items, declared_total, benchmark, brand, variantLabel } = input;
  const byCat = (c: QuoteCategory) => items.filter((i) => i.category === c);
  const total = (c: QuoteCategory) => sum(byCat(c));

  const quotedTotal = sum(items);
  // Estimated benchmarks are a state-level average, not this car's real price,
  // so every "above typical" test is twice as forgiving.
  const loose = benchmark?.source === "estimated" ? 2 : 1;
  const city = benchmark?.city_name ?? "your city";
  const approx = benchmark?.source === "estimated" ? "roughly " : "";

  const out: Internal[] = [];
  const push = (f: Omit<Internal, "bucket"> & { bucket?: Bucket }) => out.push({ bucket: null, ...f });

  // --- Ex-showroom: set by the manufacturer, dealers shouldn't add to it ---
  const ex = total("ex_showroom");
  if (ex > 0 && benchmark?.ex_showroom_price) {
    const diff = ex - benchmark.ex_showroom_price;
    if (diff > Math.max(2000 * loose, benchmark.ex_showroom_price * 0.005 * loose)) {
      push({
        id: "ex_showroom_high",
        category: "ex_showroom",
        severity: "challenge",
        action: "verify",
        bucket: "challenge",
        title: `Ex-showroom price is ${inr(diff)} above the list price`,
        detail: `The published ex-showroom price for this variant is ${approx}${inr(benchmark.ex_showroom_price)}. A gap can come from a paint colour or an optional pack, but the ex-showroom price is set by the manufacturer, so a dealer shouldn't add to it.`,
        ask: `The ex-showroom price on your quote is ${inr(diff)} higher than the manufacturer's list price for the ${variantLabel}. What does the difference cover?`,
        amount: diff,
      });
    } else {
      push({
        id: "ex_showroom_ok",
        category: "ex_showroom",
        severity: "good",
        action: "none",
        title: "Ex-showroom price matches the list price",
        detail: `Your quote has ${inr(ex)}; the published price is ${approx}${inr(benchmark.ex_showroom_price)}.`,
        amount: null,
      });
    }
  }

  // --- Discounts ---
  const discounts = -total("discount");
  if (discounts > 0) {
    push({
      id: "discount_present",
      category: "discount",
      severity: "good",
      action: "none",
      title: `You already have ${inr(discounts)} in discounts`,
      detail: "Good. It's still worth asking whether more is available (see the questions below).",
      amount: null,
      items: listItems(byCat("discount")),
    });
  } else {
    push({
      id: "discount_none",
      category: "discount",
      severity: "info",
      action: "negotiate",
      title: "There's no discount on this quote",
      detail:
        "Most dealers have something to offer: an exchange bonus if you're trading in a car, a corporate or loyalty offer, or a month-end target. It usually only appears when you ask.",
      ask: "Are there any exchange, corporate, loyalty or month-end offers on this car? Please put the best final price in writing.",
      amount: null,
    });
  }

  // --- Road tax & registration: set by the state, so it shouldn't vary between dealers ---
  const rto = total("rto");
  if (rto > 0 && benchmark?.rto) {
    const diff = rto - benchmark.rto;
    if (diff > Math.max(5000 * loose, benchmark.rto * 0.05 * loose)) {
      push({
        id: "rto_high",
        category: "rto",
        severity: "challenge",
        action: "verify",
        bucket: "challenge",
        title: `Road tax & registration is ${inr(diff)} above the usual rate`,
        detail: `For this car in ${city} we'd expect ${approx}${inr(benchmark.rto)}. Road tax is fixed by the state, so it shouldn't change from dealer to dealer. If your quote bundles other things under "registration", that could explain it.`,
        ask: "Please break the registration line into road tax, registration fee, cess and any other item, with the official rate for each.",
        amount: diff,
        items: listItems(byCat("rto")),
      });
    } else {
      push({
        id: "rto_ok",
        category: "rto",
        severity: "good",
        action: "none",
        title: "Road tax & registration looks in line",
        detail: `Your quote has ${inr(rto)}; we'd expect ${approx}${inr(benchmark.rto)} in ${city}.`,
        amount: null,
      });
    }
  }

  // --- Insurance: the biggest place dealers add margin, and you can choose your own insurer ---
  const ins = total("insurance");
  if (ins > 0 && benchmark?.insurance) {
    const excess = ins - benchmark.insurance;
    if (excess > Math.max(3000 * loose, benchmark.insurance * 0.1 * loose)) {
      push({
        id: "insurance_high",
        category: "insurance",
        severity: "challenge",
        action: "negotiate",
        bucket: "challenge",
        title: `Insurance is ${inr(excess)} above the typical premium`,
        detail: `A first-year comprehensive policy for this car in ${city} typically costs ${approx}${inr(benchmark.insurance)}. Your quote has ${inr(ins)}. Add-ons such as zero depreciation raise the price, so compare like for like. You can buy the policy from any insurer you like; the dealer can't require theirs.`,
        ask: "Please give me the insurance breakup: insured value, own-damage, third-party and each add-on. I'll compare it with a quote from my own insurer.",
        amount: excess,
        items: listItems(byCat("insurance")),
      });
    } else {
      push({
        id: "insurance_ok",
        category: "insurance",
        severity: "good",
        action: "none",
        title: "Insurance looks in line",
        detail: `Your quote has ${inr(ins)}; a first-year policy for this car in ${city} typically costs ${approx}${inr(benchmark.insurance)}. You can still compare with an insurer directly.`,
        amount: null,
      });
    }
  } else if (ins > 0) {
    push({
      id: "insurance_compare",
      category: "insurance",
      severity: "info",
      action: "negotiate",
      title: `Insurance is ${inr(ins)}: compare it with your own insurer`,
      detail: "We don't have a benchmark for this car yet, but dealer-arranged insurance is worth comparing. You can buy the policy from any insurer; the dealer can't require theirs.",
      ask: "Please give me the insurance breakup (insured value, own-damage, third-party and each add-on) so I can compare it with my own insurer.",
      amount: null,
      items: listItems(byCat("insurance")),
    });
  } else if (ins === 0 && !byCat("insurance").length) {
    push({
      id: "insurance_missing",
      category: "insurance",
      severity: "info",
      action: "verify",
      title: "There's no insurance line",
      detail: "Insurance is usually added at billing. Ask for the figure now so it can't grow later, and remember you can buy it from any insurer.",
      ask: "What insurance amount will be added at billing, and can I bring my own policy?",
      amount: null,
    });
  }

  // --- TCS: a real tax, but only above ₹10 lakh ---
  const tcs = total("tcs");
  if (tcs > 0) {
    const exRef = ex || benchmark?.ex_showroom_price || 0;
    if (exRef > 0 && exRef <= 1_000_000) {
      push({
        id: "tcs_unexpected",
        category: "tcs",
        severity: "challenge",
        action: "verify",
        bucket: "challenge",
        title: "TCS may not apply at this price",
        detail: `Tax collected at source (TCS) applies to cars above ₹10 lakh ex-showroom under current rules. This car is about ${inr(exRef)}.`,
        ask: "Why is TCS on my quote when the ex-showroom price is under ₹10 lakh?",
        amount: tcs,
      });
    } else if (exRef > 1_000_000 && tcs > exRef * 0.01 * 1.25 + 1000) {
      push({
        id: "tcs_high",
        category: "tcs",
        severity: "challenge",
        action: "verify",
        bucket: "challenge",
        title: "TCS looks higher than 1%",
        detail: `TCS on a car is currently 1% of the price, which would be about ${inr(exRef * 0.01)} here. Your quote has ${inr(tcs)}.`,
        ask: "Please show how the TCS amount is calculated.",
        amount: Math.max(tcs - exRef * 0.01, 0),
      });
    } else {
      push({
        id: "tcs_info",
        category: "tcs",
        severity: "info",
        action: "none",
        title: "TCS is a tax, not a dealer charge",
        detail: "Tax collected at source is charged on cars above ₹10 lakh. It's not the dealer's money, and you can claim it as credit when you file your income tax return.",
        amount: null,
      });
    }
  }

  // --- Number plate ---
  const hsrp = total("hsrp");
  if (hsrp > 3000) {
    push({
      id: "hsrp_high",
      category: "hsrp",
      severity: "challenge",
      action: "verify",
      title: "The number plate charge looks high",
      detail: `A high-security number plate is a small government-set fee, usually a few hundred to about a thousand rupees. Your quote has ${inr(hsrp)}.`,
      ask: "Please show the official receipt or rate for the number plate charge.",
      amount: null,
    });
  }

  // --- Junk fees: dealer-set, not government or manufacturer ---
  const fees = byCat("dealer_fees");
  if (fees.length) {
    push({
      id: "dealer_fees",
      category: "dealer_fees",
      severity: "challenge",
      action: "negotiate",
      bucket: "challenge",
      title: `${inr(sum(fees))} in dealer charges`,
      detail:
        "Handling, logistics, documentation and similar charges are set by the dealer. They aren't government taxes or manufacturer fees, and they're commonly negotiable. Ask what each one pays for.",
      ask: "Please remove the handling, logistics and documentation charges, or show me exactly what each one covers.",
      amount: sum(fees),
      items: listItems(fees),
    });
  }

  // --- Coatings and "protection" packs ---
  const coatings = byCat("protection_coating");
  if (coatings.length) {
    push({
      id: "protection_coating",
      category: "protection_coating",
      severity: "challenge",
      action: "skip",
      bucket: "challenge",
      title: `${inr(sum(coatings))} for coatings and protection packs`,
      detail:
        "Modern cars usually leave the factory with rust-proofing already done, and these dealer-applied coatings are among the highest-margin extras. Most buyers can skip them. If you want one, a specialist after delivery often charges less.",
      ask: "Is this coating applied on top of the factory treatment? Please drop it from the quote, or tell me the brand and the warranty in writing.",
      amount: sum(coatings),
      items: listItems(coatings),
    });
  }

  // --- Loan and finance fees ---
  const finance = byCat("finance_fee");
  if (finance.length) {
    push({
      id: "finance_fee",
      category: "finance_fee",
      severity: "challenge",
      action: "negotiate",
      bucket: "challenge",
      title: `${inr(sum(finance))} in loan and finance charges`,
      detail:
        "Processing and file charges are negotiable, and you don't have to take the dealer's loan. Get one offer from your own bank and compare the total amount you'll repay, not just the monthly instalment.",
      ask: "Can the processing charges be waived? I'm also getting an offer from my own bank.",
      amount: sum(finance),
      items: listItems(finance),
    });
  }

  // --- Accessories ---
  const acc = byCat("accessories");
  if (acc.length) {
    const accTotal = sum(acc);
    const exForPct = ex || benchmark?.ex_showroom_price || 0;
    const pctText = exForPct > 0 ? ` That's about ${((accTotal / exForPct) * 100).toFixed(1)}% of the car's price.` : "";
    const pressured = acc.some((i) => PRESSURE_WORDS.test(i.label));
    push({
      id: "accessories",
      category: "accessories",
      severity: pressured ? "challenge" : "optional",
      action: "skip",
      bucket: "optional",
      title: pressured ? `${inr(accTotal)} of accessories marked "mandatory"` : `${inr(accTotal)} of accessories`,
      detail:
        `Accessories aren't needed to register or drive the car.${pctText} ` +
        (pressured
          ? `If you're told they're "mandatory" to get delivery, ask for that in writing; it's a common pressure tactic. `
          : "") +
        "Ask for each item priced separately. Fitted after delivery, the same items usually cost less at an accessories shop.",
      ask: "Please list each accessory with its own price. I'll choose the ones I want, and I don't want any bundled into the on-road figure.",
      amount: accTotal,
      items: listItems(acc),
    });
  }

  // --- Extended warranty ---
  const ew = byCat("extended_warranty");
  if (ew.length) {
    push({
      id: "extended_warranty",
      category: "extended_warranty",
      severity: "optional",
      action: "defer",
      bucket: "optional",
      title: `${inr(sum(ew))} for an extended warranty`,
      detail: `You don't have to decide on delivery day. ${brand} cars come with a standard warranty, and an extended one can usually be bought later, before the standard one ends. Confirm that with ${brand} in writing, along with what it covers after the standard period.`,
      ask: "Can I buy the extended warranty later, before the standard warranty ends, at the same price? What does it cover in the extra years?",
      amount: sum(ew),
      items: listItems(ew),
    });
  }

  // --- Service package / AMC ---
  const svc = byCat("service_package");
  if (svc.length) {
    push({
      id: "service_package",
      category: "service_package",
      severity: "optional",
      action: "defer",
      bucket: "optional",
      title: `${inr(sum(svc))} for a prepaid service package`,
      detail:
        "These make sense only if you're sure to service at this dealer for the whole period. Compare the package with the price list for the same services, and check which services are already free in the first year or two.",
      ask: "Please give me the price list for each scheduled service without the package, and which services are free already.",
      amount: sum(svc),
      items: listItems(svc),
    });
  }

  // --- Roadside assistance ---
  const rsa = byCat("roadside_assistance");
  if (rsa.length) {
    push({
      id: "roadside_assistance",
      category: "roadside_assistance",
      severity: "optional",
      action: "defer",
      bucket: "optional",
      title: `${inr(sum(rsa))} for roadside assistance`,
      detail:
        "Many cars already include roadside assistance for the first year or more, and many insurers offer it as an add-on. Check what's included before paying separately.",
      ask: "How long is roadside assistance included with the car at no extra charge?",
      amount: sum(rsa),
      items: listItems(rsa),
    });
  }

  // --- FASTag ---
  const fastag = byCat("fastag");
  if (fastag.length) {
    push({
      id: "fastag",
      category: "fastag",
      severity: "optional",
      action: "skip",
      bucket: "optional",
      title: `${inr(sum(fastag))} for FASTag`,
      detail: "Fine if the price is small, but you can also get a FASTag directly from a bank or an app, so it needn't be part of the dealer's bill.",
      amount: sum(fastag),
      items: listItems(fastag),
    });
  }

  // --- Lines we couldn't place ---
  const other = byCat("other");
  if (other.length) {
    push({
      id: "other_items",
      category: "other",
      severity: "info",
      action: "verify",
      title: `${inr(sum(other))} we couldn't place`,
      detail: "We couldn't tell what these lines are. Ask the dealer what each is for before you agree. You can also change a line's type above and check again.",
      ask: "What is each of these charges for, and is it optional?",
      amount: null,
      items: listItems(other),
    });
  }

  // --- Lines that don't add up to the quote's own total ---
  if (declared_total != null) {
    const diff = quotedTotal - declared_total;
    if (Math.abs(diff) > Math.max(500, declared_total * 0.002)) {
      push({
        id: "total_mismatch",
        category: "total",
        severity: "challenge",
        action: "verify",
        title: `The lines don't add up to the quote's total`,
        detail: `The lines you entered add up to ${inr(quotedTotal)}, but the quote's total is ${inr(declared_total)}, a difference of ${inr(Math.abs(diff))}. Either a line is missing from what you entered, or the quote includes an amount that isn't itemised.`,
        ask: "Please itemise every amount in the total. My lines add up to a different figure from the total you've shown.",
        amount: null,
      });
    }
  }

  const order: Record<Finding["severity"], number> = { challenge: 0, optional: 1, info: 2, good: 3 };
  out.sort((a, b) => order[a.severity] - order[b.severity] || (b.amount ?? 0) - (a.amount ?? 0));

  const savings = out.reduce(
    (acc2, f) => {
      if (f.bucket === "challenge") acc2.challenge += f.amount ?? 0;
      if (f.bucket === "optional") acc2.optional += f.amount ?? 0;
      return acc2;
    },
    { challenge: 0, optional: 0 },
  );

  const cats = Array.from(new Set(items.map((i) => i.category)));
  return {
    quoted_total: quotedTotal,
    declared_total,
    by_category: cats.map((c) => ({ category: c, label: CATEGORY_LABELS[c], amount: total(c) })),
    findings: out.map(({ bucket: _bucket, ...f }) => f),
    savings,
    benchmark,
  };
}
