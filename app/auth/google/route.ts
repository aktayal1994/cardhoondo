import { NextRequest, NextResponse } from "next/server";
import { createRouteClient, ensureAuthEnabled, safeNext } from "../../../lib/auth/session";

/**
 * GET /auth/google?next=/somewhere -- starts Google sign-in.
 *
 * Runs on the server (PKCE): Supabase asks Google, we redirect the browser to
 * Google's consent screen, and Google returns to Supabase, which returns to
 * /auth/callback on this site. The one-time PKCE verifier is stored in an
 * httpOnly cookie so only this browser can finish the sign-in.
 */
export async function GET(req: NextRequest) {
  const disabled = ensureAuthEnabled();
  if (disabled) return disabled;

  const site = process.env.SITE_URL || req.nextUrl.origin;
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const ctx = createRouteClient(req);

  const { data, error } = await ctx.supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}`,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data?.url) {
    console.error("google sign-in start failed:", error?.message);
    return NextResponse.redirect(new URL("/auth/error?code=provider", site));
  }
  return ctx.applyCookies(NextResponse.redirect(data.url));
}
