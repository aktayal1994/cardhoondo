import type { MetadataRoute } from "next";

const SITE_URL = "https://cardhoondo.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Mid-flow questionnaire/results/api routes depend on client state built up
      // sequentially from /questionnaire/intro -- there's nothing meaningful to
      // index if a crawler lands on them directly, so keep crawl budget on the
      // real content (home + guides) instead.
      disallow: ["/questionnaire/", "/results", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
