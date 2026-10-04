import type { MetadataRoute } from "next";
import { SITE_URL, carIdToSlug } from "../lib/cars/featured";
import { fetchFeaturedCarSummaries } from "../lib/data/fetchCarPage";
import type { FeaturedCarSummary } from "../lib/data/fetchCarPage";

// Real last-change dates only: a lastmod that is just "now" on every URL teaches
// Google to ignore the field. Guides carry the date of their last content edit;
// car pages carry the time their scores were last regenerated. Pages with no
// meaningful date (home, quotation, legal) leave it out.
const GUIDES: { slug: string; lastModified: string }[] = [
  { slug: "why-everyone-has-different-opinion", lastModified: "2026-08-23" },
  { slug: "petrol-diesel-or-cng", lastModified: "2026-08-23" },
  { slug: "manual-vs-automatic-india", lastModified: "2026-08-23" },
  { slug: "dealer-tricks-first-car", lastModified: "2026-09-26" },
];

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // No try/catch on purpose: if the database is down during a revalidation the
  // error keeps the previous sitemap (with all car URLs) live, instead of
  // caching a sitemap with every car page missing for a day.
  const cars: FeaturedCarSummary[] = await fetchFeaturedCarSummaries();
  const newestCar = cars.reduce<string | null>((m, c) => (c.updatedAt && (!m || c.updatedAt > m) ? c.updatedAt : m), null);

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/cars`, ...(newestCar ? { lastModified: newestCar } : {}), changeFrequency: "weekly", priority: 0.9 },
    ...cars.map((c) => ({
      url: `${SITE_URL}/cars/${carIdToSlug(c.carId)}`,
      ...(c.updatedAt ? { lastModified: c.updatedAt } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/guides`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/quotation`, changeFrequency: "monthly", priority: 0.8 },
    ...GUIDES.map((g) => ({
      url: `${SITE_URL}/guides/${g.slug}`,
      lastModified: g.lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
