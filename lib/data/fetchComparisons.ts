import { ALL_PAIRS, COMPARISON_TRIOS, comparisonSlug } from "../cars/comparisons";
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
 * The comparison pages that exist right now: pairs from ALL_PAIRS (hand-picked + catalog rivals) where
 * both cars have a published review page, are still sold new and share at
 * least MIN_SHARED_AREAS rated areas. Built from
 * the same cached summaries as /cars and the sitemap, so a comparison can
 * never link to a review page that 404s.
 */
export async function fetchPublishedComparisons(): Promise<PublishedComparison[]> {
  const cars = await fetchFeaturedCarSummaries();
  const byId = new Map(cars.map((c) => [c.carId, c]));
  const out: PublishedComparison[] = [];
  for (const [aId, bId] of ALL_PAIRS) {
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

export interface PublishedTrio {
  slug: string;
  cars: [FeaturedCarSummary, FeaturedCarSummary, FeaturedCarSummary];
}

/** Three-way pages that exist right now: all three cars published and on sale,
 * and every two of them share at least MIN_SHARED_AREAS rated areas. */
export async function fetchPublishedTrios(): Promise<PublishedTrio[]> {
  const cars = await fetchFeaturedCarSummaries();
  const byId = new Map(cars.map((c) => [c.carId, c]));
  const out: PublishedTrio[] = [];
  for (const ids of COMPARISON_TRIOS) {
    const sums = ids.map((id) => byId.get(id));
    if (sums.some((c) => !c || !c.onSale)) continue;
    const pages = await Promise.all(ids.map((id) => fetchCarPageData(id)));
    if (pages.some((p) => !p)) continue;
    const areas = pages.map((p) => new Set(p!.facets.map((f) => f.facet)));
    const shared = (x: number, y: number) => [...areas[x]].filter((f) => areas[y].has(f)).length;
    if (shared(0, 1) < MIN_SHARED_AREAS || shared(0, 2) < MIN_SHARED_AREAS || shared(1, 2) < MIN_SHARED_AREAS) continue;
    out.push({ slug: comparisonSlug(...ids), cars: sums as PublishedTrio["cars"] });
  }
  return out;
}
