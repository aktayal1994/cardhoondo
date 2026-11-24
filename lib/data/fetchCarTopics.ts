import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "../supabaseClient";
import { cleanQuote, cleanTitle, fetchCarPageData, fetchFeaturedCarSummaries, mentionsOtherCar } from "./fetchCarPage";
import type { CarPageData } from "./fetchCarPage";

/**
 * Data for the owner-topic pages under a car's review page:
 *   /cars/<slug>/problems  what owners and experts complain about
 *   /cars/<slug>/pros      what they praise
 *   /cars/<slug>/mileage   real mileage (or real range for an EV)
 *
 * Built only from review_claims (same rows as the review page; no AI text, no
 * spec-sheet figures). A topic page exists only when it clears its own
 * evidence bar below, so a car with two mileage remarks never gets a hollow
 * "real mileage" page. Cached for a day under the car-pages tag.
 */

export type TopicKind = "problems" | "pros" | "mileage";
export const TOPIC_KINDS: TopicKind[] = ["problems", "pros", "mileage"];

export interface TopicQuote {
  text: string;
  sourceType: "ownership" | "expert";
  sourceTitle: string | null;
  url: string | null;
  /** e.g. "~3 years, ~45,000 km" for an owner, or a test note for an expert. */
  context: string | null;
  /** Reader label for the engine/gearbox the remark is about, e.g. "Diesel automatic". */
  version: string | null;
  sentiment: "positive" | "negative" | "neutral";
  publishedAt: string | null;
}

export interface TopicFacet {
  facet: string;
  theme: string;
  /** Overall verdict on this area from every claim (positive and negative), null if under 3 claims. */
  score: number | null;
  /** Every claim on this area, any sentiment. */
  totalClaims: number;
  /** Claims in this page's direction (negative on problems, positive on pros). */
  matchingClaims: number;
  ownerClaims: number;
  expertClaims: number;
  quotes: TopicQuote[];
}

export interface MileageGroup {
  /** "Petrol", "Diesel", "CNG", "Electric", "Hybrid", or "All versions". */
  fuel: string;
  quotes: (TopicQuote & { facet: string })[];
}

export interface CarTopics {
  car: CarPageData;
  isEv: boolean;
  problems: TopicFacet[] | null;
  pros: TopicFacet[] | null;
  mileage: { groups: MileageGroup[]; quoteCount: number; sourceCount: number; ownerCount: number } | null;
}

// Evidence bars. A topic needs real breadth, not one chatty reviewer.
const MIN_FACET_MATCHING = 2; // an area is listed once 2+ reviews raise it
const MIN_TOPIC_FACETS = 3;
const MIN_TOPIC_QUOTES = 8;
const MIN_MILEAGE_QUOTES = 5;
const MIN_MILEAGE_SOURCES = 3;
const QUOTES_PER_FACET = 4;
const QUOTE_MIN_CHARS = 25;
const QUOTE_MAX_CHARS = 300;

const CAR_DATA_TTL_SECONDS = 86400;

export const fetchCarTopics = unstable_cache(
  (carId: string): Promise<CarTopics | null> => loadCarTopics(carId),
  ["car-topics-v1"],
  { revalidate: CAR_DATA_TTL_SECONDS, tags: ["car-pages"] },
);

/** Every published car with the topics it has a page for (for static params, sitemap, links). */
export const fetchTopicAvailability = unstable_cache(
  async (): Promise<{ carId: string; topics: TopicKind[]; updatedAt: string | null }[]> => {
    const cars = await fetchFeaturedCarSummaries();
    const out: { carId: string; topics: TopicKind[]; updatedAt: string | null }[] = [];
    for (let i = 0; i < cars.length; i += 6) {
      const batch = await Promise.all(cars.slice(i, i + 6).map((c) => fetchCarTopics(c.carId)));
      for (const t of batch) if (t) out.push({ carId: t.car.carId, topics: availableTopics(t), updatedAt: t.car.updatedAt });
    }
    return out;
  },
  ["car-topic-availability-v1"],
  { revalidate: CAR_DATA_TTL_SECONDS, tags: ["car-pages"] },
);

export function availableTopics(t: CarTopics): TopicKind[] {
  return TOPIC_KINDS.filter((k) => t[k] !== null);
}

async function loadCarTopics(carId: string): Promise<CarTopics | null> {
  const car = await fetchCarPageData(carId);
  if (!car) return null; // no review page, no topic pages

  const supabase = getSupabaseServerClient();
  const [claimRes, modelsRes] = await Promise.all([
    supabase
      .from("review_claims")
      .select("facet, theme, sentiment, evidence_quote, ownership_context, source_type, video_id, source_title, timestamp_seconds, post_id, powertrain_id, published_at")
      .eq("car_id", carId)
      .limit(2000),
    supabase.from("cars").select("model"),
  ]);
  if (claimRes.error) throw claimRes.error;
  if (modelsRes.error) throw modelsRes.error;
  const allModels = ((modelsRes.data ?? []) as any[]).map((m) => String(m.model));
  const claims = (claimRes.data ?? []) as any[];

  const seen = new Set<string>();
  const toQuote = (c: any): TopicQuote | null => {
    if (/spillover|branded content|sponsored|paid partnership/i.test(String(c.source_title ?? ""))) return null;
    const text = cleanQuote(c.evidence_quote);
    if (text.length < QUOTE_MIN_CHARS || text.length > QUOTE_MAX_CHARS || seen.has(text)) return null;
    if (mentionsOtherCar(text, car.model, allModels)) return null;
    const isForum = Boolean(c.post_id);
    return {
      text,
      sourceType: c.source_type === "ownership" ? "ownership" : "expert",
      sourceTitle: cleanTitle(c.source_title),
      url:
        !isForum && typeof c.video_id === "string" && c.video_id.length === 11
          ? `https://www.youtube.com/watch?v=${c.video_id}${c.timestamp_seconds != null ? `&t=${Math.floor(Number(c.timestamp_seconds))}s` : ""}`
          : null,
      context: cleanContext(c.ownership_context),
      version: versionLabel(c.powertrain_id, carId),
      sentiment: c.sentiment === "positive" || c.sentiment === "negative" ? c.sentiment : "neutral",
      publishedAt: c.published_at ?? null,
    };
  };

  const scoreByFacet = new Map(car.facets.map((f) => [f.facet, f.score]));
  const buildFacets = (sentiment: "positive" | "negative"): TopicFacet[] | null => {
    const byFacet = new Map<string, any[]>();
    for (const c of claims) (byFacet.get(c.facet) ?? byFacet.set(c.facet, []).get(c.facet)!).push(c);
    const out: TopicFacet[] = [];
    for (const [facet, rows] of byFacet) {
      const matching = rows.filter((r) => r.sentiment === sentiment);
      if (matching.length < MIN_FACET_MATCHING) continue;
      // Owners first (lived experience), then the newest remarks.
      const ordered = [...matching].sort(
        (a, b) =>
          Number(b.source_type === "ownership") - Number(a.source_type === "ownership") ||
          String(b.published_at ?? "").localeCompare(String(a.published_at ?? "")),
      );
      const quotes: TopicQuote[] = [];
      for (const c of ordered) {
        if (quotes.length >= QUOTES_PER_FACET) break;
        const q = toQuote(c);
        if (q) {
          seen.add(q.text);
          quotes.push(q);
        }
      }
      if (quotes.length === 0) continue;
      out.push({
        facet,
        theme: rows[0].theme,
        score: scoreByFacet.get(facet) ?? null,
        totalClaims: rows.length,
        matchingClaims: matching.length,
        ownerClaims: matching.filter((r) => r.source_type === "ownership").length,
        expertClaims: matching.filter((r) => r.source_type !== "ownership").length,
        quotes,
      });
    }
    out.sort((a, b) => b.matchingClaims - a.matchingClaims || b.ownerClaims - a.ownerClaims);
    const quoteCount = out.reduce((s, f) => s + f.quotes.length, 0);
    return out.length >= MIN_TOPIC_FACETS && quoteCount >= MIN_TOPIC_QUOTES ? out : null;
  };

  const problems = buildFacets("negative");
  const pros = buildFacets("positive");

  // Mileage: every remark on city, highway and claimed-vs-real, any sentiment,
  // grouped by fuel so "Creta diesel mileage" readers find their engine.
  const mileageRows = claims
    .filter((c) => c.theme === "mileage_efficiency")
    .sort(
      (a, b) =>
        Number(b.source_type === "ownership") - Number(a.source_type === "ownership") ||
        String(b.published_at ?? "").localeCompare(String(a.published_at ?? "")),
    );
  const groups = new Map<string, (TopicQuote & { facet: string })[]>();
  const mileageSources = new Set<string>();
  let ownerCount = 0;
  for (const c of mileageRows) {
    const q = toQuote(c);
    if (!q) continue;
    seen.add(q.text);
    const fuel = fuelOf(c.powertrain_id, carId);
    (groups.get(fuel) ?? groups.set(fuel, []).get(fuel)!).push({ ...q, facet: c.facet });
    mileageSources.add(String(c.video_id ?? c.post_id ?? ""));
    if (q.sourceType === "ownership") ownerCount++;
  }
  const quoteCount = [...groups.values()].reduce((s, g) => s + g.length, 0);
  const fuelOrder = ["Petrol", "Diesel", "CNG", "Hybrid", "Electric", "All versions"];
  const mileage =
    quoteCount >= MIN_MILEAGE_QUOTES && mileageSources.size >= MIN_MILEAGE_SOURCES
      ? {
          groups: [...groups.entries()]
            .map(([fuel, quotes]) => ({ fuel, quotes }))
            .sort((a, b) => fuelOrder.indexOf(a.fuel) - fuelOrder.indexOf(b.fuel)),
          quoteCount,
          sourceCount: mileageSources.size,
          ownerCount,
        }
      : null;

  const fuels = new Set(car.powertrains.map((p) => (p.fuel ?? "").toLowerCase()).filter(Boolean));
  const isEv = fuels.size > 0 && [...fuels].every((f) => f === "electric");

  return { car, isEv, problems, pros, mileage };
}

const ACRONYMS = new Set(["at", "mt", "amt", "dct", "cvt", "ivt", "cng", "ev", "awd", "4x4", "4wd", "tgdi", "hev"]);

/** "kia_seltos_diesel_at" -> "Diesel AT"; model-level claims -> null. */
function versionLabel(powertrainId: unknown, carId: string): string | null {
  const id = String(powertrainId ?? "");
  if (!id || !id.startsWith(carId + "_")) return null;
  const words = id.slice(carId.length + 1).split("_").filter(Boolean);
  if (!words.length) return null;
  const label = words.map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w)).join(" ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function fuelOf(powertrainId: unknown, carId: string): string {
  const id = String(powertrainId ?? "");
  const rest = id.startsWith(carId + "_") ? id.slice(carId.length + 1) : "";
  if (/(^|_)cng(_|$)/.test(rest)) return "CNG";
  if (/(^|_)(hybrid|hev|strong_hybrid)(_|$)/.test(rest)) return "Hybrid";
  if (/(^|_)diesel(_|$)/.test(rest)) return "Diesel";
  if (/(^|_)petrol(_|$)/.test(rest)) return "Petrol";
  if (/(^|_)(electric|ev)(_|$)/.test(rest)) return "Electric";
  return "All versions";
}

function cleanContext(raw: unknown): string | null {
  const s = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!s || s.length > 120) return null; // long notes are pipeline memos, not reader context
  return s;
}
