import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";

const VALID_REACTIONS = ["makes_sense", "not_quite", "not_expected"] as const;
type Reaction = (typeof VALID_REACTIONS)[number];

interface FeedbackRequestBody {
  recommendation_result_id: string;
  reaction: Reaction;
  comment?: string;
}

/**
 * POST /api/feedback -- the "was this recommendation actually good" signal.
 * One row per submission: a tap-first reaction plus an optional free-text
 * comment, both sent together (no anon update policy exists, so the client
 * collects both before sending rather than patching a comment in later).
 * See supabase/schema.sql's recommendation_feedback table comment for why
 * this exists.
 */
export async function POST(req: NextRequest) {
  let body: FeedbackRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.recommendation_result_id || typeof body.recommendation_result_id !== "string") {
    return NextResponse.json({ error: "Missing 'recommendation_result_id'" }, { status: 400 });
  }
  if (!VALID_REACTIONS.includes(body.reaction)) {
    return NextResponse.json({ error: "Invalid 'reaction'" }, { status: 400 });
  }

  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) : "";

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("recommendation_feedback").insert({
    recommendation_result_id: body.recommendation_result_id,
    reaction: body.reaction,
    comment: comment || null,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to save feedback", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
