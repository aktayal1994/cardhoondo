import { NextRequest, NextResponse } from "next/server";
import { deriveWeightVector, type QuestionnaireAnswers } from "../../../lib/scoring/questionnaireWeights";
import { recommend } from "../../../lib/scoring/recommend";
import { fetchRecommendationData } from "../../../lib/data/fetchRecommendationData";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";

interface RecommendRequestBody {
  answers: QuestionnaireAnswers;
  top_n?: number;
  utm?: Record<string, string>;
}

/**
 * POST /api/recommend -- ports scripts/recommend.py's CLI into a live
 * endpoint. Takes a questionnaire submission, persists it, runs the same
 * structural-filter + scoring + ranking logic against data pulled from
 * Supabase, persists the result, and returns the shortlist.
 *
 * Does NOT call the write-up LLM -- that's a separate call (/api/writeup)
 * so a client can show the shortlist immediately and stream the narrative
 * in afterward, matching the frontend prototype's "thinking bridge" ->
 * results flow (see CLAUDE.md's "Frontend — Questionnaire & Results
 * Prototype" section).
 */
export async function POST(req: NextRequest) {
  let body: RecommendRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.answers || typeof body.answers !== "object") {
    return NextResponse.json({ error: "Missing 'answers' object" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: responseRow, error: insertErr } = await supabase
    .from("questionnaire_responses")
    .insert({ answers: body.answers, utm: body.utm ?? null })
    .select("id")
    .single();
  if (insertErr) {
    return NextResponse.json({ error: "Failed to save questionnaire response", detail: insertErr.message }, { status: 500 });
  }

  const weights = deriveWeightVector(body.answers);
  const recommendationData = await fetchRecommendationData();

  const output = recommend({
    answers: body.answers,
    weights,
    topN: body.top_n ?? 3,
    ...recommendationData,
  });

  const { data: resultRow, error: resultErr } = await supabase
    .from("recommendation_results")
    .insert({ questionnaire_response_id: responseRow.id, shortlist: output })
    .select("id")
    .single();
  if (resultErr) {
    return NextResponse.json({ error: "Failed to save recommendation result", detail: resultErr.message }, { status: 500 });
  }

  return NextResponse.json({
    questionnaire_response_id: responseRow.id,
    recommendation_result_id: resultRow.id,
    ...output,
  });
}
