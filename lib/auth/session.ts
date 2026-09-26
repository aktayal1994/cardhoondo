import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { AUTH_ENABLED, HINT_COOKIE, SESSION_MAX_AGE_S } from "./config";

/**
 * Server-side session handling for route handlers.
 *
 * Design rules (docs/login_flow_design.md):
 *  - The browser never talks to Supabase. Session cookies are httpOnly and are
 *    read/written only here.
 *  - Authorization always uses getUser() (which revalidates the token with the
 *    auth server), never getSession() (which trusts the cookie contents).
 *  - user ids come from getUser(), never from a request body.
 */

type CookieToSet = { name: string; value: string; options: CookieOptions };

function isDeletion(o: CookieOptions | undefined): boolean {
  if (!o) return false;
  if (o.maxAge === 0) return true;
  if (o.expires && new Date(o.expires as Date | string).getTime() <= Date.now()) return true;
  return false;
}

/** Force our own cookie hardening on whatever the Supabase helper wants to set. */
function hardenOptions(name: string, o: CookieOptions | undefined) {
  // The PKCE verifier only needs to survive the trip to Google and back.
  const maxAge = name.includes("code-verifier") ? 10 * 60 : SESSION_MAX_AGE_S;
  return {
    ...(o ?? {}),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(isDeletion(o) ? {} : { maxAge }),
  };
}

export interface RouteClient {
  supabase: ReturnType<typeof createServerClient>;
  /** Copies any cookies Supabase asked to set (session, refresh, PKCE verifier) onto a response. */
  applyCookies: <T extends NextResponse>(res: T) => T;
}

/** A user-scoped Supabase client for one request. RLS applies to what it does. */
export function createRouteClient(req: NextRequest): RouteClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const pending: CookieToSet[] = [];
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (list: CookieToSet[]) => {
        pending.push(...list);
      },
    },
  });

  return {
    supabase,
    applyCookies: (res) => {
      for (const { name, value, options } of pending) res.cookies.set(name, value, hardenOptions(name, options));
      return res;
    },
  };
}

export interface AuthedContext extends RouteClient {
  user: User | null;
}

export async function getAuthedUser(req: NextRequest): Promise<AuthedContext> {
  const ctx = createRouteClient(req);
  const { data, error } = await ctx.supabase.auth.getUser();
  return { ...ctx, user: error ? null : data.user };
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

const NO_STORE = { "Cache-Control": "private, no-store" };

export function jsonNoStore(body: unknown, status = 200, ctx?: RouteClient): NextResponse {
  const res = NextResponse.json(body, { status, headers: NO_STORE });
  return ctx ? ctx.applyCookies(res) : res;
}

export function authDisabledResponse(): NextResponse {
  return NextResponse.json({ error: "Not found", code: "auth_disabled" }, { status: 404, headers: NO_STORE });
}

export function unauthorizedResponse(ctx?: RouteClient): NextResponse {
  return jsonNoStore({ error: "Please sign in again.", code: "session_expired" }, 401, ctx);
}

/** Guard for every auth-related route: 404 while the feature is off. */
export function ensureAuthEnabled(): NextResponse | null {
  return AUTH_ENABLED ? null : authDisabledResponse();
}

/** CSRF defence for mutating routes: Origin (or Referer) must match this host. */
export function sameOriginOk(req: NextRequest): boolean {
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!source) return false;
  try {
    return new URL(source).host === req.nextUrl.host;
  } catch {
    return false;
  }
}

export function badOriginResponse(): NextResponse {
  return NextResponse.json({ error: "Bad origin", code: "bad_origin" }, { status: 403, headers: NO_STORE });
}

/**
 * Open-redirect guard for `?next=`. Only same-site absolute paths are allowed:
 * must start with a single "/", no scheme, no backslashes, no control chars.
 */
export function safeNext(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || raw.length > 200) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes("\\") || /[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  if (/^\/[^/?#]*:/.test(raw)) return fallback;
  return raw;
}

export function setHintCookie<T extends NextResponse>(res: T): T {
  res.cookies.set(HINT_COOKIE, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  return res;
}

export function clearHintCookie<T extends NextResponse>(res: T): T {
  res.cookies.set(HINT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

/** Clears every Supabase auth cookie present on the request (used when a session is destroyed). */
export function clearAllAuthCookies<T extends NextResponse>(req: NextRequest, res: T): T {
  for (const c of req.cookies.getAll()) {
    if (c.name.startsWith("sb-")) res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
  }
  return clearHintCookie(res);
}
