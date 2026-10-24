import { randomBytes } from "node:crypto";
import type { RecommendOutput } from "../scoring/recommend";
import type { WriteupOutput } from "../llm/writeup";
import { deriveWeightVector, type QuestionnaireAnswers } from "../scoring/questionnaireWeights";
import type { ScoreBreakdownItem } from "../scoring/types";
import { derivePersona } from "../persona/derivePersona";
import { confidenceLabel, verdictPhrase } from "../verdict";

/**
 * A shared shortlist, frozen at the moment "Share" was pressed, so the link
 * shows exactly what the sharer saw even if they swap cars later. Holds no
 * name, phone or pincode (the on-road price keeps its city name, which is
 * what the sharer saw on the card). Stored in shared_results.snapshot and
 * rendered by /r/<token>.
 */
export interface SharedFacet {
  facet: string;
  verdict: string;
  /** -1..1, same scale as facet_scores.score. */
  score: number;
  claim_count: number;
  quote?: string;
}

export interface SharedCar {
  rank: number;
  car_id: string;
  brand: string;
  car_model: string;
  variant_id: string;
  price_on_road: number | null;
  price_city?: string;
  price_basis?: "city" | "estimate" | "delhi";
  facets_with_data: number;
  confidence: string;
  headline?: string;
  reasons_to_like: SharedFacet[];
  watch_outs: SharedFacet[];
}

export interface ShareSnapshot {
  version: 1;
  created_at: string;
  persona: { title: string; chips: string[] };
  /** The budget the person picked, in lakh, for the "where they sit" strip. */
  budget: { min: number; max: number } | null;
  cars: SharedCar[];
  /** The facets this person's answers weight most, rated per car. */
  grid: { facets: string[]; cells: Record<string, Record<string, { score: number; claim_count: number }>> };
}

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
export const SHARE_TOKEN_RE = /^[A-Za-z0-9]{12}$/;
const GRID_ROWS = 8;

/** 12 random characters (~70 bits): short enough for WhatsApp, not guessable. */
export function newShareToken(): string {
  const bytes = randomBytes(12);
  let out = "";
  for (const b of bytes) out += TOKEN_ALPHABET[b % TOKEN_ALPHABET.length];
  return out;
}

const BUDGET_BANDS: Record<string, [number, number]> = {
  "<5L": [3, 5],
  "5-10L": [5, 10],
  "10-15L": [10, 15],
  "15-20L": [15, 20],
  "20-25L": [20, 25],
  ">25L": [25, 35],
};

function budgetRange(answers: QuestionnaireAnswers): { min: number; max: number } | null {
  const raw = answers.q_budget;
  const bands = (Array.isArray(raw) ? raw : raw ? [raw] : []).map((b) => BUDGET_BANDS[b]).filter(Boolean);
  if (bands.length === 0) return null;
  return { min: Math.min(...bands.map((b) => b[0])), max: Math.max(...bands.map((b) => b[1])) };
}

/**
 * @param breakdowns each shortlisted car's FULL facet breakdown (scoreCar on
 * the person's weights), not the top-5 stored with the result.
 */
export function buildShareSnapshot(
  output: RecommendOutput,
  writeup: WriteupOutput | null,
  answers: QuestionnaireAnswers,
  breakdowns: Record<string, ScoreBreakdownItem[]>,
): ShareSnapshot {
  const byCar = new Map((writeup?.recommendations ?? []).map((w) => [w.car_id, w]));
  const scoreOf = (carId: string, facet: string) => breakdowns[carId]?.find((b) => b.facet === facet);

  const cars: SharedCar[] = output.shortlist.map((c, idx) => {
    const w = byCar.get(c.car_id);
    const fromList = (list: { facet: string; claim_count: number; quote?: string }[], fallback: number): SharedFacet[] =>
      list.map((e) => {
        const s = scoreOf(c.car_id, e.facet)?.score ?? fallback;
        return { facet: e.facet, verdict: verdictPhrase(s), score: s, claim_count: e.claim_count, quote: e.quote || undefined };
      });
    // Same fallback as the results page when there is no write-up: the scored facts themselves.
    const likes = w ? w.reasons_to_like : c.top_contributors.filter((b) => b.contribution > 0);
    const dislikes = w ? w.watch_outs : c.top_contributors.filter((b) => b.contribution < 0);
    return {
      rank: idx + 1,
      car_id: c.car_id,
      brand: c.brand,
      car_model: c.car_model,
      variant_id: c.variant_id,
      price_on_road: c.price_on_road,
      price_city: c.price_city,
      price_basis: c.price_basis,
      facets_with_data: c.facets_with_data,
      confidence: w?.confidence_label ?? confidenceLabel(c.coverage_ratio),
      headline: w?.headline,
      reasons_to_like: fromList(likes, 0.7),
      watch_outs: fromList(dislikes, -0.7),
    };
  });

  const weights = deriveWeightVector(answers);
  const minCars = Math.min(2, cars.length);
  const facets = Object.entries(weights)
    .filter(([f]) => cars.filter((c) => scoreOf(c.car_id, f)).length >= minCars)
    .sort((a, b) => b[1] - a[1])
    .slice(0, GRID_ROWS)
    .map(([f]) => f);
  const cells: ShareSnapshot["grid"]["cells"] = {};
  for (const c of cars) {
    cells[c.car_id] = {};
    for (const f of facets) {
      const s = scoreOf(c.car_id, f);
      if (s) cells[c.car_id][f] = { score: s.score, claim_count: s.claim_count };
    }
  }

  const persona = derivePersona(answers);
  return {
    version: 1,
    created_at: new Date().toISOString(),
    persona: { title: persona.title, chips: [...persona.chips] },
    budget: budgetRange(answers),
    cars,
    grid: { facets, cells },
  };
}
