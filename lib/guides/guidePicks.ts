import { unstable_cache } from "next/cache";
import { runRecommendation, runRecommendations } from "../scoring/runRecommendation";
import type { RecommendCandidate } from "../scoring/recommend";
import type { QuestionnaireAnswers } from "../scoring/questionnaireWeights";
import { fetchCarPageData, fetchFeaturedCarSummaries, type CarPageData } from "../data/fetchCarPage";
import { carDisplayName, isPublishable } from "../cars/featured";
import { BASE_ANSWERS, RANKED_GUIDES, type RankedGuide } from "./rankedGuides";
import { GUIDE_BODY_TYPE } from "../cars/guideBodyTypes";

/**
 * The cars each "best car for X" guide shows, computed once here so the guide
 * page and the car review pages (which link back to the guides a car is on)
 * can never disagree.
 */
export const CARS_SHOWN = 5;
/** Listed briefly under the main five, so the page covers the cars people expect to see. */
export const CLOSE_SHOWN = 5;
const RANKED_FETCHED = 25;
/** Body-type guides narrow the ranking afterwards, so they need a deeper list. */
const RANKED_FETCHED_BODY = 120;

function fitsBody(guide: RankedGuide, carId: string): boolean {
  return !guide.bodies || guide.bodies.includes(GUIDE_BODY_TYPE[carId]);
}

export type RankedCar = Pick<
  RecommendCandidate,
  "car_id" | "variant_id" | "price_on_road" | "price_city" | "price_basis"
>;

export interface CarPick {
  candidate: RankedCar;
  page: CarPageData;
  name: string;
}

/** The ranking alone, trimmed to what the page shows and cached for a day.
 * Uncached, every Supabase response behind the ranking (thousands of rows)
 * landed in the page's fetch cache and ran the dev server out of memory. */
function fetchRanking(guide: RankedGuide): Promise<RankedCar[]> {
  const answers = { ...BASE_ANSWERS, ...guide.answers } as QuestionnaireAnswers;
  return unstable_cache(
    async (): Promise<RankedCar[]> => {
      const result = await runRecommendation(answers, guide.bodies ? RANKED_FETCHED_BODY : RANKED_FETCHED);
      return result.all_ranked_cars
        .filter((c) => fitsBody(guide, c.car_id))
        .slice(0, RANKED_FETCHED)
        .map((c) => ({
        car_id: c.car_id,
        variant_id: c.variant_id,
        price_on_road: c.price_on_road,
        price_city: c.price_city,
        price_basis: c.price_basis,
      }));
    },
    ["ranked-guide-v4", guide.slug, JSON.stringify(answers), (guide.bodies ?? []).join(",")],
    { revalidate: 86400, tags: ["car-pages"] },
  )();
}

/** The guide's main picks, then the next few that came close, in rank order. */
export async function loadGuidePicks(guide: RankedGuide): Promise<{ picks: CarPick[]; close: CarPick[] }> {
  const ranked = await fetchRanking(guide);
  const all: CarPick[] = [];
  for (const candidate of ranked) {
    if (all.length >= CARS_SHOWN + CLOSE_SHOWN) break;
    const page = await fetchCarPageData(candidate.car_id);
    // Only cars with a public review page, so every name links somewhere real.
    if (!page || !page.onSale || !isPublishable(page)) continue;
    all.push({ candidate, page, name: carDisplayName(page.brand, page.model) });
  }
  return { picks: all.slice(0, CARS_SHOWN), close: all.slice(CARS_SHOWN) };
}

export interface GuideRank {
  slug: string;
  title: string;
  rank: number;
}

/** For every car in a guide's main picks: which guides, and at what rank.
 * One data load for all guides, and the published-car list every car page
 * already loads, so this costs about as much as rendering one guide. */
const fetchGuideRanksByCar = unstable_cache(
  async (): Promise<Record<string, GuideRank[]>> => {
    const [results, featured] = await Promise.all([
      runRecommendations(
        RANKED_GUIDES.map((g) => ({ ...BASE_ANSWERS, ...g.answers }) as QuestionnaireAnswers),
        RANKED_FETCHED_BODY,
      ),
      fetchFeaturedCarSummaries(),
    ]);
    // Same rule as loadGuidePicks: only cars on sale with a public review page.
    const listed = new Set(featured.filter((c) => c.onSale).map((c) => c.carId));
    const out: Record<string, GuideRank[]> = {};
    RANKED_GUIDES.forEach((guide, g) => {
      const picks = results[g].all_ranked_cars
        .filter((c) => listed.has(c.car_id) && fitsBody(guide, c.car_id))
        .slice(0, CARS_SHOWN);
      picks.forEach((c, i) => {
        (out[c.car_id] ??= []).push({ slug: guide.slug, title: guide.indexTitle, rank: i + 1 });
      });
    });
    return out;
  },
  ["guide-ranks-by-car-v3"],
  { revalidate: 86400, tags: ["car-pages"] },
);

let inflight: Promise<Record<string, GuideRank[]>> | null = null;

/** The guides a car appears on. Never throws: a car page must not fail over a link block. */
export async function guideRanksForCar(carId: string): Promise<GuideRank[]> {
  try {
    // Many car pages render at once during a build; they share one computation.
    inflight ??= fetchGuideRanksByCar().finally(() => {
      inflight = null;
    });
    return (await inflight)[carId] ?? [];
  } catch {
    return [];
  }
}
