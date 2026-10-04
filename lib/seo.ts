import type { Metadata } from "next";

/**
 * Search/social metadata for one page, so every page carries its own title,
 * description, canonical, og:* and twitter:* (child metadata replaces the
 * root layout's openGraph/twitter objects wholesale, so a page that sets only
 * a title would otherwise share the homepage's og/twitter text).
 *
 * Length budget: Google shows roughly 60 characters of a title and 155 of a
 * description. `title` here is the full text shown in the tab; it is emitted
 * as `absolute` so the root "%s | CarDhoondo" template cannot push it over.
 */
export const MAX_TITLE_CHARS = 60;
export const MAX_DESCRIPTION_CHARS = 155;

const DEFAULT_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: "CarDhoondo" };

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  image?: { url: string; width: number; height: number; alt?: string };
}): Metadata {
  const { title, description, path } = opts;
  const image = opts.image ?? DEFAULT_IMAGE;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: opts.type ?? "website",
      siteName: "CarDhoondo",
      locale: "en_IN",
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

/** "<page title> | CarDhoondo" when that fits in the title budget, else the bare title. */
export function withBrand(title: string): string {
  const branded = `${title} | CarDhoondo`;
  return branded.length <= MAX_TITLE_CHARS ? branded : title;
}
