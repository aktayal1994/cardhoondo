import { NextRequest } from "next/server";
import {
  badOriginResponse,
  ensureAuthEnabled,
  getAuthedUser,
  jsonNoStore,
  sameOriginOk,
  unauthorizedResponse,
} from "../../../../lib/auth/session";
import { SAVED_SEARCH_LIMIT } from "../../../../lib/auth/config";
import { hashClaimToken, looksLikeClaimToken } from "../../../../lib/auth/claimToken";
import { getSupabaseServerClient } from "../../../../lib/supabaseClient";
import { derivePersona } from "../../../../lib/persona/derivePersona";
import { SAVED_ITEM_COLUMNS, UUID_RE, buildTopCars, type SavedSearchItem } from "../../../../lib/saved/items";
import type { RecommendOutput } from "../../../../lib/scoring/recommend";

/**
 * POST /api/saved-searches/claim  { response_id, claim_token, name? }
 *
 * Saves an anonymous search to the signed-in user's account. Proof of
 * ownership is the claim_token /api/recommend returned to this browser -- the
 * response id alone is not enough. The persona and the top-cars snapshot are
 * derived here on the server, never accepted from the client. The actual
 * write is one atomic, idempotent database function (claim_saved_search).
 */
export async function POST(req: NextRequest) {
  const disabled = ensureAuthEnabled();
  if (disabled) return disabled;
  if (!sameOriginOk(req)) return badOriginResponse();

  const ctx = await getAuthedUser(req);
  if (!ctx.user) return unauthorizedResponse(ctx);

  let body: { response_id?: string; claim_token?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return jsonNoStore({ error: "Invalid JSON body", code: "bad_request" }, 400, ctx);
  }

  const responseId = body.response_id;
  if (typeof responseId !== "string" || !UUID_RE.test(responseId) || !looksLikeClaimToken(body.claim_token)) {
    return jsonNoStore({ error: "We couldn't save this search.", code: "invalid_claim" }, 400, ctx);
  }

  const svc = getSupabaseServerClient();

  const { data: resp } = await svc.from("questionnaire_responses").select("id, answers").eq("id", responseId).maybeSingle();
  if (!resp) return jsonNoStore({ error: "We couldn't save this search.", code: "invalid_claim" }, 400, ctx);

  const { data: results } = await svc
    .from("recommendation_results")
    .select("shortlist")
    .eq("questionnaire_response_id", responseId)
    .order("created_at", { ascending: false })
    .limit(1);
  const output = results?.[0]?.shortlist as RecommendOutput | undefined;

  const { data: claim, error: claimErr } = await svc.rpc("claim_saved_search", {
    p_user_id: ctx.user.id,
    p_response_id: responseId,
    p_token_hash: hashClaimToken(body.claim_token),
    p_persona: derivePersona(resp.answers),
    p_top_cars: output ? buildTopCars(output) : [],
    p_max: SAVED_SEARCH_LIMIT,
  });
  if (claimErr) {
    console.error("claim_saved_search failed:", claimErr.message);
    return jsonNoStore({ error: "Couldn't save your search", code: "server_error" }, 500, ctx);
  }

  const status = (claim as { status?: string })?.status;
  if (status === "invalid_claim") {
    return jsonNoStore({ error: "We couldn't save this search.", code: "invalid_claim" }, 400, ctx);
  }
  if (status === "already_claimed") {
    return jsonNoStore({ error: "This search is already saved to another account.", code: "already_claimed" }, 409, ctx);
  }
  if (status === "limit_reached") {
    return jsonNoStore(
      { error: `You've reached ${SAVED_SEARCH_LIMIT} saved searches. Delete one to save this.`, code: "limit_reached" },
      409,
      ctx,
    );
  }

  const savedId = (claim as { saved_search_id: string }).saved_search_id;
  const created = (claim as { created: boolean }).created;

  // Optional label. Validated the same way as PATCH (1-60 chars, no control chars).
  const name = typeof body.name === "string" ? body.name.replace(/[\u0000-\u001f\u007f]/g, "").trim() : "";
  if (created && name.length >= 1 && name.length <= 60) {
    await ctx.supabase.from("saved_searches").update({ custom_name: name, updated_at: new Date().toISOString() }).eq("id", savedId);
  }

  const { data: item } = await ctx.supabase.from("saved_searches").select(SAVED_ITEM_COLUMNS).eq("id", savedId).maybeSingle();
  return jsonNoStore({ saved_search: item as SavedSearchItem | null, created }, 200, ctx);
}
