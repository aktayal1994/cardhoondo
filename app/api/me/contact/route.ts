import { NextRequest } from "next/server";
import { AUTH_ENABLED } from "../../../../lib/auth/config";
import { getAuthedUser, jsonNoStore } from "../../../../lib/auth/session";
import { getSupabaseServerClient } from "../../../../lib/supabaseClient";

/**
 * GET /api/me/contact -- the name, pincode and phone this signed-in person gave
 * on their most recent saved search, so the questionnaire intro can offer them
 * instead of asking again.
 *
 * Kept off /api/me on purpose: the landing page calls that on every visit and
 * has no use for a phone number. Only the owner can reach it: the saved search
 * is read with the user's own client (RLS), and the respondent row is found only
 * through that search's response.
 */
export async function GET(req: NextRequest) {
  if (!AUTH_ENABLED) return jsonNoStore({ contact: null });

  const ctx = await getAuthedUser(req);
  if (!ctx.user) return jsonNoStore({ contact: null }, 200, ctx);

  const { data: saved } = await ctx.supabase
    .from("saved_searches")
    .select("response_id")
    .not("response_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const responseId = saved?.[0]?.response_id as string | undefined;
  if (!responseId) return jsonNoStore({ contact: null }, 200, ctx);

  const svc = getSupabaseServerClient();
  const { data: resp } = await svc
    .from("questionnaire_responses")
    .select("respondent_id")
    .eq("id", responseId)
    .maybeSingle();
  if (!resp?.respondent_id) return jsonNoStore({ contact: null }, 200, ctx);

  const { data: person } = await svc
    .from("respondents")
    .select("name, pincode, phone_number")
    .eq("id", resp.respondent_id)
    .maybeSingle();
  if (!person?.name || !person.pincode || !person.phone_number) return jsonNoStore({ contact: null }, 200, ctx);

  return jsonNoStore(
    { contact: { name: person.name, pincode: person.pincode, phone_number: person.phone_number } },
    200,
    ctx,
  );
}
