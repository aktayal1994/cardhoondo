import { deriveWeightVector, type QuestionnaireAnswers } from "../scoring/questionnaireWeights";
import {
  careMultiplier,
  commuteFuelNudgeMultiplier,
  evRangeMultiplier,
  parkingPenaltyMultiplier,
  passesStructuralFilters,
  rearRoomMultiplier,
  recommend,
  MIN_FACETS_FOR_ELIGIBILITY,
  type RecommendCandidate,
} from "../scoring/recommend";
import { EVIDENCE_PRIOR, scoreCar } from "../scoring/scoreRecommendation";
import type { CatalogVariant, EvidenceQuote, ScoreBreakdownItem } from "../scoring/types";
import { fetchRecommendationData } from "../data/fetchRecommendationData";
import { fetchPublishedComparisons } from "../data/fetchComparisons";
import { fetchFeaturedCarSummaries } from "../data/fetchCarPage";
import { comparisonSlug } from "../cars/comparisons";
import { carDisplayName, carIdToSlug } from "../cars/featured";
import { facetLabel } from "../cars/labels";
import { fuelLabel } from "../cars/format";
import { verdictPhrase } from "../verdict";
import type { DecideArea, DecideCar, DecideNotFit, DecideResult } from "./types";

/**
 * "Decide between": the buyer already has 2-3 cars in mind and answers how
 * they drive. The same recommend() the full questionnaire uses ranks ONLY
 * those cars (no budget, no brand questions: they already chose the cars), so
 * the answer can never disagree with what Find my car would say for the same
 * person. Every sentence is built from the numbers; no AI text.
 */

export const DECIDE_MIN_CARS = 2;
/** No real cap for the buyer; this only stops a request naming more cars than the catalog holds. */
export const DECIDE_MAX_CARS = 100;

/** Gap between the two fits, as a share of the leader's score. */
const CLEAR_SHARE = 0.15;
const CLOSE_SHARE = 0.05;
/** Raw review-score gap (-1..+1) that counts as one car being ahead on an area. */
const AREA_GAP = 0.2;
/** Weight at or above this means the buyer's answers raised the area. */
const MATTERS_WEIGHT = 1.5;
/** A soft adjustment worth telling the buyer about. */
const NOTABLE_MULT = 0.97;
const QUOTE_MAX = 180;

function spec(variant: CatalogVariant, section: string, key: string): number | null {
  const text = String((variant.spec_sections?.[section] as Record<string, unknown> | undefined)?.[key] ?? "");
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function transmissionOf(variant: CatalogVariant): string {
  return String((variant.spec_sections?.["Engine & Transmission"] as Record<string, unknown> | undefined)?.["Transmission Type"] ?? "");
}

function shrunk(item: ScoreBreakdownItem): number {
  return item.score * (item.claim_count / (item.claim_count + EVIDENCE_PRIOR));
}

function pickQuote(evidence: EvidenceQuote[], positive: boolean): string | null {
  const want = positive ? "positive" : "negative";
  const q = evidence.find((e) => e.sentiment === want) ?? null;
  if (!q) return null;
  // Keep it to a line or two; the full quote is on the car's review page.
  if (q.quote.length <= QUOTE_MAX) return q.quote;
  const cut = q.quote.slice(0, QUOTE_MAX);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,.;:—-]+$/, "")}…`;
}

/** Plain-language lines for the soft adjustments that moved this car. */
function adjustmentLines(variant: CatalogVariant, answers: QuestionnaireAnswers, model: string): string[] {
  const lines: string[] = [];
  const parking = parkingPenaltyMultiplier(variant, answers);
  if (parking < NOTABLE_MULT) {
    const len = spec(variant, "Dimensions & Capacity", "Length");
    const wid = spec(variant, "Dimensions & Capacity", "Width");
    lines.push(
      `Marked down for your tight parking: the ${model} is ${len ? `${len.toLocaleString("en-IN")} mm long` : "long"}${wid ? ` and ${wid.toLocaleString("en-IN")} mm wide` : ""}.`,
    );
  }
  const rear = rearRoomMultiplier(variant, answers);
  if (rear < NOTABLE_MULT) {
    const wb = spec(variant, "Dimensions & Capacity", "Wheel Base");
    lines.push(`Marked down for three in the back: a ${wb ? `${wb.toLocaleString("en-IN")} mm` : "short"} wheelbase leaves less room.`);
  }
  // Kids and parents are checked separately (careMultiplier combines them),
  // so each line names the real reason.
  const care = Array.isArray(answers.q_extra_care) ? answers.q_extra_care : [];
  if (care.includes("Elderly parents")) {
    const h = spec(variant, "Dimensions & Capacity", "Height");
    const parentsOnly = { ...answers, q_extra_care: ["Elderly parents"] };
    if (h != null && careMultiplier(variant, parentsOnly) < NOTABLE_MULT) {
      lines.push(
        h < 1550
          ? `Marked down for elderly parents: at ${h.toLocaleString("en-IN")} mm tall it sits low, so getting in takes more bending.`
          : `Marked down for elderly parents: at ${h.toLocaleString("en-IN")} mm tall it's a climb to get in.`,
      );
    }
  }
  if (care.includes("Young kids")) {
    const kids = careMultiplier(variant, { ...answers, q_extra_care: ["Young kids"] });
    if (kids > 1) lines.push("Moved up for your kids: it has a 5-star child safety crash rating.");
    else if (kids < 1) lines.push("Marked down for your kids: its child safety crash rating is 3 stars or lower.");
  }
  const ev = evRangeMultiplier(variant, answers);
  if (ev < NOTABLE_MULT) {
    const range = spec(variant, "Engine & Transmission", "Range");
    lines.push(`Marked down for your daily distance: ${range ? `a claimed ${range} km range` : "its range"} is short once real-world losses are counted.`);
  }
  const fuel = commuteFuelNudgeMultiplier(variant, answers);
  if (Math.abs(fuel - 1) >= 0.02) {
    const f = fuelLabel(variant.fuel_type ?? "");
    lines.push(fuel > 1 ? `${f} suits your daily distance, so it got a small lift.` : `${f} suits your daily distance less well, so it got a small markdown.`);
  }
  return lines;
}

/** Why a car the buyer picked could not be ranked at all, in plain words. */
function notFitReasons(
  carId: string,
  variants: CatalogVariant[],
  answers: QuestionnaireAnswers,
  hasReviews: boolean,
  facetScores: Parameters<typeof scoreCar>[0] | undefined,
): string[] {
  if (!hasReviews || !facetScores) return ["We don't have enough owner and expert reviews of it yet to judge it fairly."];
  const reasons = new Set<string>();
  let anyPassed = false;
  for (const v of variants) {
    const { ok, reason } = passesStructuralFilters(v, answers);
    if (ok) {
      anyPassed = true;
      continue;
    }
    if (reason.startsWith("fuel")) {
      const fuels = Array.from(new Set(variants.map((x) => fuelLabel(x.fuel_type ?? "")).filter(Boolean)));
      reasons.add(`It isn't sold in the fuel you want (it comes in ${fuels.join(", ")}).`);
    } else if (reason.startsWith("seats")) {
      const seats = Array.from(new Set(variants.map((x) => x.seating_capacity).filter(Boolean)));
      reasons.add(`It doesn't seat the number of people you carry (it seats ${seats.join(", ")}).`);
    } else if (reason.startsWith("transmission")) {
      reasons.add(`It isn't sold with the gearbox you want in that fuel.`);
    }
  }
  if (anyPassed || reasons.size === 0) {
    // Passed the filters but too thin on review data for the version that fits.
    reasons.add(`We don't have enough reviews of the version that fits you (needs ${MIN_FACETS_FOR_ELIGIBILITY}+ rated areas).`);
  }
  return Array.from(reasons);
}

function areasFor(winner: ScoreBreakdownItem[], other: ScoreBreakdownItem[], weights: Record<string, number>) {
  const otherByFacet = new Map(other.map((i) => [i.facet, i]));
  const rows: (DecideArea & { importance: number; diff: number })[] = [];
  for (const w of winner) {
    const o = otherByFacet.get(w.facet);
    if (!o) continue;
    const raw = w.score - o.score;
    if (Math.abs(raw) < AREA_GAP) continue;
    const weight = weights[w.facet] ?? 1;
    const diff = shrunk(w) - shrunk(o);
    const ahead = raw > 0 ? w : o;
    rows.push({
      facet: w.facet,
      label: facetLabel(w.facet),
      winner_verdict: verdictPhrase(w.score),
      other_verdict: verdictPhrase(o.score),
      winner_claims: w.claim_count,
      other_claims: o.claim_count,
      matters_to_you: weight >= MATTERS_WEIGHT,
      quote: pickQuote(ahead.sample_evidence, true),
      importance: weight * Math.abs(diff),
      diff,
    });
  }
  const strip = ({ importance, diff, ...rest }: (typeof rows)[number]): DecideArea => (void importance, void diff, rest);
  const ahead = rows.filter((r) => r.diff > 0).sort((a, b) => b.importance - a.importance).slice(0, 4).map(strip);
  const behind = rows.filter((r) => r.diff < 0).sort((a, b) => b.importance - a.importance).slice(0, 3).map(strip);
  return { ahead, behind };
}

export async function runDecision(carIds: string[], answers: QuestionnaireAnswers): Promise<DecideResult> {
  const weights = deriveWeightVector(answers);
  const data = await fetchRecommendationData();
  const picked = new Set(carIds);
  const catalogVariants = data.catalogVariants
    .filter((v) => picked.has(v.car_id))
    .map((v) => ({ ...v, price_city: "New Delhi", price_basis: "delhi" as const }));

  const out = recommend({
    answers,
    weights,
    topN: carIds.length,
    catalogVariants,
    facetScoresByCar: data.facetScoresByCar,
    brandFacetScoresByBrand: data.brandFacetScoresByBrand,
  });

  const variantByKey = new Map(catalogVariants.map((v) => [`${v.car_id}::${v.variant_id}`, v]));
  const nameOf = (carId: string) => {
    const v = catalogVariants.find((x) => x.car_id === carId);
    return v ? carDisplayName(v.brand, v.car_model) : carId;
  };
  const modelOf = (carId: string) => catalogVariants.find((x) => x.car_id === carId)?.car_model ?? carId;

  // Full breakdown per ranked car (the candidate keeps only its top five).
  const brandOf = (carId: string) => carId.split("_")[0];
  const breakdownOf = (c: RecommendCandidate) =>
    scoreCar(
      data.facetScoresByCar[c.car_id],
      weights,
      c.powertrain_id,
      c.variant_id,
      data.brandFacetScoresByBrand[brandOf(c.car_id)] ?? null,
    ).breakdown;

  const ranked = out.all_ranked_cars;
  const breakdowns = new Map(ranked.map((c) => [c.car_id, breakdownOf(c)]));

  const cars: DecideCar[] = ranked.map((c, i) => {
    const v = variantByKey.get(`${c.car_id}::${c.variant_id}`)!;
    const bd = breakdowns.get(c.car_id)!;
    const byPull = [...bd].sort((a, b) => b.contribution - a.contribution);
    const best = byPull.filter((x) => x.score >= 0.2).slice(0, 3);
    const worst = [...byPull].reverse().filter((x) => x.score <= -0.2).slice(0, 2);
    return {
      car_id: c.car_id,
      name: nameOf(c.car_id),
      model: c.car_model,
      rank: i + 1,
      variant_id: c.variant_id,
      fuel: fuelLabel(v.fuel_type ?? ""),
      transmission: transmissionOf(v),
      price_on_road: c.price_on_road,
      score: c.composite_score,
      facets_with_data: c.facets_with_data,
      strengths: best.map((x) => ({ facet: x.facet, label: facetLabel(x.facet), verdict: verdictPhrase(x.score), claims: x.claim_count })),
      weaknesses: worst.map((x) => ({ facet: x.facet, label: facetLabel(x.facet), verdict: verdictPhrase(x.score), claims: x.claim_count })),
      adjustments: adjustmentLines(v, answers, c.car_model),
    };
  });

  const rankedIds = new Set(ranked.map((c) => c.car_id));
  const notFit: DecideNotFit[] = carIds
    .filter((id) => !rankedIds.has(id))
    .map((id) => ({
      car_id: id,
      name: nameOf(id),
      model: modelOf(id),
      reasons: notFitReasons(
        id,
        catalogVariants.filter((v) => v.car_id === id),
        answers,
        !out.cars_skipped_no_review_data.includes(id),
        data.facetScoresByCar[id],
      ),
    }));

  let verdict: DecideResult["verdict"] = null;
  if (cars.length >= 2) {
    const [w, ...others] = cars;
    // #1 against every other ranked car: the page opens on #2 (the real
    // decision) and can switch to any other car on the list.
    const matchups: NonNullable<DecideResult["verdict"]>["matchups"] = {};
    for (const r of others) {
      const share = w.score > 0 ? (w.score - r.score) / w.score : w.score - r.score > 0.02 ? 1 : 0;
      const strength = share >= CLEAR_SHARE ? "clear" : share >= CLOSE_SHARE ? "close" : "tie";
      const { ahead, behind } = areasFor(breakdowns.get(w.car_id)!, breakdowns.get(r.car_id)!, weights);
      matchups[r.car_id] = { strength, ahead, behind };
    }
    verdict = { winner_id: w.car_id, runner_up_id: others[0].car_id, matchups };
  }

  // Links to the pages that already exist for these cars.
  const [published, summaries] = await Promise.all([
    fetchPublishedComparisons().catch(() => []),
    fetchFeaturedCarSummaries().catch(() => []),
  ]);
  const publishedSlugs = new Set(published.map((p) => p.slug));
  const pageIds = new Set(summaries.map((s) => s.carId));
  const compareLinks: { slug: string; a: string; b: string }[] = [];
  for (let i = 0; i < carIds.length; i++) {
    for (let j = i + 1; j < carIds.length; j++) {
      for (const [a, b] of [[carIds[i], carIds[j]], [carIds[j], carIds[i]]]) {
        const slug = comparisonSlug(a, b);
        if (publishedSlugs.has(slug)) compareLinks.push({ slug, a: modelOf(a), b: modelOf(b) });
      }
    }
  }

  return {
    cars,
    not_fit: notFit,
    verdict,
    car_pages: Object.fromEntries(carIds.filter((id) => pageIds.has(id)).map((id) => [id, carIdToSlug(id)])),
    compare_links: compareLinks,
  };
}
