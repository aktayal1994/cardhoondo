import { NextRequest } from "next/server";
import {
  badOriginResponse,
  clearAllAuthCookies,
  ensureAuthEnabled,
  getAuthedUser,
  jsonNoStore,
  sameOriginOk,
  unauthorizedResponse,
} from "../../../../lib/auth/session";
import { getSupabaseServerClient } from "../../../../lib/supabaseClient";

const REAUTH_WINDOW_MS = 10 * 60 * 1000;

/**
 * POST /api/account/delete  { confirm: "DELETE" }
 *
 * Erases the account and everything tied to it (DPDP right to erasure): saved
 * searches, the answers behind them, the results and feedback on those, the
 * name/pincode/phone entered on them (unless used elsewhere), then the login
 * itself. Requires a sign-in within the last 10 minutes, so a stolen or
 * forgotten open session can't wipe an account.
 *
 * Order matters: data first (the purge function is idempotent), then the auth
 * user. If the second step fails the caller can safely retry.
 */
export async function POST(req: NextRequest) {
  const disabled = ensureAuthEnabled();
  if (disabled) return disabled;
  if (!sameOriginOk(req)) return badOriginResponse();

  const ctx = await getAuthedUser(req);
  if (!ctx.user) return unauthorizedResponse(ctx);

  let body: { confirm?: string };
  try {
    body = await req.json();
  } catch {
    return jsonNoStore({ error: "Invalid JSON body", code: "bad_request" }, 400, ctx);
  }
  if (body.confirm !== "DELETE") {
    return jsonNoStore({ error: 'Type DELETE to confirm.', code: "confirm_required" }, 400, ctx);
  }

  const lastSignIn = ctx.user.last_sign_in_at ? new Date(ctx.user.last_sign_in_at).getTime() : 0;
  if (Date.now() - lastSignIn > REAUTH_WINDOW_MS) {
    return jsonNoStore({ error: "For your security, sign in again first.", code: "reauth_required" }, 403, ctx);
  }

  const svc = getSupabaseServerClient();
  const { data: purged, error: purgeErr } = await svc.rpc("purge_user_data", { p_user_id: ctx.user.id });
  if (purgeErr) {
    console.error("purge_user_data failed:", purgeErr.message);
    return jsonNoStore({ error: "Couldn't delete your data. Please try again.", code: "server_error" }, 500, ctx);
  }

  const { error: delErr } = await svc.auth.admin.deleteUser(ctx.user.id);
  if (delErr) {
    console.error("auth deleteUser failed:", delErr.message);
    return jsonNoStore({ error: "Couldn't finish deleting your account. Please try again.", code: "server_error" }, 500, ctx);
  }

  return clearAllAuthCookies(req, jsonNoStore({ ok: true, deleted: purged }));
}
