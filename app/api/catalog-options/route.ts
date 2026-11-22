import { NextResponse } from "next/server";
import { fetchCatalogOptions } from "../../../lib/data/fetchCatalogOptions";

/** GET /api/catalog-options -- light catalog for the questionnaire's budget
 * count and brand screens. Public catalog data only; cached for an hour at
 * the edge and a day on the server (tag car-pages). */
export async function GET() {
  try {
    const rows = await fetchCatalogOptions();
    return NextResponse.json(
      { rows },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json({ rows: [] }, { status: 500 });
  }
}
