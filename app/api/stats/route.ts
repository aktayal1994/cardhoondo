import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";

/**
 * GET /api/stats -- real, live counts for the landing page's trust section
 * (review claims, cars catalogued), read straight off the tables that back
 * them. Replaces a hardcoded number in LandingScreen.tsx that had already
 * drifted stale once (4,036 written Aug 22, real count well past that by
 * Sep) -- a live count can't go stale the same way. `count: "exact", head:
 * true` asks Postgres for a row count without returning any rows, so this
 * stays cheap even as both tables grow.
 *
 * Explicitly uncacheable end to end: `dynamic = "force-dynamic"` stops
 * Next.js from ever prerendering/caching this route at build or request
 * time, and the response's own Cache-Control forbids any CDN or browser
 * from storing it either. This was previously cached for 10 minutes at the
 * edge, which is the opposite of what "real-time" means for a number the
 * user explicitly wants live -- traffic here is low enough that hitting
 * Supabase on every request costs nothing worth optimizing for.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseServerClient();

  const [claimsResult, carsResult] = await Promise.all([
    supabase.from("review_claims").select("id", { count: "exact", head: true }),
    supabase.from("cars").select("car_id", { count: "exact", head: true }),
  ]);

  if (claimsResult.error || carsResult.error) {
    return NextResponse.json(
      { error: "Failed to load stats", detail: claimsResult.error?.message ?? carsResult.error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { claims: claimsResult.count ?? 0, cars: carsResult.count ?? 0 },
    { headers: { "Cache-Control": "no-store, must-revalidate" } },
  );
}
