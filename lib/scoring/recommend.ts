/**
 * TypeScript port of scripts/recommend.py. Structural catalog filters
 * (q_budget/q_fuel/q_seating/q_transmission/q_brand_avoid) narrow the field,
 * scoreCar() runs across every surviving variant, a soft parking-tightness
 * penalty and fuel-recommendation nudge get applied, results are deduped to
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
import type { QuestionnaireAnswers } from "./questionnaireWeights";

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

export function parkingPenaltyMultiplier(variant: CatalogVariant, answers: QuestionnaireAnswers): number {
  const tier = answers["q_parking_tightness"] as string | undefined;
  const rule = tier ? PARKING_LENGTH_RULES[tier] : null;
  if (!rule) return 1.0;

  const lengthText = String(
    (variant.spec_sections?.["Dimensions & Capacity"] as Record<string, unknown> | undefined)?.["Length"] ?? "",
  );
  const match = lengthText.match(/(\d+)/);
  if (!match) return 1.0;
  const lengthMm = parseInt(match[1], 10);

  const overMm = Math.max(0, lengthMm - rule.thresholdMm);
  const penalty = (overMm / 100) * rule.penaltyPer100mm;
  return Math.max(PARKING_PENALTY_FLOOR, 1.0 - penalty);
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

export const BRAND_LIST = [
  "Citroen", "Force", "Honda", "Hyundai", "Jeep", "Kia", "MG", "Mahindra",
  "Maruti", "Nissan", "Renault", "Skoda", "Tata", "Toyota", "VinFast", "Volkswagen",
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
  // q_budget: multi-select, OR-matched -- a variant passes if its price
  // falls in ANY selected band (was single-select in v2).
  const validBands = asList(answers["q_budget"]).filter((b) => b in BUDGET_RANGES);
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

  const seatAnswer = answers["q_seating"] as string | undefined;
  const seatsN = variant.seating_capacity;
  if (seatAnswer === "7 seater" && seatsN !== 7) {
    return { ok: false, reason: `seats=${variant.seating_capacity}, wanted 7` };
  }
  if (seatAnswer === "4/5 seater" && seatsN !== 4 && seatsN !== 5) {
    return { ok: false, reason: `seats=${variant.seating_capacity}, wanted 4/5` };
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

export interface RecommendCandidate {
  car_id: string;
  brand: string;
  car_model: string;
  variant_id: string;
  powertrain_id: string;
  price_on_road: number | null;
  composite_score: number;
  raw_composite_score: number;
  coverage_ratio: number;
  facets_with_data: number;
  parking_penalty_multiplier: number;
  commute_fuel_nudge_multiplier: number;
  top_contributors: ScoreBreakdownItem[];
}

export interface RecommendOutput {
  shortlist: RecommendCandidate[];
  all_ranked_cars: RecommendCandidate[];
  cars_skipped_no_review_data: string[];
  variants_considered_after_filters: number;
  variants_excluded_by_filters: number;
  exclusion_sample: { car_id: string; variant_id: string; reason: string }[];
  weight_vector_top5: Record<string, number>;
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
  const { answers, weights, catalogVariants, facetScoresByCar, brandFacetScoresByBrand } = input;
  const topN = input.topN ?? 3;

  const carIds = Array.from(new Set(catalogVariants.map((v) => v.car_id))).sort();

  const candidates: RecommendCandidate[] = [];
  const excluded: { car_id: string; variant_id: string; reason: string }[] = [];
  const noReviewData: string[] = [];

  for (const carId of carIds) {
    const facetScores = facetScoresByCar[carId];
    if (!facetScores || facetScores.length === 0) {
      noReviewData.push(carId);
      continue;
    }

    const variants = catalogVariants.filter((v) => v.car_id === carId);
    for (const variant of variants) {
      const { ok, reason } = passesStructuralFilters(variant, answers);
      if (!ok) {
        excluded.push({ car_id: carId, variant_id: variant.variant_id, reason });
        continue;
      }
      const powertrainId = derivePowertrainId(carId, variant);
      const brandFacetScores = brandFacetScoresByBrand[brandOf(carId)] ?? null;
      const result = scoreCar(facetScores, weights, powertrainId, variant.variant_id, brandFacetScores);

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
      const adjustedScore = result.composite_score * parkingMult * commuteMult;

      candidates.push({
        car_id: carId,
        brand: variant.brand,
        car_model: variant.car_model,
        variant_id: variant.variant_id,
        powertrain_id: powertrainId,
        price_on_road: variant.on_road_price,
        composite_score: adjustedScore,
        raw_composite_score: result.raw_composite_score,
        coverage_ratio: result.coverage_ratio,
        facets_with_data: result.facets_with_data,
        parking_penalty_multiplier: parkingMult,
        commute_fuel_nudge_multiplier: commuteMult,
        top_contributors: result.breakdown.slice(0, 5),
      });
    }
  }

  // Dedupe: keep only the best-scoring variant per car model, so two
  // variants of the same car can never both take a shortlist slot.
  const bestByCar = new Map<string, RecommendCandidate>();
  for (const c of candidates) {
    const cur = bestByCar.get(c.car_id);
    if (!cur || c.composite_score > cur.composite_score) bestByCar.set(c.car_id, c);
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
  };
}
