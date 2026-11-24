import { NextResponse } from "next/server";
import { QUESTIONS } from "../../../lib/questions";
import { PRIORITY_BALANCED, type QuestionnaireAnswers } from "../../../lib/scoring/questionnaireWeights";
import { DECIDE_MAX_CARS, DECIDE_MIN_CARS, runDecision } from "../../../lib/decide/runDecision";
import { DECIDE_QUESTION_IDS } from "../../../lib/decide/types";
import { BUDGET_SLIDER_MIN, BUDGET_SLIDER_TOP } from "../../../lib/scoring/recommend";

/**
 * POST /api/decide -- rank 2-3 cars the buyer already has in mind against
 * how they drive. Body: { car_ids: string[], answers: {question_id: value} }.
 * Nothing is stored and no personal details are asked: it is a pure
 * calculation over public review data.
 */
export async function POST(request: Request) {
  let body: { car_ids?: unknown; answers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const ids = Array.isArray(body.car_ids) ? body.car_ids : [];
  const carIds = Array.from(new Set(ids.filter((x): x is string => typeof x === "string" && /^[a-z0-9_]{2,60}$/.test(x))));
  if (carIds.length < DECIDE_MIN_CARS || carIds.length > DECIDE_MAX_CARS || carIds.length !== ids.length) {
    return NextResponse.json({ error: `Pick ${DECIDE_MIN_CARS} or ${DECIDE_MAX_CARS} different cars.` }, { status: 400 });
  }

  const raw = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, unknown>;
  const answers: QuestionnaireAnswers = {};
  for (const id of DECIDE_QUESTION_IDS) {
    const q = QUESTIONS.find((x) => x.id === id);
    const value = raw[id];
    if (!q || value == null) continue;
    if (q.type === "range") {
      // [min lakh, max lakh] from the budget slider.
      const nums = Array.isArray(value) && value.length === 2 ? value.map((v) => (typeof v === "string" ? parseFloat(v) : NaN)) : [];
      if (nums.length !== 2 || nums.some((n) => !Number.isFinite(n) || n < BUDGET_SLIDER_MIN || n > BUDGET_SLIDER_TOP) || nums[0] >= nums[1]) return bad(id);
      answers[id] = (value as string[]).map(String);
      continue;
    }
    const allowed = new Set(q.options.map((o) => o.value));
    if (q.type === "single") {
      if (typeof value !== "string" || !allowed.has(value)) return bad(id);
      answers[id] = value;
    } else {
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string" || !allowed.has(v))) return bad(id);
      const list = Array.from(new Set(value as string[]));
      if (q.maxSelect && list.length > q.maxSelect) return bad(id);
      if (list.length) answers[id] = list;
    }
  }
  // Always a v4 answer set, so the v4 weighting rules apply.
  if (!answers.q_priorities) answers.q_priorities = [PRIORITY_BALANCED];

  try {
    const result = await runDecision(carIds, answers);
    return NextResponse.json(result);
  } catch (e) {
    console.error("decide failed:", (e as Error).message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

function bad(id: string) {
  return NextResponse.json({ error: `Invalid answer for ${id}.` }, { status: 400 });
}
