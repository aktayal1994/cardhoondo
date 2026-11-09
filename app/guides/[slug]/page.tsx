import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "../../../lib/seo";
import RankedGuidePage from "../../../components/RankedGuidePage";
import { RANKED_GUIDES, findRankedGuide } from "../../../lib/guides/rankedGuides";

/** Every "best car for X" guide in lib/guides/rankedGuides.ts. The hand-written
 * guides have their own folders, which Next.js matches before this route. */
export const dynamicParams = false;

// The rankings are computed live from the review data, refreshed daily like the car pages they link to.
export const revalidate = 86400;

export function generateStaticParams() {
  return RANKED_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = findRankedGuide((await params).slug);
  if (!guide) return {};
  return pageMetadata({
    title: guide.seoTitle,
    description: guide.description,
    path: `/guides/${guide.slug}`,
    type: "article",
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const guide = findRankedGuide((await params).slug);
  if (!guide) notFound();
  return <RankedGuidePage guide={guide} />;
}
