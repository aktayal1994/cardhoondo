import { NextRequest, NextResponse } from "next/server";
import { deriveWeightVector } from "../../../lib/scoring/questionnaireWeights";
import { scoreCar } from "../../../lib/scoring/scoreRecommendation";
import { fetchRecommendationData } from "../../../lib/data/fetchRecommendationData";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";
import type { RecommendCandidate, RecommendOutput } from "../../../lib/scoring/recommend";

interface CarDetailRequestBody {
  recommendation_result_id: string;
  car_id: string;
}

/**
 * POST /api/car-detail -- serves the FULL per-facet scoreCar() breakdown for
 * one shortlisted car, for the results screen's evidence drill-down.
 *
 * Neither /api/recommend (top_contributors, capped to 5) nor /api/writeup
 * (reasons_to_like/watch_outs, capped to 4/3) expose the complete breakdown
 * -- both were deliberately capped for their own contexts (a shortlist card,
 * an LLM prompt). The drill-down needs every scored facet, the same way the
 * frontend prototype's evidence view showed every facet with data, not just
 * the top movers. Rather than duplicate the scoring call inline in a client
 * component, this reuses the exact same scoreCar() call /api/writeup already
 * makes per car -- same inputs, same function, so the numbers can never
 * drift between what a user sees on the results card and in the drill-down.
 */
export async function POST(req: NextRequest) {
  let body: CarDetailRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.recommendation_result_id || !body?.car_id) {
    return NextResponse.json({ error: "Missing 'recommendation_result_id' or 'car_id'" }, { status: 400 });
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
  const candidate = shortlist.find((c) => c.car_id === body.car_id);
  if (!candidate) {
    return NextResponse.json({ error: "car_id not found in this recommendation's shortlist" }, { status: 404 });
  }

  const answers = (resultRow as any).questionnaire_responses?.answers;
  if (!answers) {
    return NextResponse.json({ error: "Underlying questionnaire response not found" }, { status: 500 });
  }

  const weights = deriveWeightVector(answers);
  const { facetScoresByCar, brandFacetScoresByBrand } = await fetchRecommendationData();
  const facetScores = facetScoresByCar[candidate.car_id] ?? [];
  const brand = candidate.car_id.split("_")[0];
  const brandFacetScores = brandFacetScoresByBrand[brand] ?? null;

  const score = scoreCar(facetScores, weights, candidate.powertrain_id, candidate.variant_id, brandFacetScores);

  return NextResponse.json({
    car_id: candidate.car_id,
    brand: candidate.brand,
    car_model: candidate.car_model,
    variant_id: candidate.variant_id,
    powertrain_id: candidate.powertrain_id,
    price_on_road: candidate.price_on_road,
    score,
  });
}
