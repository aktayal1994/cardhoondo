import { NextRequest, NextResponse } from "next/server";
import { runRecommendation } from "../../../../lib/scoring/runRecommendation";
import { HIDDEN_CARS_KEY, type RecommendOutput } from "../../../../lib/scoring/recommend";
import type { QuestionnaireAnswers } from "../../../../lib/scoring/questionnaireWeights";
import { getSupabaseServerClient } from "../../../../lib/supabaseClient";
import { UUID_RE, buildTopCars } from "../../../../lib/saved/items";

interface HideRequestBody {
  recommendation_result_id: string;
  car_id: string;
  /** "hide" (default) removes the car from this search; "unhide" brings it back. */
  action?: "hide" | "unhide";
}

const CAR_ID_RE = /^[a-z0-9_]{2,60}$/;
const MAX_HIDDEN = 30;

/**
 * POST /api/recommend/hide -- "Not for me" on a result card.
 *
 * Adds (or removes) the car in the search's answers under q_hidden_cars, a
 * hard veto like q_brand_avoid, then re-runs the same scoring so the next
 * best car takes the free slot. Works for both results flows: a fresh
 * submission and a reopened saved search, because the veto lives on the
 * questionnaire response that both of them re-run.
 *
 * The result row is updated in place (same id), so the write-up, evidence
 * drill-down, compare view and feedback keep working off one id; the
 * write-up is cleared and the client asks /api/writeup for a fresh one.
 * A saved search pointing at this response gets its car snapshot updated
 * too, so reopening it doesn't report the user's own hiding as "what
 * changed since you last looked".
 */
export async function POST(req: NextRequest) {
  let body: HideRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const action = body?.action ?? "hide";
  if (
    !body?.recommendation_result_id ||
    !UUID_RE.test(body.recommendation_result_id) ||
    !body.car_id ||
    !CAR_ID_RE.test(body.car_id) ||
    (action !== "hide" && action !== "unhide")
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: resultRow, error: resultErr } = await supabase
    .from("recommendation_results")
    .select("id, questionnaire_response_id, questionnaire_responses(answers, respondents(pincode))")
    .eq("id", body.recommendation_result_id)
    .maybeSingle();
  if (resultErr || !resultRow) {
    return NextResponse.json({ error: "recommendation_result_id not found" }, { status: 404 });
  }

  const response = (resultRow as any).questionnaire_responses as
    | { answers: QuestionnaireAnswers; respondents?: { pincode?: string | null } | null }
    | null;
  if (!response?.answers) {
    return NextResponse.json({ error: "Underlying questionnaire response not found" }, { status: 500 });
  }

  const current = response.answers[HIDDEN_CARS_KEY];
  const hidden = new Set(Array.isArray(current) ? current : current ? [current] : []);
  if (action === "hide") hidden.add(body.car_id);
  else hidden.delete(body.car_id);
  if (hidden.size > MAX_HIDDEN) {
    return NextResponse.json({ error: "Too many hidden cars" }, { status: 400 });
  }

  const answers: QuestionnaireAnswers = { ...response.answers };
  if (hidden.size > 0) answers[HIDDEN_CARS_KEY] = Array.from(hidden);
  else delete answers[HIDDEN_CARS_KEY];

  let output: RecommendOutput;
  try {
    output = await runRecommendation(answers, 3, { pincode: response.respondents?.pincode ?? null });
  } catch (e) {
    console.error("hide re-run failed:", (e as Error).message);
    return NextResponse.json({ error: "Couldn't update the shortlist" }, { status: 500 });
  }

  const responseId = resultRow.questionnaire_response_id as string;
  const { error: answersErr } = await supabase.from("questionnaire_responses").update({ answers }).eq("id", responseId);
  if (answersErr) {
    return NextResponse.json({ error: "Couldn't update the shortlist" }, { status: 500 });
  }

  const { error: updateErr } = await supabase
    .from("recommendation_results")
    .update({ shortlist: output, writeup: null, llm_provider: null })
    .eq("id", resultRow.id);
  if (updateErr) {
    return NextResponse.json({ error: "Couldn't update the shortlist" }, { status: 500 });
  }

  await supabase.from("saved_searches").update({ top_cars: buildTopCars(output) }).eq("response_id", responseId);

  return NextResponse.json({ recommendation_result_id: resultRow.id, ...output });
}
