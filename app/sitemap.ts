import type { MetadataRoute } from "next";

const SITE_URL = "https://cardhoondo.com";

const GUIDE_SLUGS = [
  "why-everyone-has-different-opinion",
  "petrol-diesel-or-cng",
  "manual-vs-automatic-india",
  "dealer-tricks-first-car",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...GUIDE_SLUGS.map((slug) => ({
      url: `${SITE_URL}/guides/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
