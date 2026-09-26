import { NextRequest } from "next/server";
import {
  badOriginResponse,
  clearAllAuthCookies,
  createRouteClient,
  ensureAuthEnabled,
  jsonNoStore,
  sameOriginOk,
} from "../../../../lib/auth/session";

/** POST /api/auth/signout -- ends this browser's session and clears its cookies. */
export async function POST(req: NextRequest) {
  const disabled = ensureAuthEnabled();
  if (disabled) return disabled;
  if (!sameOriginOk(req)) return badOriginResponse();

  const ctx = createRouteClient(req);
  try {
    await ctx.supabase.auth.signOut({ scope: "local" });
  } catch {
    // Even if the auth server can't be reached, clearing our cookies below
    // still signs this browser out.
  }
  return clearAllAuthCookies(req, ctx.applyCookies(jsonNoStore({ ok: true })));
}
