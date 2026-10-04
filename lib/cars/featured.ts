/**
 * Which cars get a public, indexable page at /cars/<slug>.
 *
 * Data-driven since 4 Oct 2026 (was a hand-picked list of 20): every car in
 * the catalog gets a page once its review data is deep enough that the page
 * says something real. The rule lives in isPublishable() below and is applied
 * to the same CarPageData the page renders, so a car is listed in /cars and
 * the sitemap exactly when its page would render, never a hollow page.
 *
 * Cars below the bar (too few claims, too few reviewers, too few rated areas)
 * simply 404 until more reviews are extracted; they appear on their own after
 * the next daily revalidation once they clear it.
 */

/** Total review claims the car must hold (same safety net as before). */
export const MIN_CLAIMS_TO_PUBLISH = 60;
/** Distinct videos/threads those claims come from: one chatty reviewer is not consensus. */
export const MIN_SOURCES_TO_PUBLISH = 5;
/** Rated areas (facets with 3+ claims) shown in "ratings by area". Stricter
 * than the recommender's MIN_FACETS_FOR_ELIGIBILITY = 5, because a public page
 * with five rows reads as thin. */
export const MIN_RATED_FACETS_TO_PUBLISH = 8;
/** Facets with 5+ claims that fill the "likes" and "falls short" sections. */
export const MIN_HEADLINE_FACETS_TO_PUBLISH = 3;

export const SITE_URL = "https://cardhoondo.com";

export function carIdToSlug(carId: string): string {
  return carId.replace(/_/g, "-");
}

/** Shape check only; whether the car has a page is decided from the data. */
export function slugToCarId(slug: string): string | null {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  return slug.replace(/-/g, "_");
}

export function isPublishable(d: {
  claimCount: number;
  sourceCount: number;
  facets: unknown[];
  likes: unknown[];
  shortfalls: unknown[];
}): boolean {
  return (
    d.claimCount >= MIN_CLAIMS_TO_PUBLISH &&
    d.sourceCount >= MIN_SOURCES_TO_PUBLISH &&
    d.facets.length >= MIN_RATED_FACETS_TO_PUBLISH &&
    d.likes.length + d.shortfalls.length >= MIN_HEADLINE_FACETS_TO_PUBLISH
  );
}

/** The catalog stores the short brand; people search the full name. */
const DISPLAY_BRAND: Record<string, string> = {
  Maruti: "Maruti Suzuki",
};

export function displayBrand(brand: string): string {
  return DISPLAY_BRAND[brand] ?? brand;
}

export function carDisplayName(brand: string, model: string): string {
  return `${displayBrand(brand)} ${model}`;
}
