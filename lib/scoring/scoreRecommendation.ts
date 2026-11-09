/**
 * TypeScript port of scripts/score_recommendation.py. Turns a car's
 * precomputed facet scores (fetched from Supabase's `facet_scores` /
 * `brand_facet_scores` tables, not read from a local *_aggregated.json file
 * the way the Python version does) + a user's weight vector into one
 * composite score with a per-facet contribution breakdown.
 *
 * Hard rule carried over from the Python version and from the
 * recommendation-writeup skill's own hard rule: this is the only place a
 * score gets computed. Nothing downstream (the writeup LLM call included)
 * should ever re-derive or adjust it.
 */
import { FACET_THEME_MAP } from "./questionnaireWeights";
import type {
  BrandFacetScoreRow,
  Confidence,
  FacetScoreRow,
  Granularity,
  ScoreBreakdownItem,
  ScoreResult,
} from "./types";

// service_center_availability / wait_time_appointment / spare_parts_availability
// -- see docs/review_taxonomy.md "Brand-level facets". Properties of the
// OEM's dealer/parts network, not the specific model, so they resolve
// straight to the brand-pooled table instead of the variant/powertrain/model
// fallback chain.
export const BRAND_FACETS = new Set([
  "service_center_availability",
  "wait_time_appointment",
  "spare_parts_availability",
]);

// A facet's weight (how much the *user* cares) and its confidence (how much
// evidence backs the score) are different questions -- both temper how much
// a facet can move the composite. Without this, a single offhand comment on
// a heavily-weighted facet can outweigh an 8-claim consensus elsewhere.
const CONFIDENCE_DAMPENING: Record<Confidence, number> = { low: 0.5, medium: 0.8, high: 1.0 };

const TOTAL_FACETS = Object.keys(FACET_THEME_MAP).length;

// Dampening the weight alone isn't enough: one glowing claim still reads as a
// perfect +1.00 inside the average, and still counts as a whole covered facet.
// So a facet's score is pulled toward neutral by n / (n + EVIDENCE_PRIOR)
// claims (1 claim keeps a third of its score, 2 half, 8 four fifths), and it
// only counts fully toward coverage from FULL_COVERAGE_CLAIMS claims up. This
// stopped thin-but-lucky facets (e.g. a 1-claim crash rating of 1.00) from
// putting a car on top of shortlists. The breakdown keeps the raw score for
// display; only the ranking uses the shrunk one.
export const EVIDENCE_PRIOR = 2;
export const FULL_COVERAGE_CLAIMS = 3;

interface ResolvedFacetData {
  score: number;
  claim_count: number;
  confidence: Confidence;
  source_types: Record<string, number>;
  evidence: { video_id?: string; car_id?: string; sentiment: string; quote: string }[];
  resolved_from: Granularity | "brand";
}

/** Fallback chain: variant -> powertrain -> model. Returns null if no data
 * exists anywhere for this facet. */
export function resolveFacetData(
  facetScores: FacetScoreRow[],
  facet: string,
  powertrainId: string | null,
  variantId: string | null,
  brandFacetScores: BrandFacetScoreRow[] | null,
): ResolvedFacetData | null {
  if (BRAND_FACETS.has(facet)) {
    const row = (brandFacetScores ?? []).find((r) => r.facet === facet);
    return row ? { ...row, resolved_from: "brand" } : null;
  }

  if (variantId) {
    const row = facetScores.find(
      (r) => r.granularity === "variant" && r.variant_id === variantId && r.facet === facet,
    );
    if (row) return { ...row, resolved_from: "variant" };
  }
  if (powertrainId) {
    const row = facetScores.find(
      (r) => r.granularity === "powertrain" && r.powertrain_id === powertrainId && r.facet === facet,
    );
    if (row) return { ...row, resolved_from: "powertrain" };
  }
  const modelRow = facetScores.find((r) => r.granularity === "model" && r.facet === facet);
  if (modelRow) return { ...modelRow, resolved_from: "model" };
  return null;
}

export function scoreCar(
  facetScores: FacetScoreRow[],
  weights: Record<string, number>,
  powertrainId: string | null,
  variantId: string | null,
  brandFacetScores: BrandFacetScoreRow[] | null = null,
): ScoreResult {
  const breakdown: ScoreBreakdownItem[] = [];
  let evidenceCoverage = 0;
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [facet, theme] of Object.entries(FACET_THEME_MAP)) {
    const data = resolveFacetData(facetScores, facet, powertrainId, variantId, brandFacetScores);
    if (data === null) continue;

    const weight = weights[facet] ?? 1.0;
    const effectiveWeight = weight * CONFIDENCE_DAMPENING[data.confidence];
    const shrunkScore = data.score * (data.claim_count / (data.claim_count + EVIDENCE_PRIOR));
    const contribution = shrunkScore * effectiveWeight;
    weightedSum += contribution;
    totalWeight += effectiveWeight;
    evidenceCoverage += Math.min(1, data.claim_count / FULL_COVERAGE_CLAIMS);

    breakdown.push({
      facet,
      theme,
      score: data.score,
      weight: round(weight, 2),
      effective_weight: round(effectiveWeight, 2),
      contribution: round(contribution, 3),
      claim_count: data.claim_count,
      confidence: data.confidence,
      source_types: data.source_types,
      resolved_from: data.resolved_from,
      sample_evidence: data.evidence.slice(0, 2) as ScoreBreakdownItem["sample_evidence"],
    });
  }

  const rawComposite = totalWeight ? round(weightedSum / totalWeight, 3) : 0.0;
  breakdown.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  // Per-facet confidence dampens a single claim's influence within a score;
  // this dampens the *whole score* by how much of the car we've actually
  // covered. Without it, a car reviewed on 2 of 47 facets can outrank one
  // reviewed on 28 of 47 just because its tiny sample happened to be
  // favorable (see the Grand Vitara bug in CLAUDE.md's "Recommendation
  // engine" section). The multiplier counts thin facets partly (see
  // FULL_COVERAGE_CLAIMS); coverage_ratio stays a plain facet count because
  // the "Confident match" labels are worded around it.
  const coverageRatio = round(breakdown.length / TOTAL_FACETS, 3);
  const composite = round(rawComposite * (evidenceCoverage / TOTAL_FACETS), 3);

  return {
    composite_score: composite,
    raw_composite_score: rawComposite,
    coverage_ratio: coverageRatio,
    facets_with_data: breakdown.length,
    facets_missing: TOTAL_FACETS - breakdown.length,
    breakdown,
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
