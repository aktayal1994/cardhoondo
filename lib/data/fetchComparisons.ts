import { COMPARISON_PAIRS, comparisonSlug } from "../cars/comparisons";
import { fetchCarPageData, fetchFeaturedCarSummaries } from "./fetchCarPage";
import type { FeaturedCarSummary } from "./fetchCarPage";

/** Areas both cars must have verdicts on before a head-to-head says anything real. */
export const MIN_SHARED_AREAS = 5;

export interface PublishedComparison {
  slug: string;
  a: FeaturedCarSummary;
  b: FeaturedCarSummary;
}

/**
 * The comparison pages that exist right now: pairs from COMPARISON_PAIRS where
 * both cars have a published review page, are still sold new and share at
 * least MIN_SHARED_AREAS rated areas. Built from
 * the same cached summaries as /cars and the sitemap, so a comparison can
 * never link to a review page that 404s.
 */
export async function fetchPublishedComparisons(): Promise<PublishedComparison[]> {
  const cars = await fetchFeaturedCarSummaries();
  const byId = new Map(cars.map((c) => [c.carId, c]));
  const out: PublishedComparison[] = [];
  for (const [aId, bId] of COMPARISON_PAIRS) {
    const a = byId.get(aId);
    const b = byId.get(bId);
    if (!a || !b || !a.onSale || !b.onSale) continue;
    // Both page loads are cached per car, so this costs no extra queries after the first.
    const [da, db] = await Promise.all([fetchCarPageData(aId), fetchCarPageData(bId)]);
    if (!da || !db) continue;
    const bAreas = new Set(db.facets.map((f) => f.facet));
    if (da.facets.filter((f) => bAreas.has(f.facet)).length < MIN_SHARED_AREAS) continue;
    out.push({ slug: comparisonSlug(aId, bId), a, b });
  }
  return out;
}
