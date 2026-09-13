import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";

const VALID_REACTIONS = ["makes_sense", "not_quite", "not_expected"] as const;
type Reaction = (typeof VALID_REACTIONS)[number];

interface RequestBody {
  recommendation_result_id?: string;
  reaction?: Reaction;
  car_id?: string;
  id?: string;
  comment?: string;
}

/**
 * POST /api/feedback -- the "was this recommendation actually good" signal.
 *
 * Two shapes, distinguished by which fields are present:
 * - {recommendation_result_id, reaction, car_id?} -- insert a new row,
 *   fired the instant someone taps a reaction (no separate "Send" step --
 *   friction there was suppressing response rate). Returns the new row's
 *   id.
 * - {id, comment} -- patch a comment onto a row created by the insert
 *   above, for whoever chooses to elaborate after the fact. This route
 *   runs through the service-role client (bypasses RLS), so there's no
 *   anon-update obstacle -- the two-call design is purely about not
 *   blocking the reaction on someone finishing a sentence, not a policy
 *   limitation.
 *
 * car_id is null for whole-shortlist feedback (asked on the results
 * screen) and set for per-car evidence feedback (asked on the drill-down) --
 * see supabase/schema.sql's recommendation_feedback table comment.
 */
export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  // Comment-update shape.
  if (body.id && typeof body.id === "string" && typeof body.comment === "string") {
    const comment = body.comment.trim().slice(0, 500);
    const { error } = await supabase
      .from("recommendation_feedback")
      .update({ comment: comment || null })
      .eq("id", body.id);
    if (error) {
      return NextResponse.json({ error: "Failed to save comment", detail: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Insert shape.
  if (!body.recommendation_result_id || typeof body.recommendation_result_id !== "string") {
    return NextResponse.json({ error: "Missing 'recommendation_result_id'" }, { status: 400 });
  }
  if (!body.reaction || !VALID_REACTIONS.includes(body.reaction)) {
    return NextResponse.json({ error: "Invalid 'reaction'" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("recommendation_feedback")
    .insert({
      recommendation_result_id: body.recommendation_result_id,
      reaction: body.reaction,
      car_id: typeof body.car_id === "string" ? body.car_id : null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save feedback", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
