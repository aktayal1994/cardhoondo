import { NextRequest, NextResponse } from "next/server";
import type { RecommendOutput } from "../../../lib/scoring/recommend";
import type { WriteupOutput } from "../../../lib/llm/writeup";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";
import { UUID_RE } from "../../../lib/saved/items";
import { buildShareSnapshot, newShareToken } from "../../../lib/share/snapshot";
import { deriveWeightVector } from "../../../lib/scoring/questionnaireWeights";
import { scoreCar } from "../../../lib/scoring/scoreRecommendation";
import { fetchRecommendationData } from "../../../lib/data/fetchRecommendationData";
import type { ScoreBreakdownItem } from "../../../lib/scoring/types";

/**
 * POST /api/share -- "Share" on the results page. Freezes the result's
 * current shortlist + write-up into a shared_results row and returns its
 * public path (/r/<token>). The result id itself is never put in a link,
 * because it also authorises "Show next best" on that result.
 */
export async function POST(req: NextRequest) {
  let body: { recommendation_result_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const resultId = body?.recommendation_result_id;
  if (!resultId || !UUID_RE.test(resultId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("recommendation_results")
    .select("id, shortlist, writeup, questionnaire_responses(answers)")
    .eq("id", resultId)
    .maybeSingle();
  if (error || !row) {
    return NextResponse.json({ error: "recommendation_result_id not found" }, { status: 404 });
  }
  const answers = (row as any).questionnaire_responses?.answers;
  const output = row.shortlist as RecommendOutput;
  if (!answers || !output?.shortlist?.length) {
    return NextResponse.json({ error: "Nothing to share" }, { status: 400 });
  }

  // Full per-facet ratings for each car (the stored shortlist keeps only the
  // top 5), scored the same way /api/writeup does, for the comparison grid.
  const weights = deriveWeightVector(answers);
  const { facetScoresByCar, brandFacetScoresByBrand } = await fetchRecommendationData();
  const breakdowns: Record<string, ScoreBreakdownItem[]> = {};
  for (const c of output.shortlist) {
    const brand = c.car_id.split("_")[0];
    breakdowns[c.car_id] = scoreCar(
      facetScoresByCar[c.car_id] ?? [],
      weights,
      c.powertrain_id,
      c.variant_id,
      brandFacetScoresByBrand[brand] ?? null,
    ).breakdown;
  }

  const snapshot = buildShareSnapshot(output, (row.writeup as WriteupOutput | null) ?? null, answers, breakdowns);

  // A clash on 70 random bits is practically impossible; retry once anyway.
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = newShareToken();
    const { error: insertErr } = await supabase
      .from("shared_results")
      .insert({ id: token, recommendation_result_id: row.id, snapshot });
    if (!insertErr) return NextResponse.json({ token, path: `/r/${token}` });
    if (insertErr.code !== "23505") break;
  }
  return NextResponse.json({ error: "Couldn't create the link" }, { status: 500 });
}
