/**
 * TypeScript port of scripts/recommend.py. Structural catalog filters
 * (q_budget/q_fuel/q_seating/q_transmission/q_brand_avoid) narrow the field,
 * scoreCar() runs across every surviving variant, a soft parking-tightness
 * penalty, a budget-based size grading and a fuel-recommendation nudge get applied, results are deduped to
 * the best-scoring variant per car (never two variants of the same car on
 * the shortlist), survivors are ranked.
 *
 * See docs/questionnaire.md (v3) for the full rationale behind each filter
 * and soft adjustment below.
 *
 * Unlike the Python version, this doesn't read local JSON files -- it's a
 * pure function over already-fetched data, so the Next.js API route (which
 * knows how to talk to Supabase) is the only thing that needs I/O. See
 * web/lib/data/fetchRecommendationData.ts for the Supabase-fetching side.
 */
import { scoreCar } from "./scoreRecommendation";
import type { BrandFacetScoreRow, CatalogVariant, FacetScoreRow, ScoreBreakdownItem } from "./types";
import {
  FACET_THEME_MAP,
  MAX_FACET_WEIGHT,
  PRIORITY_FUN,
  isV4Answers,
  type QuestionnaireAnswers,
} from "./questionnaireWeights";
import { specKey, specScoresFor, specWeights, type SpecScores } from "./specScores";

// Priority-led weighting (v4, 22 Nov 2026). The composite averages ~51 review
// topics, so with every topic at full weight the most broadly praised car won
// its budget band whatever the user picked (a 2,000-search simulation: changing
// only the priorities changed just 20% of the top 3). Topics the user's
// answers did not lift now count at 30%, so their priorities lead (about 40%
// of the top 3 then changes) while broad complaints still matter.
export const NON_PRIORITY_WEIGHT_SHARE = 0.3;

function priorityLedWeights(weights: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [f, w] of Object.entries(weights)) out[f] = w > 1 ? w : w * NON_PRIORITY_WEIGHT_SHARE;
  return out;
}

// Cars whose only reviews so far come from their launch period: first-drive
// reviews are friendly and no owner has lived with the car yet, so the same
// number of claims counts as less evidence. Remove a car once it has owner
// reviews from 6+ months after launch. (22 Nov 2026: Duster and Tekton were in
// a quarter of all top 3s on launch reviews alone.)
export const LAUNCH_REVIEWS_ONLY = new Set([
  "renault_duster", "nissan_tekton", "hyundai_bayon", "kia_sorento",
  "kia_syros_ev", "maruti_e_vitara", "mg_hector_tomahawk", "mg_hector_ev",
]);
const LAUNCH_EVIDENCE_FACTOR = 0.6;

// scoreCar() already dampens the composite by coverage ratio, but a car with
// next to no review data (e.g. 2 claims from a single comparison video) can
// still land a deceptively clean-looking score on the handful of facets it
// does have. Below this floor, exclude outright rather than rank at all --
// "not enough data to recommend confidently" is a real, honest answer.
export const MIN_FACETS_FOR_ELIGIBILITY = 5;

// Parking-tightness soft penalty (q_parking_tightness) -- multiplicative on
// composite_score, not a hard exclusion, so a borderline car isn't thrown
// away over a few centimetres. Thresholds chosen against the real corpus-wide
// catalog Length distribution (59 cars, 3965-4789mm, median 4345mm as of the
// Aug 2026 audit) -- tune these constants if the shortlist behavior feels off
// once this is live, same spirit as MIN_FACETS_FOR_ELIGIBILITY above.
const PARKING_LENGTH_RULES: Record<string, { thresholdMm: number; penaltyPer100mm: number } | null> = {
  "Very tight": { thresholdMm: 4000, penaltyPer100mm: 0.08 },
  "Somewhat tight": { thresholdMm: 4400, penaltyPer100mm: 0.03 },
  "Not tight": null,
};
const PARKING_PENALTY_FLOOR = 0.5; // never fully zero out a car for length alone

// Daily-commute fuel-recommendation nudge (q_daily_commute) -- only applied
// when the user's fuel answer is ambiguous (empty, "No preference", or 2+
// fuels selected). A soft multiplier, not a filter -- someone with an
// explicit single fuel choice (a real veto) is never second-guessed by this.
const COMMUTE_FUEL_NUDGE: Record<string, Record<string, number>> = {
  "Under 20km": { Petrol: 1.06, CNG: 1.06, Electric: 1.08, Diesel: 0.9 },
  "20-50km": { Petrol: 1.02, CNG: 1.02 },
  "50-100km": { Diesel: 1.06, Electric: 1.04 },
  "100km+ or highly variable": { Diesel: 1.08 },
};

function asList(answer: string | string[] | undefined): string[] {
  if (answer == null) return [];
  return Array.isArray(answer) ? answer : [answer];
}

function specNumber(variant: CatalogVariant, section: string, key: string): number | null {
  const text = String((variant.spec_sections?.[section] as Record<string, unknown> | undefined)?.[key] ?? "");
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function lengthMmOf(variant: CatalogVariant): number | null {
  return specNumber(variant, "Dimensions & Capacity", "Length");
}

// ---------------------------------------------------------------------------
// Budget slider (v4): q_budget_range = [min lakh, max lakh] as strings. The
// top stop (BUDGET_SLIDER_TOP) means "and above", so it has no upper limit.
// ---------------------------------------------------------------------------
export const BUDGET_SLIDER_MIN = 3;
export const BUDGET_SLIDER_TOP = 25;

export function budgetRangeRupees(answers: QuestionnaireAnswers): [number, number] | null {
  const raw = asList(answers["q_budget_range"]);
  if (raw.length !== 2) return null;
  const lo = parseFloat(raw[0]);
  const hi = parseFloat(raw[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  const min = lo <= BUDGET_SLIDER_MIN ? 0 : lo * 100_000;
  const max = hi >= BUDGET_SLIDER_TOP ? Infinity : hi * 100_000;
  return [min, max];
}

/** The budget band this variant's price sits in, used by the size grading
 * and the budget-linked parking limits. v3 answers: one of the selected
 * bands (multi-select, so each variant is judged against its own band:
 * ticking 5-10L and 10-15L never marks a 9 lakh hatchback as "too small").
 * v4 slider: the fixed band the price falls in. */
function budgetBandOf(variant: CatalogVariant, answers: QuestionnaireAnswers): string | null {
  const price = variant.on_road_price ?? variant.ex_showroom_price;
  if (price == null) return null;
  if (budgetRangeRupees(answers)) {
    for (const [b, [lo, hi]] of Object.entries(BUDGET_RANGES)) if (price >= lo && price < hi) return b;
    return null;
  }
  for (const b of asList(answers["q_budget"])) {
    const range = BUDGET_RANGES[b];
    if (range && price >= range[0] && price < range[1]) return b;
  }
  return null;
}

/** Budget-based size grading: how much a car is marked down for being a
 * class below what its budget band normally buys. 1.0 = no markdown. */
export function segmentFitMultiplier(variant: CatalogVariant, answers: QuestionnaireAnswers): number {
  const band = budgetBandOf(variant, answers);
  const rule = band ? SEGMENT_SIZE_RULES[band] : undefined;
  const lengthMm = lengthMmOf(variant);
  if (!rule || lengthMm == null) return 1.0;
  const shortMm = Math.max(0, rule.minLengthMm - lengthMm);
  return Math.max(SEGMENT_PENALTY_FLOOR, 1.0 - (shortMm / 100) * SEGMENT_PENALTY_PER_100MM);
}

export function parkingPenaltyMultiplier(variant: CatalogVariant, answers: QuestionnaireAnswers): number {
  const tier = answers["q_parking_tightness"] as string | undefined;
  const rule = tier ? PARKING_LENGTH_RULES[tier] : null;
  if (!rule) return 1.0;

  const lengthMm = lengthMmOf(variant);
  if (lengthMm == null) return 1.0;

  // Parking goes hand in hand with budget: the length that counts as "too
  // long" is never shorter than what the budget band normally buys, so a
  // tight spot at 20-25 lakh steers to a 4.3-4.4m SUV over a 4.6m sedan
  // instead of dropping back to sub-4m cars.
  const band = budgetBandOf(variant, answers);
  const budgetFreeMm = band ? SEGMENT_SIZE_RULES[band]?.parkingFreeLengthMm ?? 0 : 0;
  const thresholdMm = Math.max(rule.thresholdMm, budgetFreeMm);

  const overMm = Math.max(0, lengthMm - thresholdMm);
  // Three adults in the back outweighs a mild parking worry: halve the
  // length penalty so it doesn't push the shortlist back to sub-4m cars.
  const softener = threeInBack(answers) ? 0.5 : 1.0;
  const penalty = (overMm / 100) * rule.penaltyPer100mm * softener;
  const lengthMult = Math.max(PARKING_PENALTY_FLOOR, 1.0 - penalty);
  if (!isV4Answers(answers)) return lengthMult;
  return Math.max(PARKING_PENALTY_FLOOR, lengthMult * parkingWidthMultiplier(variant, answers, tier!, band));
}

// Width check for tight parking (v4). Narrow lanes and society gates are
// about width as much as length. Catalog widths (Nov 2026): 1490-1922 mm,
// compact SUVs 1790-1800, big 7-seat SUVs 1850-1920. Widths over 2000 mm are
// treated as a data error (one EV's figure includes mirrors).
const PARKING_WIDTH_RULES: Record<string, { thresholdMm: number; penaltyPer100mm: number } | null> = {
  "Very tight": { thresholdMm: 1750, penaltyPer100mm: 0.12 },
  "Somewhat tight": { thresholdMm: 1820, penaltyPer100mm: 0.05 },
  "Not tight": null,
};
// Like length: never mark a car down for being as wide as its budget band normally is.
const BUDGET_FREE_WIDTH_MM: Record<string, number> = {
  "10-15L": 1790,
  "15-20L": 1800,
  "20-25L": 1850,
  ">25L": 1850,
};

function parkingWidthMultiplier(
  variant: CatalogVariant,
  answers: QuestionnaireAnswers,
  tier: string,
  band: string | null,
): number {
  const rule = PARKING_WIDTH_RULES[tier];
  const widthMm = specNumber(variant, "Dimensions & Capacity", "Width");
  if (!rule || widthMm == null || widthMm > 2000) return 1.0;
  const thresholdMm = Math.max(rule.thresholdMm, band ? BUDGET_FREE_WIDTH_MM[band] ?? 0 : 0);
  const overMm = Math.max(0, widthMm - thresholdMm);
  const softener = threeInBack(answers) ? 0.5 : 1.0;
  return 1.0 - (overMm / 100) * rule.penaltyPer100mm * softener;
}

// ---------------------------------------------------------------------------
// Who needs extra care (v4, q_extra_care)
// ---------------------------------------------------------------------------
// Elderly parents: getting in and out. No review topic covers it and the
// catalog has no body type, but every car has its real height. Low sedans
// (1475-1510 mm) are a long way down; very tall body-on-frame SUVs (Thar,
// Gurkha, Scorpio, 1850-2100 mm) are a climb up. Soft, never a filter.
const EASY_ENTRY = {
  lowMm: 1550,
  lowPenaltyPer25mm: 0.05,
  lowFloor: 0.8,
  highMm: 1850,
  highPenaltyPer50mm: 0.05,
  highFloor: 0.85,
};

function childSafetyStars(variant: CatalogVariant): number | null {
  const safety = variant.spec_sections?.["Safety"] as Record<string, unknown> | undefined;
  const raw = safety?.["Bharat NCAP Child Safety Rating"] ?? safety?.["Global NCAP Child Safety Rating"];
  const match = String(raw ?? "").match(/(\d)/);
  return match ? parseInt(match[1], 10) : null;
}

export function careMultiplier(variant: CatalogVariant, answers: QuestionnaireAnswers): number {
  const care = asList(answers["q_extra_care"]);
  let mult = 1.0;
  if (care.includes("Elderly parents")) {
    const h = specNumber(variant, "Dimensions & Capacity", "Height");
    if (h != null && h < EASY_ENTRY.lowMm) {
      mult *= Math.max(EASY_ENTRY.lowFloor, 1 - ((EASY_ENTRY.lowMm - h) / 25) * EASY_ENTRY.lowPenaltyPer25mm);
    } else if (h != null && h > EASY_ENTRY.highMm) {
      mult *= Math.max(EASY_ENTRY.highFloor, 1 - ((h - EASY_ENTRY.highMm) / 50) * EASY_ENTRY.highPenaltyPer50mm);
    }
  }
  if (care.includes("Young kids")) {
    // Official child-occupant crash rating, where tested. Untested is neutral:
    // a missing rating does not mean an unsafe car.
    const stars = childSafetyStars(variant);
    if (stars === 5) mult *= 1.05;
    else if (stars != null && stars <= 3) mult *= 0.92;
  }
  return mult;
}

// ---------------------------------------------------------------------------
// Electric range vs daily distance (v4). Real-world range is roughly 70% of
// the claimed figure; a short-range EV is marked down for long daily drives.
// ---------------------------------------------------------------------------
const EV_MIN_CLAIMED_RANGE_KM: Record<string, number> = {
  "50-100km": 300,
  "100km+ or highly variable": 400,
};

export function evRangeMultiplier(variant: CatalogVariant, answers: QuestionnaireAnswers): number {
  if (!isV4Answers(answers)) return 1.0;
  if ((variant.fuel_type ?? "").toLowerCase() !== "electric") return 1.0;
  const need = EV_MIN_CLAIMED_RANGE_KM[String(answers["q_daily_commute"] ?? "")];
  const range = specNumber(variant, "Engine & Transmission", "Range");
  if (!need || range == null) return 1.0;
  const shortKm = Math.max(0, need - range);
  return Math.max(0.7, 1 - (shortKm / 50) * 0.1);
}

// ---------------------------------------------------------------------------
// Brands you love (v4, q_brand_love). We don't just favour that brand: we read
// what reviews of that brand's cars praise MORE than reviews of cars in
// general, and give those themes extra weight. So a VW fan who needs a 7
// seater sees 7 seaters that are strong where VW stands out. The loved
// brand's own cars get a small extra nudge too. Built from every car's
// model-level facet scores (brand_facet_scores only covers a few brands).
// ---------------------------------------------------------------------------
const BRAND_LOVE_THEME_BOOST = 1.3;
const BRAND_LOVE_OWN_CARS = 1.05;
const BRAND_LOVE_MIN_CLAIMS = 15;
// Parking is about a car's size, not a brand's personality (and the parking
// question already covers it); it topped four brands on thin evidence.
const BRAND_LOVE_SKIP_THEMES = new Set(["resale_value", "parking_maneuverability"]);
// A theme counts as a brand's strength only if its reviews clearly beat the
// all-car average (score points on the -2..+2 scale), so near-ties don't count.
const BRAND_LOVE_MIN_LIFT = 0.15;

function brandSlug(displayBrand: string): string {
  return displayBrand.trim().toLowerCase().replace(/\s+/g, "_");
}

type ThemeAgg = Map<string, { sum: number; n: number }>;

function addRows(agg: ThemeAgg, rows: FacetScoreRow[]) {
  for (const r of rows) {
    if (r.granularity !== "model" || BRAND_LOVE_SKIP_THEMES.has(r.theme)) continue;
    const a = agg.get(r.theme) ?? { sum: 0, n: 0 };
    a.sum += r.score * r.claim_count;
    a.n += r.claim_count;
    agg.set(r.theme, a);
  }
}

/** Each loved brand's two most distinctive strengths: themes where its cars'
 * reviews score highest above the all-car average. */
export function lovedBrandThemes(
  answers: QuestionnaireAnswers,
  facetScoresByCar: Record<string, FacetScoreRow[]>,
): string[] {
  const loved = asList(answers["q_brand_love"]).map(brandSlug);
  if (loved.length === 0) return [];
  const all: ThemeAgg = new Map();
  for (const rows of Object.values(facetScoresByCar)) addRows(all, rows);

  const themes = new Set<string>();
  for (const brand of loved) {
    const mine: ThemeAgg = new Map();
    for (const [carId, rows] of Object.entries(facetScoresByCar)) {
      if (brandOf(carId) === brand) addRows(mine, rows);
    }
    const ranked = [...mine.entries()]
      .filter(([theme, a]) => a.n >= BRAND_LOVE_MIN_CLAIMS && all.has(theme))
      .map(([theme, a]) => {
        const g = all.get(theme)!;
        return { theme, lift: a.sum / a.n - g.sum / g.n };
      })
      .filter((t) => t.lift >= BRAND_LOVE_MIN_LIFT)
      .sort((a, b) => b.lift - a.lift)
      .slice(0, 2);
    for (const t of ranked) themes.add(t.theme);
  }
  return [...themes];
}

function applyBrandLoveWeights(weights: Record<string, number>, themes: string[]): Record<string, number> {
  if (themes.length === 0) return weights;
  const next = { ...weights };
  for (const [facet, theme] of Object.entries(FACET_THEME_MAP)) {
    if (themes.includes(theme) && facet in next) {
      next[facet] = Math.min(MAX_FACET_WEIGHT, next[facet] * BRAND_LOVE_THEME_BOOST);
    }
  }
  return next;
}

function brandLoveMultiplier(variant: CatalogVariant, answers: QuestionnaireAnswers): number {
  const loved = new Set(asList(answers["q_brand_love"]).map((b) => b.trim().toLowerCase()));
  return loved.has(variant.brand.trim().toLowerCase()) ? BRAND_LOVE_OWN_CARS : 1.0;
}

// Rear-seat size check for "5 people" (q_seating, three in the back). The
// rear_legroom_kneeroom facet carries the review evidence (weighted up in
// questionnaireWeights.ts), but reviewers judge rear space against the car's
// own segment: the Exter and Brezza score higher there than the Creta. This
// soft multiplier uses wheelbase as the cross-segment check (exterior width
// can't: Sonet and Creta are both 1790mm). Catalog spread (Oct 2026):
// 2380-2850mm; Sonet/Brezza 2500, Creta 2610, Seltos 2690. Added 24 Oct 2026
// after real users with three in the back were shown sub-4m cars.
const REAR_ROOM_RULE = { thresholdMm: 2650, penaltyPer100mm: 0.25, floor: 0.55 };

export function threeInBack(answers: QuestionnaireAnswers): boolean {
  return answers["q_seating"] === "5 people";
}

export function rearRoomMultiplier(variant: CatalogVariant, answers: QuestionnaireAnswers): number {
  if (!threeInBack(answers)) return 1.0;
  const wbText = String(
    (variant.spec_sections?.["Dimensions & Capacity"] as Record<string, unknown> | undefined)?.["Wheel Base"] ?? "",
  );
  const match = wbText.match(/(\d+)/);
  if (!match) return 1.0;
  const shortMm = Math.max(0, REAR_ROOM_RULE.thresholdMm - parseInt(match[1], 10));
  return Math.max(REAR_ROOM_RULE.floor, 1.0 - (shortMm / 100) * REAR_ROOM_RULE.penaltyPer100mm);
}

export function commuteFuelNudgeMultiplier(variant: CatalogVariant, answers: QuestionnaireAnswers): number {
  const fuelAnswer = asList(answers["q_fuel"]).filter((f) => f !== "No preference");
  if (fuelAnswer.length === 1) return 1.0; // decisive choice -- not our place to second-guess it

  const commute = answers["q_daily_commute"] as string | undefined;
  const nudges = commute ? COMMUTE_FUEL_NUDGE[commute] : undefined;
  if (!nudges) return 1.0;

  return nudges[variant.fuel_type ?? ""] ?? 1.0;
}

/** Brand = the car_id's slug prefix, e.g. mahindra_scorpio_n -> mahindra.
 * Mirrors scripts/aggregate_brand_facets.py's brand_of() exactly -- this is
 * what brand_facet_scores.brand is keyed by, which is a different (if
 * usually coincident) thing from the catalog's own display-cased `brand`
 * field, so it's derived the same way rather than reused from the variant. */
function brandOf(carId: string): string {
  return carId.split("_")[0];
}

const BUDGET_RANGES: Record<string, [number, number]> = {
  "<5L": [0, 500_000],
  "5-10L": [500_000, 1_000_000],
  "10-15L": [1_000_000, 1_500_000],
  "15-20L": [1_500_000, 2_000_000],
  "20-25L": [2_000_000, 2_500_000],
  ">25L": [2_500_000, 10 ** 9],
};

// Budget-based size grading (added 15 Nov 2026). The budget filter only
// checks price, so the top trims of sub-4m cars (Syros EV at 21 lakh, Brezza
// at 16 lakh) were winning 15-25 lakh searches on review score alone. Real
// buyers at that money expect the next class up, so a car shorter than the
// band's usual class is marked down by SEGMENT_PENALTY_PER_100MM for every
// 100mm it falls short. Length is the class proxy: hatchbacks and sub-4m
// SUVs/sedans are 3.7-4.0m, Creta-class SUVs 4.3-4.4m, sedans 4.5-4.6m.
//   minLengthMm          below this the car is a class too small for the band
//   parkingFreeLengthMm  with tight parking, cars up to this length carry no
//                        parking penalty in this band (see parkingPenaltyMultiplier)
const SEGMENT_SIZE_RULES: Record<string, { minLengthMm: number; parkingFreeLengthMm: number }> = {
  "10-15L": { minLengthMm: 3900, parkingFreeLengthMm: 4000 },
  "15-20L": { minLengthMm: 4200, parkingFreeLengthMm: 4350 },
  "20-25L": { minLengthMm: 4300, parkingFreeLengthMm: 4400 },
  ">25L": { minLengthMm: 4300, parkingFreeLengthMm: 4400 },
};
const SEGMENT_PENALTY_PER_100MM = 0.12;
const SEGMENT_PENALTY_FLOOR = 0.5;

export const BRAND_LIST = [
  "Citroen", "Force", "Honda", "Hyundai", "Jeep", "Kia", "MG", "Mahindra",
  "Maruti", "Nissan", "Renault", "Skoda", "Tata", "Toyota", "VinFast", "Volkswagen", "BYD",
];

/**
 * Matches the <car_slug>_<fuel>_<transmission> convention the extraction
 * skill and scripts/car_catalog_scraper.py both use -- spelled-out
 * "_automatic"/"_manual", the exact keys aggregate_claims.py's output already
 * indexes powertrains by. For Kia Seltos specifically this is corrected from
 * the variant name text ("... Turbo DCT" / "... iVT") instead, since Seltos
 * is the one car with claims filed at that finer granularity than the
 * catalog's own Manual/Automatic-only spec field can distinguish.
 *
 * Previously this derived an abbreviated "_at"/"_mt" suffix for every
 * non-Seltos car, which never matched any real aggregation key and silently
 * dropped every powertrain-level claim back to model-level-only scoring --
 * the Supabase `variants` table has no stored powertrain_id column (unlike
 * the local catalog JSON files, which car_catalog_scraper.py stamps one onto
 * directly), so this recomputes the same spelled-out id here rather than
 * requiring a schema migration. Bug found Aug 18 while fixing Hyundai
 * Verna's powertrain-id fragmentation in scripts/recommend.py (the Python
 * twin of this function).
 */
export function derivePowertrainId(carId: string, variant: CatalogVariant): string {
  const fuel = (variant.fuel_type ?? "unknown").trim().toLowerCase();
  const vid = (variant.variant_id ?? "").toLowerCase();

  if (carId === "kia_seltos" && fuel === "petrol") {
    if (vid.includes("turbo") || vid.includes("dct")) return `${carId}_petrol_turbo_dct`;
    if (vid.includes("ivt")) return `${carId}_petrol_ivt`;
    return `${carId}_petrol_mt`;
  }

  const transType = String(
    (variant.spec_sections?.["Engine & Transmission"] as Record<string, unknown> | undefined)?.[
      "Transmission Type"
    ] ?? "",
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_") || "unknown";
  return `${carId}_${fuel.replace(/\s+/g, "_")}_${transType}`;
}

export function passesStructuralFilters(
  variant: CatalogVariant,
  answers: QuestionnaireAnswers,
): { ok: boolean; reason: string } {
  // q_budget_range (v4 slider): on-road price between the two handles.
  const range = budgetRangeRupees(answers);
  if (range) {
    const price = variant.on_road_price ?? variant.ex_showroom_price;
    if (price == null) return { ok: false, reason: "no price data" };
    if (price < range[0] || price > range[1]) {
      return { ok: false, reason: `on-road price ${price.toLocaleString()} outside the budget slider range` };
    }
  }

  // q_budget: multi-select, OR-matched -- a variant passes if its price
  // falls in ANY selected band (was single-select in v2).
  // A v4 slider answer replaces any leftover v3 band answer.
  const validBands = range ? [] : asList(answers["q_budget"]).filter((b) => b in BUDGET_RANGES);
  if (validBands.length > 0) {
    const price = variant.on_road_price ?? variant.ex_showroom_price;
    if (price == null) return { ok: false, reason: "no price data" };
    const inAnyBand = validBands.some((b) => {
      const [lo, hi] = BUDGET_RANGES[b];
      return price >= lo && price < hi;
    });
    if (!inAnyBand) {
      return { ok: false, reason: `on-road price ${price.toLocaleString()} outside ${validBands.join(", ")}` };
    }
  }

  // q_fuel: multi-select, OR-matched. Empty selection or an explicit "No
  // preference" both mean "open to all fuels" -- no filter applied either
  // way, and q_daily_commute's nudge (commuteFuelNudgeMultiplier, applied by
  // the caller) is what actually recommends a fuel for these ambiguous cases.
  const fuelAnswer = asList(answers["q_fuel"]).filter((f) => f !== "No preference");
  if (fuelAnswer.length > 0) {
    const variantFuel = (variant.fuel_type ?? "").trim().toLowerCase();
    const wanted = new Set(fuelAnswer.map((f) => f.trim().toLowerCase()));
    if (!wanted.has(variantFuel)) {
      return { ok: false, reason: `fuel is ${variant.fuel_type}, wanted one of ${fuelAnswer.join(", ")}` };
    }
  }

  // CarDekho's own spec field is genuinely multi-valued for most 3-row cars
  // ("6, 7" meaning the trim can be configured either way) -- check
  // membership against every number mentioned, not equality against a
  // single value (which silently excluded ~96% of real 7-seat-capable
  // variants when seating_capacity was stored as a plain number/null).
  const seatAnswer = answers["q_seating"] as string | undefined;
  const seatNumbers = new Set(
    String(variant.seating_capacity ?? "")
      .match(/\d+/g)
      ?.map(Number) ?? []
  );
  if (seatAnswer === "7 seater" && !seatNumbers.has(7)) {
    return { ok: false, reason: `seats=${variant.seating_capacity}, wanted 7` };
  }
  if (
    (seatAnswer === "4/5 seater" || seatAnswer === "1-2 people" || seatAnswer === "3-4 people") &&
    !seatNumbers.has(4) &&
    !seatNumbers.has(5)
  ) {
    return { ok: false, reason: `seats=${variant.seating_capacity}, wanted 4/5` };
  }
  // 5 people: any car with 5+ seats (a 7-seater fits five too).
  if (seatAnswer === "5 people" && ![5, 6, 7, 8].some((n) => seatNumbers.has(n))) {
    return { ok: false, reason: `seats=${variant.seating_capacity}, wanted 5+` };
  }
  if (seatAnswer === "6-7 people" && !seatNumbers.has(6) && !seatNumbers.has(7)) {
    return { ok: false, reason: `seats=${variant.seating_capacity}, wanted 6/7` };
  }

  // q_transmission: hard filter on the catalog's real spec field. Skipped by
  // the frontend entirely for EV-only fuel selections.
  const transAnswer = answers["q_transmission"] as string | undefined;
  if (transAnswer && transAnswer !== "No preference") {
    const variantTrans = String(
      (variant.spec_sections?.["Engine & Transmission"] as Record<string, unknown> | undefined)?.[
        "Transmission Type"
      ] ?? "",
    )
      .trim()
      .toLowerCase();
    if (variantTrans !== transAnswer.trim().toLowerCase()) {
      return { ok: false, reason: `transmission is ${variantTrans || "unknown"}, wanted ${transAnswer}` };
    }
  }

  // q_brand_avoid: unconditional hard exclude, any budget. A personal veto,
  // not a spec constraint -- see docs/questionnaire.md.
  const avoidBrands = new Set(asList(answers["q_brand_avoid"]).map((b) => b.trim().toLowerCase()));
  if (avoidBrands.has(variant.brand.trim().toLowerCase())) {
    return { ok: false, reason: `brand ${variant.brand} is on the avoid list` };
  }

  return { ok: true, reason: "" };
}

// Variants whose scores differ by less than this are treated as tied.
const SCORE_TIE_EPSILON = 1e-6;

// Spec sections whose `true` entries count as equipment. Values are booleans
// in the catalog (e.g. "Wireless Phone Charging": false).
const FEATURE_SECTIONS = [
  "Comfort & Convenience",
  "Interior",
  "Exterior",
  "Safety",
  "Entertainment & Communication",
  "ADAS Feature",
  "Advance Internet Feature",
];
const SAFETY_SECTIONS = ["Safety", "ADAS Feature"];

// Default pick: the cheapest variant with at least this share of the
// best-equipped tied variant's features -- not the bare base trim, and not
// the top-trim upsell the "variant-ladder trap" warns about.
const SWEET_SPOT_FEATURE_SHARE = 0.8;

function countTrue(variant: CatalogVariant | undefined, sections: string[]): number {
  if (!variant) return 0;
  let n = 0;
  for (const s of sections) {
    const sec = variant.spec_sections?.[s];
    if (!sec) continue;
    for (const v of Object.values(sec)) if (v === true || String(v).trim().toLowerCase() === "yes") n++;
  }
  return n;
}

/**
 * Chooses which variant represents a car when several tie on review score.
 * - "Features and tech" in the top 2: the best-equipped variant (cheaper wins a tie).
 * - "Safety and build quality": the most safety/ADAS features, then most features, then cheaper.
 * - Otherwise: the sweet spot (SWEET_SPOT_FEATURE_SHARE above).
 * Every tied variant already passed the budget filter, so all are affordable.
 */
function pickVariantAmongTies(
  tied: RecommendCandidate[],
  variantByKey: Map<string, CatalogVariant>,
  answers: QuestionnaireAnswers,
): RecommendCandidate {
  if (tied.length === 1) return tied[0];
  const priorities = asList(answers[isV4Answers(answers) ? "q_priorities" : "q_top2_priorities"]);
  const info = tied.map((c) => {
    const v = variantByKey.get(`${c.car_id}::${c.variant_id}`);
    return {
      c,
      features: countTrue(v, FEATURE_SECTIONS),
      safety: countTrue(v, SAFETY_SECTIONS),
      price: c.price_on_road ?? Number.MAX_SAFE_INTEGER,
    };
  });
  type Info = (typeof info)[number];
  const pick = (cmp: (a: Info, b: Info) => number) => [...info].sort(cmp)[0].c;

  if (priorities.includes("Features and tech")) {
    return pick((a, b) => b.features - a.features || a.price - b.price);
  }
  if (
    priorities.includes("Safety and build quality") ||
    priorities.includes("Safety and solid build") ||
    asList(answers["q_extra_care"]).includes("Young kids")
  ) {
    return pick((a, b) => b.safety - a.safety || b.features - a.features || a.price - b.price);
  }
  const maxFeatures = Math.max(...info.map((i) => i.features));
  const floor = maxFeatures * SWEET_SPOT_FEATURE_SHARE;
  const sweet = info.filter((i) => i.features >= floor);
  return [...sweet].sort((a, b) => a.price - b.price || b.features - a.features)[0].c;
}

export interface RecommendCandidate {
  car_id: string;
  brand: string;
  car_model: string;
  variant_id: string;
  powertrain_id: string;
  price_on_road: number | null;
  /** City the on-road price is for, e.g. "Indore" (absent on results saved before 3 Oct 2026). */
  price_city?: string;
  price_basis?: "city" | "estimate" | "delhi";
  composite_score: number;
  raw_composite_score: number;
  coverage_ratio: number;
  facets_with_data: number;
  parking_penalty_multiplier: number;
  commute_fuel_nudge_multiplier: number;
  /** Absent on results computed before 24 Oct 2026. */
  rear_room_multiplier?: number;
  /** Budget-based size grading. Absent on results computed before 15 Nov 2026. */
  segment_fit_multiplier?: number;
  /** v4 (22 Nov 2026): easy entry for parents, child crash rating for kids. */
  care_multiplier?: number;
  /** v4: EV claimed range vs daily distance. */
  ev_range_multiplier?: number;
  /** v4: small nudge for a brand the user loves. */
  brand_love_multiplier?: number;
  top_contributors: ScoreBreakdownItem[];
  /** v4 (22 Nov 2026): paper-spec scores that joined this variant's score
   * (specScores.ts), already scaled. Absent on v3 answers and older results. */
  spec_scores?: SpecScores;
}

/** Answer key holding the car_ids a user hid from their results ("Not for
 * me" on a result card). Never asked as a question: it is written only by
 * /api/recommend/hide, and is a hard veto like q_brand_avoid. */
export const HIDDEN_CARS_KEY = "q_hidden_cars";

export interface HiddenCar {
  car_id: string;
  brand: string;
  car_model: string;
}

export interface RecommendOutput {
  shortlist: RecommendCandidate[];
  all_ranked_cars: RecommendCandidate[];
  cars_skipped_no_review_data: string[];
  variants_considered_after_filters: number;
  variants_excluded_by_filters: number;
  exclusion_sample: { car_id: string; variant_id: string; reason: string }[];
  weight_vector_top5: Record<string, number>;
  /** Cars the user hid from this search, so the page can offer them back
   * (absent on results computed before 24 Oct 2026). */
  hidden_cars?: HiddenCar[];
  /** Brands the user said they'd love to own (v4) and the review themes we
   * leaned towards because of them, so the results page can say so. */
  brand_love?: { brands: string[]; themes: string[] };
}

export interface RecommendInput {
  answers: QuestionnaireAnswers;
  weights: Record<string, number>;
  /** Every catalogued variant across every car (already joined with brand/model). */
  catalogVariants: CatalogVariant[];
  /** facet_scores rows, grouped by car_id. A car_id with no key (or an empty
   * array) here is treated the same as "no aggregation file" in the Python
   * version -- reported in cars_skipped_no_review_data. */
  facetScoresByCar: Record<string, FacetScoreRow[]>;
  brandFacetScoresByBrand: Record<string, BrandFacetScoreRow[]>;
  topN?: number;
}

export function recommend(input: RecommendInput): RecommendOutput {
  const { answers, catalogVariants, facetScoresByCar, brandFacetScoresByBrand } = input;
  const loveThemes = lovedBrandThemes(answers, facetScoresByCar);
  // v4 only (22 Nov 2026): specs, priority-led weights and the launch-review
  // discount. v3 answers (old saved searches, the guides) score as before.
  const v4 = isV4Answers(answers);
  const weights = v4
    ? priorityLedWeights(applyBrandLoveWeights(input.weights, loveThemes))
    : applyBrandLoveWeights(input.weights, loveThemes);
  const specs = v4 ? specScoresFor(catalogVariants) : null;
  const specW = v4
    ? specWeights(weights, FACET_THEME_MAP, {
        youngKids: asList(answers["q_extra_care"]).includes("Young kids"),
        funToDrive: asList(answers["q_priorities"]).includes(PRIORITY_FUN),
      })
    : null;
  const topN = input.topN ?? 3;

  const carIds = Array.from(new Set(catalogVariants.map((v) => v.car_id))).sort();

  const candidates: RecommendCandidate[] = [];
  const excluded: { car_id: string; variant_id: string; reason: string }[] = [];
  const noReviewData: string[] = [];
  const hiddenIds = new Set(asList(answers[HIDDEN_CARS_KEY]));
  const hiddenCars: HiddenCar[] = [];

  for (const carId of carIds) {
    if (hiddenIds.has(carId)) {
      const v = catalogVariants.find((x) => x.car_id === carId)!;
      hiddenCars.push({ car_id: carId, brand: v.brand, car_model: v.car_model });
      continue;
    }
    const rawFacetScores = facetScoresByCar[carId];
    if (!rawFacetScores || rawFacetScores.length === 0) {
      noReviewData.push(carId);
      continue;
    }
    const facetScores =
      v4 && LAUNCH_REVIEWS_ONLY.has(carId)
        ? rawFacetScores.map((r) => ({ ...r, claim_count: r.claim_count * LAUNCH_EVIDENCE_FACTOR }))
        : rawFacetScores;

    const variants = catalogVariants.filter((v) => v.car_id === carId);
    for (const variant of variants) {
      const { ok, reason } = passesStructuralFilters(variant, answers);
      if (!ok) {
        excluded.push({ car_id: carId, variant_id: variant.variant_id, reason });
        continue;
      }
      const powertrainId = derivePowertrainId(carId, variant);
      const brandFacetScores = brandFacetScoresByBrand[brandOf(carId)] ?? null;
      const variantSpecs = specs?.get(specKey(carId, variant.variant_id)) ?? {};
      const specList = specW
        ? (Object.entries(variantSpecs) as [keyof SpecScores, number][]).map(([k, score]) => ({ score, weight: specW[k] ?? 0 }))
        : [];
      const result = scoreCar(facetScores, weights, powertrainId, variant.variant_id, brandFacetScores, specList);

      if (result.facets_with_data < MIN_FACETS_FOR_ELIGIBILITY) {
        excluded.push({
          car_id: carId,
          variant_id: variant.variant_id,
          reason: `insufficient review data (${result.facets_with_data}/${MIN_FACETS_FOR_ELIGIBILITY} facets minimum)`,
        });
        continue;
      }

      // Soft, multiplicative adjustments -- applied on top of the
      // coverage-adjusted composite_score, never on raw_composite_score
      // (kept as the pre-adjustment number for transparency, same
      // precedent as coverage_ratio itself).
      const parkingMult = parkingPenaltyMultiplier(variant, answers);
      const commuteMult = commuteFuelNudgeMultiplier(variant, answers);
      const rearMult = rearRoomMultiplier(variant, answers);
      const segmentMult = segmentFitMultiplier(variant, answers);
      const careMult = careMultiplier(variant, answers);
      const evRangeMult = evRangeMultiplier(variant, answers);
      const loveMult = brandLoveMultiplier(variant, answers);
      const adjustedScore =
        result.composite_score * parkingMult * commuteMult * rearMult * segmentMult * careMult * evRangeMult * loveMult;

      candidates.push({
        car_id: carId,
        brand: variant.brand,
        car_model: variant.car_model,
        variant_id: variant.variant_id,
        powertrain_id: powertrainId,
        price_on_road: variant.on_road_price,
        price_city: variant.price_city,
        price_basis: variant.price_basis,
        composite_score: adjustedScore,
        raw_composite_score: result.raw_composite_score,
        coverage_ratio: result.coverage_ratio,
        facets_with_data: result.facets_with_data,
        parking_penalty_multiplier: parkingMult,
        commute_fuel_nudge_multiplier: commuteMult,
        rear_room_multiplier: rearMult,
        segment_fit_multiplier: segmentMult,
        care_multiplier: careMult,
        ev_range_multiplier: evRangeMult,
        brand_love_multiplier: loveMult,
        ...(v4 ? { spec_scores: variantSpecs } : {}),
        top_contributors: result.breakdown.slice(0, 5),
      });
    }
  }

  // Dedupe: keep only the best-scoring variant per car model, so two
  // variants of the same car can never both take a shortlist slot. Review
  // claims almost never exist per trim, so every variant of one powertrain
  // usually ties exactly -- pickVariantAmongTies() then chooses on purpose
  // instead of keeping whichever variant happened to be listed first (which
  // was nearly always the base trim).
  const byCar = new Map<string, RecommendCandidate[]>();
  for (const c of candidates) {
    const list = byCar.get(c.car_id);
    if (list) list.push(c);
    else byCar.set(c.car_id, [c]);
  }
  const variantByKey = new Map(catalogVariants.map((v) => [`${v.car_id}::${v.variant_id}`, v]));
  const bestByCar = new Map<string, RecommendCandidate>();
  for (const [carId, list] of byCar) {
    const top = Math.max(...list.map((c) => c.composite_score));
    const tied = list.filter((c) => top - c.composite_score <= SCORE_TIE_EPSILON);
    bestByCar.set(carId, pickVariantAmongTies(tied, variantByKey, answers));
  }

  const ranked = Array.from(bestByCar.values()).sort((a, b) => b.composite_score - a.composite_score);

  const weightVectorTop5 = Object.fromEntries(
    Object.entries(weights)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5),
  );

  return {
    shortlist: ranked.slice(0, topN),
    all_ranked_cars: ranked,
    cars_skipped_no_review_data: noReviewData,
    variants_considered_after_filters: candidates.length,
    variants_excluded_by_filters: excluded.length,
    exclusion_sample: excluded.slice(0, 10),
    weight_vector_top5: weightVectorTop5,
    hidden_cars: hiddenCars,
    ...(asList(answers["q_brand_love"]).length > 0
      ? { brand_love: { brands: asList(answers["q_brand_love"]), themes: loveThemes } }
      : {}),
  };
}
