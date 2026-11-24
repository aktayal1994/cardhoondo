import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CarTopicPage, { topicPath } from "../../../../components/CarTopicPage";
import { carIdToSlug, slugToCarId } from "../../../../lib/cars/featured";
import { topicDescription, topicTitle } from "../../../../lib/cars/seo";
import { facetLabelInline } from "../../../../lib/cars/labels";
import { fetchCarTopics, fetchTopicAvailability, type TopicKind } from "../../../../lib/data/fetchCarTopics";
import { fetchPublishedComparisons } from "../../../../lib/data/fetchComparisons";
import { pageMetadata } from "../../../../lib/seo";

/** /cars/<slug>/mileage: see components/CarTopicPage.tsx. 404 unless the car clears this topic's evidence bar. */
const KIND: TopicKind = "mileage";
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const avail = await fetchTopicAvailability();
  return avail.filter((a) => a.topics.includes(KIND)).map((a) => ({ slug: carIdToSlug(a.carId) }));
}

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const carId = slugToCarId(slug);
  if (!carId) return null;
  const avail = await fetchTopicAvailability();
  if (!avail.some((a) => a.carId === carId && a.topics.includes(KIND))) return null;
  return fetchCarTopics(carId);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const t = await load(slug);
  if (!t || !t[KIND]) return {};
  const { name, model } = t.car;
  const facets = KIND === "mileage" ? [] : (t[KIND as "problems" | "pros"] ?? []);
  const count = KIND === "mileage" ? t.mileage!.quoteCount : facets.reduce((s, f) => s + f.matchingClaims, 0);
  const sources = KIND === "mileage" ? t.mileage!.sourceCount : t.car.sourceCount;
  return pageMetadata({
    title: topicTitle(KIND, name, model, t.isEv),
    description: topicDescription(KIND, model, count, sources, facets.map((f) => facetLabelInline(f.facet)), t.isEv),
    path: topicPath(t.car.carId, KIND),
    type: "article",
  });
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const t = await load(slug);
  if (!t || !t[KIND]) notFound();
  const comparisons = (await fetchPublishedComparisons()).filter((c) => c.a.carId === t.car.carId || c.b.carId === t.car.carId);
  return <CarTopicPage kind={KIND} topics={t} comparisons={comparisons} />;
}
