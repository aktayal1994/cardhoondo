import { NextRequest } from "next/server";
import {
  badOriginResponse,
  ensureAuthEnabled,
  getAuthedUser,
  jsonNoStore,
  sameOriginOk,
  unauthorizedResponse,
} from "../../../../../lib/auth/session";
import { getSupabaseServerClient } from "../../../../../lib/supabaseClient";
import { runRecommendation } from "../../../../../lib/scoring/runRecommendation";
import type { RecommendOutput } from "../../../../../lib/scoring/recommend";
import { SAVED_ITEM_COLUMNS, UUID_RE, buildTopCars, computeDiff, type SavedSearchItem } from "../../../../../lib/saved/items";
import type { TopCarSnapshot } from "../../../../../lib/persona/derivePersona";

type Ctx = { params: Promise<{ id: string }> };

const orderKey = (o: RecommendOutput) => (o.shortlist ?? []).map((c) => `${c.car_id}|${c.variant_id}`).join(",");

/**
 * POST /api/saved-searches/[id]/open
 *
 * Re-runs the recommender on a saved search's stored answers (review data grows
 * weekly, so the answer can change) and tells the user what changed since they
 * last looked. If the shortlist is unchanged the stored result row -- and its
 * already-written summary -- is reused, so opening a search doesn't spend a
 * Gemini call every time. Never creates a new questionnaire response.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const disabled = ensureAuthEnabled();
  if (disabled) return disabled;
  if (!sameOriginOk(req)) return badOriginResponse();

  const { id } = await params;
  const ctx = await getAuthedUser(req);
  if (!ctx.user) return unauthorizedResponse(ctx);
  if (!UUID_RE.test(id)) return jsonNoStore({ error: "Not found", code: "not_found" }, 404, ctx);

  // Ownership proof: this read goes through the user's own client, so row-level
  // security returns nothing for someone else's search.
  const { data: saved, error: savedErr } = await ctx.supabase
    .from("saved_searches")
    .select(`${SAVED_ITEM_COLUMNS}, response_id`)
    .eq("id", id)
    .maybeSingle();
  if (savedErr) return jsonNoStore({ error: "Couldn't open this search", code: "server_error" }, 500, ctx);
  if (!saved || !saved.response_id) {
    return jsonNoStore({ error: "This saved search no longer exists.", code: "not_found" }, 404, ctx);
  }

  const svc = getSupabaseServerClient();
  const { data: resp } = await svc
    .from("questionnaire_responses")
    .select("answers, respondents(pincode)")
    .eq("id", saved.response_id)
    .maybeSingle();
  if (!resp) return jsonNoStore({ error: "This saved search no longer exists.", code: "not_found" }, 404, ctx);
  // Price for the city the search was made from (the respondent's pincode).
  const pincode = (resp as { respondents?: { pincode?: string | null } | null }).respondents?.pincode ?? null;

  let output: RecommendOutput;
  try {
    output = await runRecommendation(resp.answers, 3, { pincode });
  } catch (e) {
    console.error("saved search re-run failed:", (e as Error).message);
    return jsonNoStore({ error: "Couldn't re-run this search", code: "server_error" }, 500, ctx);
  }

  const { data: latestRows } = await svc
    .from("recommendation_results")
    .select("id, shortlist, writeup")
    .eq("questionnaire_response_id", saved.response_id)
    .order("created_at", { ascending: false })
    .limit(1);
  const latest = latestRows?.[0];

  let resultId: string;
  let writeup: unknown = null;
  if (latest && orderKey(latest.shortlist as RecommendOutput) === orderKey(output)) {
    resultId = latest.id;
    writeup = latest.writeup ?? null;
  } else {
    const { data: inserted, error: insErr } = await svc
      .from("recommendation_results")
      .insert({ questionnaire_response_id: saved.response_id, shortlist: output })
      .select("id")
      .single();
    if (insErr || !inserted) return jsonNoStore({ error: "Couldn't re-run this search", code: "server_error" }, 500, ctx);
    resultId = inserted.id;
  }

  const before = (saved.top_cars ?? []) as TopCarSnapshot[];
  const after = buildTopCars(output);
  const diff = computeDiff(before, after);

  const update: Record<string, unknown> = { last_opened_at: new Date().toISOString() };
  if (diff.changed) {
    update.previous_top_cars = before;
    update.top_cars = after;
  }
  await svc.from("saved_searches").update(update).eq("id", id);

  const { data: item } = await ctx.supabase.from("saved_searches").select(SAVED_ITEM_COLUMNS).eq("id", id).maybeSingle();

  return jsonNoStore(
    {
      ...output,
      questionnaire_response_id: saved.response_id,
      recommendation_result_id: resultId,
      writeup,
      diff,
      saved_search: item as SavedSearchItem | null,
    },
    200,
    ctx,
  );
}
