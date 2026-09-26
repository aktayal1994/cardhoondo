/** Shared types for the dealer-quote check (lib/quote/*). Everything in this
 * folder is deterministic -- no AI model ever sees a quote, so nothing a
 * person types here can leak to a third party (see the Privacy Policy). */

export type QuoteCategory =
  | "ex_showroom"
  | "discount"
  | "rto"
  | "hsrp"
  | "tcs"
  | "fastag"
  | "insurance"
  | "extended_warranty"
  | "service_package"
  | "roadside_assistance"
  | "finance_fee"
  | "protection_coating"
  | "dealer_fees"
  | "accessories"
  | "other";

export const CATEGORY_LABELS: Record<QuoteCategory, string> = {
  ex_showroom: "Ex-showroom price",
  discount: "Discount / offer",
  rto: "Road tax & registration",
  hsrp: "Number plate (HSRP)",
  tcs: "TCS (tax)",
  fastag: "FASTag",
  insurance: "Insurance",
  extended_warranty: "Extended warranty",
  service_package: "Service package / AMC",
  roadside_assistance: "Roadside assistance",
  finance_fee: "Loan / finance fees",
  protection_coating: "Coatings & protection",
  dealer_fees: "Dealer charges",
  accessories: "Accessories",
  other: "Something else",
};

/** Amount is in rupees. Charges are positive, discounts negative. */
export interface QuoteItem {
  label: string;
  amount: number;
  category: QuoteCategory;
}

/** What we compare the quote against, from our own price data. */
export interface QuoteBenchmark {
  ex_showroom_price: number | null;
  rto: number | null;
  insurance: number | null;
  on_road_price: number | null;
  /** "scraped" = a real per-city price we collected for this exact variant;
   * "estimated" = a state-level estimate, so every check is looser. */
  source: "scraped" | "estimated";
  city_name: string;
}

export type FindingSeverity = "challenge" | "optional" | "good" | "info";
export type FindingAction = "skip" | "defer" | "negotiate" | "verify" | "none";

export interface Finding {
  id: string;
  category: QuoteCategory | "total" | "overall";
  severity: FindingSeverity;
  action: FindingAction;
  title: string;
  detail: string;
  /** A sentence the person can say or send to the dealer. */
  ask?: string;
  /** Rupees this finding is about (the excess, or the optional amount). */
  amount: number | null;
  /** The quote lines behind this finding, for display. */
  items?: { label: string; amount: number }[];
}

export interface QuoteAnalysis {
  quoted_total: number;
  declared_total: number | null;
  by_category: { category: QuoteCategory; label: string; amount: number }[];
  findings: Finding[];
  savings: {
    /** Overpayment vs typical, and charges that are generally negotiable. */
    challenge: number;
    /** Real but optional extras -- the person's call. */
    optional: number;
  };
  benchmark: QuoteBenchmark | null;
}
