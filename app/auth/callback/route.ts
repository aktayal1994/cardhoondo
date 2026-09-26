import { NextRequest, NextResponse } from "next/server";
import { createRouteClient, ensureAuthEnabled, safeNext, setHintCookie } from "../../../lib/auth/session";
import { LEGAL_VERSIONS } from "../../../lib/auth/config";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";

/**
 * GET /auth/callback?code=...&next=/... -- where Supabase sends the browser
 * back after Google. Exchanges the one-time code for a session (using the
 * PKCE verifier cookie set in /auth/google), records that the user accepted
 * the Terms and Privacy Policy, sets the session cookies and returns them to
 * where they were. `next` is never trusted: it goes through safeNext().
 */
export async function GET(req: NextRequest) {
  const disabled = ensureAuthEnabled();
  if (disabled) return disabled;

  const site = process.env.SITE_URL || req.nextUrl.origin;
  const fail = (code: string) => NextResponse.redirect(new URL(`/auth/error?code=${code}`, site));

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("cancelled");
  const code = params.get("code");
  if (!code) return fail("expired");

  const ctx = createRouteClient(req);
  const { data, error } = await ctx.supabase.auth.exchangeCodeForSession(code);
  if (error || !data?.user) {
    console.error("google sign-in exchange failed:", error?.message);
    return ctx.applyCookies(fail("expired"));
  }

  // Signing in is the moment the user accepts the Terms and Privacy Policy
  // shown on the sign-in sheet. Best effort: never block sign-in on this.
  try {
    await getSupabaseServerClient()
      .from("user_consents")
      .upsert(
        { user_id: data.user.id, terms_version: LEGAL_VERSIONS.terms, privacy_version: LEGAL_VERSIONS.privacy },
        { onConflict: "user_id,terms_version,privacy_version", ignoreDuplicates: true },
      );
  } catch (e) {
    console.error("user_consents upsert failed:", (e as Error).message);
  }

  const res = NextResponse.redirect(new URL(safeNext(params.get("next")), site));
  return setHintCookie(ctx.applyCookies(res));
}
