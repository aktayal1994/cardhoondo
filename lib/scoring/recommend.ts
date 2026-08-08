/**
 * TypeScript port of scripts/recommend.py. Structural catalog filters
 * (Q3 fuel / Q4 budget / Q5 seating) narrow the field, scoreCar() runs
 * across every surviving variant, results are deduped to the best-scoring
 * variant per car (never two variants of the same car on the shortlist),
 * survivors are ranked.
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

/**
 * Best-effort powertrain_id matching the <car_slug>_<fuel>_<transmission>
 * convention the extraction skill uses. The catalog's own stored
 * powertrain_id collapses DCT and iVT into one "automatic" bucket, because
 * CarDekho's spec field doesn't distinguish gearbox type -- for Kia Seltos
 * specifically that's corrected here from the variant name text ("... Turbo
 * DCT" / "... iVT"), since Seltos is the one car with real powertrain-level
 * review claims today. Other cars only have model-level claims so far, so a
 * coarser fallback here doesn't lose any real evidence yet.
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
  ).toLowerCase();
  const transmission = transType.includes("automatic") ? "at" : "mt";
  return `${carId}_${fuel}_${transmission}`;
}

export function passesStructuralFilters(
  variant: CatalogVariant,
  answers: QuestionnaireAnswers,
): { ok: boolean; reason: string } {
  const budgetAnswer = answers["q4_budget"] as string | undefined;
  if (budgetAnswer && budgetAnswer in BUDGET_RANGES) {
    const [lo, hi] = BUDGET_RANGES[budgetAnswer];
    const price = variant.on_road_price ?? variant.ex_showroom_price;
    if (price == null) return { ok: false, reason: "no price data" };
    if (!(price >= lo && price < hi)) {
      return { ok: false, reason: `on-road price ${price.toLocaleString()} outside ${budgetAnswer}` };
    }
  }

  const fuelAnswer = answers["q3_fuel"] as string | undefined;
  if (fuelAnswer && fuelAnswer !== "No preference") {
    const variantFuel = (variant.fuel_type ?? "").trim().toLowerCase();
    if (variantFuel !== fuelAnswer.trim().toLowerCase()) {
      return { ok: false, reason: `fuel is ${variant.fuel_type}, wanted ${fuelAnswer}` };
    }
  }

  const seatAnswer = answers["q5_seating"] as string | undefined;
  const seatsN = variant.seating_capacity;
  if (seatAnswer === "7 seater" && seatsN !== 7) {
    return { ok: false, reason: `seats=${variant.seating_capacity}, wanted 7` };
  }
  if (seatAnswer === "4/5 seater" && seatsN !== 4 && seatsN !== 5) {
    return { ok: false, reason: `seats=${variant.seating_capacity}, wanted 4/5` };
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

      candidates.push({
        car_id: carId,
        brand: variant.brand,
        car_model: variant.car_model,
        variant_id: variant.variant_id,
        powertrain_id: powertrainId,
        price_on_road: variant.on_road_price,
        composite_score: result.composite_score,
        raw_composite_score: result.raw_composite_score,
        coverage_ratio: result.coverage_ratio,
        facets_with_data: result.facets_with_data,
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
