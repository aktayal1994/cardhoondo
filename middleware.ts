import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Per-IP, per-route request cap for the three POST-only API routes.
 *
 * In-memory only -- resets on cold start and isn't shared across concurrent
 * edge instances, so it's a best-effort speed bump against scripted
 * enumeration and Gemini-cost abuse, not a hard guarantee. If real traffic
 * volume ever justifies it, replace the Map below with Upstash Redis
 * (`@upstash/ratelimit`) or Vercel's Firewall rate limiting, which enforce
 * the same limits globally across instances.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 10 * 60 * 1000;

const LIMITS: Record<string, number> = {
  "/api/recommend": 15,
  // Tightest limit: this is the one route that spends money (Gemini call) per request.
  "/api/writeup": 8,
  "/api/car-detail": 40,
};

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
  const limit = LIMITS[path];
  if (!limit) return NextResponse.next();

  const now = Date.now();
  pruneExpired(now);

  const key = `${path}:${clientIp(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests -- please slow down and try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  bucket.count++;
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/recommend", "/api/writeup", "/api/car-detail"],
};
