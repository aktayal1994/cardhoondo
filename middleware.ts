import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Per-IP, per-route-family request cap for the API and auth routes.
 *
 * In-memory only -- resets on cold start and isn't shared across concurrent
 * edge instances, so it's a best-effort speed bump against scripted
 * enumeration and Gemini-cost abuse, not a hard guarantee. If real traffic
 * volume ever justifies it, replace the Map below with Upstash Redis
 * (`@upstash/ratelimit`) or Vercel's Firewall rate limiting, which enforce
 * the same limits globally across instances.
 *
 * Routes are grouped by family (not raw path) so dynamic ids such as
 * /api/saved-searches/<uuid>/open can't create unbounded bucket keys.
 * First matching group wins, so more specific groups go first.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

interface Group {
  key: string;
  limit: number;
  match: (path: string) => boolean;
}

const WINDOW_MS = 10 * 60 * 1000;

const GROUPS: Group[] = [
  { key: "recommend", limit: 15, match: (p) => p === "/api/recommend" },
  // Tightest limit: this is the one route that spends money (Gemini call) per request.
  { key: "writeup", limit: 8, match: (p) => p === "/api/writeup" },
  { key: "car-detail", limit: 40, match: (p) => p === "/api/car-detail" },
  { key: "feedback", limit: 20, match: (p) => p === "/api/feedback" },
  // Dealer-quote check: /api/quotation serves the car/variant dropdowns,
  // /api/quote-analysis runs the analysis and writes a row; /api/city-lookup
  // fans out to India Post's public API.
  { key: "quotation", limit: 60, match: (p) => p === "/api/quotation" },
  { key: "quote-analysis", limit: 15, match: (p) => p === "/api/quote-analysis" },
  { key: "city-lookup", limit: 40, match: (p) => p === "/api/city-lookup" },
  // Google sign-in and saved searches.
  { key: "auth-oauth", limit: 15, match: (p) => p === "/auth/google" || p === "/auth/callback" },
  { key: "auth-signout", limit: 20, match: (p) => p === "/api/auth/signout" },
  { key: "me", limit: 60, match: (p) => p === "/api/me" || p === "/api/me/contact" },
  // Opening a saved search re-runs the recommender, so it is limited harder than plain CRUD.
  { key: "saved-open", limit: 15, match: (p) => p.startsWith("/api/saved-searches/") && p.endsWith("/open") },
  { key: "saved", limit: 60, match: (p) => p.startsWith("/api/saved-searches") },
  { key: "account", limit: 10, match: (p) => p.startsWith("/api/account/") },
];

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map doesn't grow unbounded under sustained traffic.
function pruneExpired(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

function clientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const group = GROUPS.find((g) => g.match(path));
  if (!group) return NextResponse.next();

  const now = Date.now();
  pruneExpired(now);

  const key = `${group.key}:${clientIp(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (bucket.count >= group.limit) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests -- please slow down and try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(group.limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  bucket.count++;
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/recommend",
    "/api/writeup",
    "/api/car-detail",
    "/api/feedback",
    "/api/quotation",
    "/api/quote-analysis",
    "/api/city-lookup",
    "/api/me",
    "/api/me/contact",
    "/api/auth/:path*",
    "/api/saved-searches/:path*",
    "/api/saved-searches",
    "/api/account/:path*",
    "/auth/google",
    "/auth/callback",
  ],
};
