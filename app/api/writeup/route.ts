import { NextRequest, NextResponse } from "next/server";
import { deriveWeightVector } from "../../../lib/scoring/questionnaireWeights";
import { scoreCar } from "../../../lib/scoring/scoreRecommendation";
import { fetchRecommendationData } from "../../../lib/data/fetchRecommendationData";
import { generateWriteup, type WriteupCarInput } from "../../../lib/llm/writeup";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";
import type { RecommendCandidate, RecommendOutput } from "../../../lib/scoring/recommend";

interface WriteupRequestBody {
  recommendation_result_id: string;
}

/**
 * POST /api/writeup -- the live-API-call replacement for
 * .claude/skills/recommendation-writeup/SKILL.md. Takes the id of a
 * recommendation_results row already produced by /api/recommend, recomputes
 * each shortlisted car's FULL facet breakdown (not the top-5-capped version
 * stored in that row's `shortlist` json), asks the write-up LLM (Gemini --
 * see docs/llm_provider_decision.md) for just the prose parts, and saves the
 * combined result back onto the same row.
 *
 * Split into its own call (rather than folded into /api/recommend) so the
 * client can render the shortlist immediately and show the narrative
 * arriving a moment later -- matches the frontend prototype's "thinking
 * bridge" -> results pacing (CLAUDE.md, "Frontend — Questionnaire & Results
 * Prototype").
 */
export async function POST(req: NextRequest) {
  let body: WriteupRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.recommendation_result_id) {
    return NextResponse.json({ error: "Missing 'recommendation_result_id'" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: resultRow, error: resultErr } = await supabase
    .from("recommendation_results")
    .select("id, shortlist, questionnaire_responses(answers)")
    .eq("id", body.recommendation_result_id)
    .single();
  if (resultErr || !resultRow) {
    return NextResponse.json({ error: "recommendation_result_id not found" }, { status: 404 });
  }

  const shortlist = (resultRow.shortlist as RecommendOutput).shortlist as RecommendCandidate[];
  const carsSkippedNoReviewData = (resultRow.shortlist as RecommendOutput).cars_skipped_no_review_data ?? [];
  const answers = (resultRow as any).questionnaire_responses?.answers;
  if (!answers) {
    return NextResponse.json({ error: "Underlying questionnaire response not found" }, { status: 500 });
  }

  const weights = deriveWeightVector(answers);
  const { facetScoresByCar, brandFacetScoresByBrand } = await fetchRecommendationData();

  const writeupInputs: WriteupCarInput[] = shortlist.map((c, idx) => {
    const facetScores = facetScoresByCar[c.car_id] ?? [];
    const brand = c.car_id.split("_")[0];
    const brandFacetScores = brandFacetScoresByBrand[brand] ?? null;
    const fullScore = scoreCar(facetScores, weights, c.powertrain_id, c.variant_id, brandFacetScores);
    return {
      rank: idx + 1,
      car_id: c.car_id,
      brand: c.brand,
      car_model: c.car_model,
      variant_id: c.variant_id,
      powertrain_id: c.powertrain_id,
      price_on_road: c.price_on_road,
      score: fullScore,
    };
  });

  let writeup;
  try {
    writeup = await generateWriteup(answers, writeupInputs, carsSkippedNoReviewData);
  } catch (err) {
    return NextResponse.json({ error: "Write-up generation failed", detail: (err as Error).message }, { status: 502 });
  }

  const { error: updateErr } = await supabase
    .from("recommendation_results")
    .update({ writeup, llm_provider: writeup.llm_provider })
    .eq("id", resultRow.id);
  if (updateErr) {
    return NextResponse.json({ error: "Failed to save write-up", detail: updateErr.message }, { status: 500 });
  }

  return NextResponse.json(writeup);
}
