/**
 * Turns a computed shortlist (already scored by scoreCar -- see
 * lib/scoring/scoreRecommendation.ts) into the user-facing write-up. This is
 * the live-API-call version of .claude/skills/recommendation-writeup/SKILL.md
 * (see that file's docstring and docs/llm_provider_decision.md for why this
 * exists as a separate path from the dev-time Claude Code skill).
 *
 * Deliberate design difference from the skill: the skill asks the LLM to
 * produce the *entire* write-up JSON (headline, narrative, reasons_to_like,
 * watch_outs, quotes, verdicts) in one pass, because it's a human-in-the-loop
 * Claude Code session where a person can eyeball the output. A live API
 * endpoint serving real users doesn't have that eyeball -- so here, every
 * fact (which facets to cite, their verdict phrase, claim counts, source
 * mix, the quote text itself) is computed deterministically in TypeScript
 * from the same breakdown scoreCar() already produced, and the LLM is only
 * asked for the two things that are genuinely a language task: the
 * `headline`/`narrative` prose per car, and the `closing_note`. This shrinks
 * the hallucination surface to zero for anything numeric or quoted, and
 * uses far fewer tokens per call (helps stay inside Gemini's free-tier
 * quota -- see docs/llm_provider_decision.md).
 *
 * Hard rule, unchanged from the skill: nothing in this file may adjust a
 * score. scoreCar()'s output is the only source of truth for numbers.
 */
import type { ScoreBreakdownItem, ScoreResult } from "../scoring/types";
import type { QuestionnaireAnswers } from "../scoring/questionnaireWeights";

export interface WriteupFacetEntry {
  facet: string;
  theme: string;
  verdict: string;
  claim_count: number;
  source_mix: string;
  quote: string;
}

export interface WriteupCarInput {
  rank: number;
  car_id: string;
  brand: string;
  car_model: string;
  variant_id: string;
  powertrain_id: string;
  price_on_road: number | null;
  score: ScoreResult;
}

export interface WriteupCarOutput {
  rank: number;
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
  confidence_label: string;
  headline: string;
  narrative: string;
  reasons_to_like: WriteupFacetEntry[];
  watch_outs: WriteupFacetEntry[];
}

export interface WriteupOutput {
  generated_at: string;
  recommendations: WriteupCarOutput[];
  closing_note: string;
  llm_provider: string;
}

// Same thresholds as the frontend prototype's evidence-legibility pass and
// the recommendation-writeup skill -- see CLAUDE.md "Evidence legibility
// refinement" for why plain-language verdicts beat raw scores for this
// product's users.
export function verdictPhrase(score: number): string {
  if (score >= 0.6) return "Strongly positive";
  if (score >= 0.2) return "Generally positive";
  if (score > -0.2) return "Mixed reviews";
  if (score > -0.6) return "Generally negative";
  return "Strongly negative";
}

export function confidenceLabel(coverageRatio: number): string {
  if (coverageRatio >= 0.5) return "Confident match";
  if (coverageRatio >= 0.25) return "Good match, still building evidence";
  return "Early signal — limited reviews so far";
}

function sourceMix(sourceTypes: Record<string, number>): string {
  const parts = Object.entries(sourceTypes)
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${n} ${type}`);
  if (parts.length === 0) return "no source breakdown available";
  return `${parts.join(" + ")} review${Object.values(sourceTypes).reduce((a, b) => a + b, 0) === 1 ? "" : "s"}`;
}

function toEntry(item: ScoreBreakdownItem): WriteupFacetEntry {
  return {
    facet: item.facet,
    theme: item.theme,
    verdict: verdictPhrase(item.score),
    claim_count: item.claim_count,
    source_mix: sourceMix(item.source_types),
    quote: item.sample_evidence[0]?.quote ?? "",
  };
}

/** 2-4 facets with positive contribution, 0-3 with negative -- same shape
 * and caps as the skill, computed deterministically from the breakdown that
 * already exists rather than asking an LLM to pick. */
export function deriveReasonsAndWatchOuts(breakdown: ScoreBreakdownItem[]): {
  reasons_to_like: WriteupFacetEntry[];
  watch_outs: WriteupFacetEntry[];
} {
  const positive = breakdown.filter((b) => b.contribution > 0).slice(0, 4);
  const negative = breakdown.filter((b) => b.contribution < 0).slice(0, 3);
  return {
    reasons_to_like: positive.map(toEntry),
    watch_outs: negative.map(toEntry),
  };
}

interface GeminiProseResult {
  cars: { car_id: string; headline: string; narrative: string }[];
  closing_note: string;
}

function buildPrompt(
  answers: QuestionnaireAnswers,
  cars: (WriteupCarInput & { reasons_to_like: WriteupFacetEntry[]; watch_outs: WriteupFacetEntry[] })[],
  carsSkippedNoReviewData: string[],
): string {
  const carsBlock = cars
    .map((c) => {
      const reasons = c.reasons_to_like
        .map((r) => `    - ${r.facet} (${r.theme}): ${r.verdict}, ${r.claim_count} claims, ${r.source_mix}`)
        .join("\n") || "    (none)";
      const watchOuts = c.watch_outs
        .map((w) => `    - ${w.facet} (${w.theme}): ${w.verdict}, ${w.claim_count} claims, ${w.source_mix}`)
        .join("\n") || "    (none)";
      return `- car_id: ${c.car_id}\n  ${c.brand} ${c.car_model} (${c.variant_id}), rank #${c.rank}\n  price on-road: ${c.price_on_road ?? "unknown"}\n  composite score: ${c.score.composite_score} (coverage: ${Math.round(c.score.coverage_ratio * 100)}% of tracked factors)\n  reasons to like:\n${reasons}\n  watch-outs:\n${watchOuts}`;
    })
    .join("\n\n");

  return `You are writing the results screen for CarDhoondo, an Indian car-recommendation product. A ranking has ALREADY been computed by a deterministic scoring system — your only job is to explain it in plain, warm, honest language. Do not invent, adjust, or imply any fact, number, quote, or claim not given to you below.

User's stated answers (reference these by content where relevant, e.g. their top priorities or who rides with them): ${JSON.stringify(answers)}

Shortlisted cars, already ranked, with their pre-computed reasons to like and watch-outs (each already backed by real review evidence — do not add more, do not remove any, do not change their meaning):

${carsBlock}

${carsSkippedNoReviewData.length > 0 ? `Cars that matched this user's filters but had too little review data to rank confidently and were excluded: ${carsSkippedNoReviewData.join(", ")}. Mention this honestly in the closing note if relevant to what the user asked for — do not hide it, do not pad the shortlist to compensate.` : "Every car considered had enough review data to be scored; no data-gap caveat is needed unless the shortlist itself is shorter than expected."}

Return ONLY a JSON object with this exact shape, no markdown fences, no commentary:
{
  "cars": [
    { "car_id": "...", "headline": "one sentence, the single strongest reason this car fits THIS user specifically, not a generic tagline", "narrative": "2-4 sentences, plain language, weaving in the reasons-to-like/watch-outs facets above and referencing what the user actually said they care about" }
  ],
  "closing_note": "1-2 honest sentences about any real gaps (data-poor excluded cars, a shortlist shorter than requested, or an important stated priority with weak/no evidence among the reasons-to-like) — empty string if there's genuinely nothing to flag"
}`;
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<GeminiProseResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini response missing text content");
  return JSON.parse(text) as GeminiProseResult;
}

// "gemini-2.0-flash" (the original choice, see docs/llm_provider_decision.md)
// was retired for new API keys at some point after that decision was made --
// confirmed via a real 404 "no longer available to new users" response, not
// a guess. Switched to the "-latest" alias rather than pinning a new
// specific version, so this doesn't go stale the same way again; verified
// directly against the live API (see ListModels output checked Aug 8) that
// this alias currently resolves to a working model.
const DEFAULT_MODEL = "gemini-flash-latest";

/**
 * cars: shortlisted cars in rank order, each carrying the FULL scoreCar()
 * breakdown (not the top-5-capped version recommend.ts returns in
 * top_contributors) -- callers should re-run scoreCar() per shortlisted car
 * to get that, same as the recommendation-writeup skill's step 2.
 */
export async function generateWriteup(
  answers: QuestionnaireAnswers,
  cars: WriteupCarInput[],
  carsSkippedNoReviewData: string[],
  opts: { apiKey?: string; model?: string } = {},
): Promise<WriteupOutput> {
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set -- see .env.example");
  const model = opts.model ?? DEFAULT_MODEL;

  const carsWithDeterministicParts = cars.map((c) => ({
    ...c,
    ...deriveReasonsAndWatchOuts(c.score.breakdown),
  }));

  const prompt = buildPrompt(answers, carsWithDeterministicParts, carsSkippedNoReviewData);
  const prose = await callGemini(prompt, apiKey, model);
  const proseByCarId = new Map(prose.cars.map((c) => [c.car_id, c]));

  const recommendations: WriteupCarOutput[] = carsWithDeterministicParts.map((c) => {
    const p = proseByCarId.get(c.car_id);
    return {
      rank: c.rank,
      car_id: c.car_id,
      brand: c.brand,
      car_model: c.car_model,
      variant_id: c.variant_id,
      powertrain_id: c.powertrain_id,
      price_on_road: c.price_on_road,
      composite_score: c.score.composite_score,
      raw_composite_score: c.score.raw_composite_score,
      coverage_ratio: c.score.coverage_ratio,
      facets_with_data: c.score.facets_with_data,
      confidence_label: confidenceLabel(c.score.coverage_ratio),
      headline: p?.headline ?? "",
      narrative: p?.narrative ?? "",
      reasons_to_like: c.reasons_to_like,
      watch_outs: c.watch_outs,
    };
  });

  return {
    generated_at: new Date().toISOString(),
    recommendations,
    closing_note: prose.closing_note ?? "",
    llm_provider: model,
  };
}
