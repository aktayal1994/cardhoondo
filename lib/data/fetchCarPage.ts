import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "../supabaseClient";
import { MIN_CLAIMS_TO_PUBLISH, carDisplayName, isPublishable } from "../cars/featured";
import type { FacetScoreRow } from "../scoring/types";

/**
 * Everything a public /cars/<slug> page shows, read straight from the same
 * tables the recommender uses (cars, powertrains, facet_scores, review_claims)
 * -- no new data, no LLM. Scores come from facet_scores so a page can never
 * disagree with the results screen; quotes come from review_claims so each one
 * can be attributed to its source.
 */

export interface CarQuote {
  text: string;
  sourceType: "ownership" | "expert";
  sourceTitle: string | null;
  /** YouTube link at the moment of the quote; null for forum threads. */
  url: string | null;
}

export interface CarFacetSummary {
  facet: string;
  theme: string;
  score: number;
  claimCount: number;
  quote: CarQuote | null;
}

export interface CarPowertrain {
  fuel: string | null;
  transmission: string | null;
  engine: string | null;
  displacement: string | null;
  power: string | null;
  torque: string | null;
  gearbox: string | null;
}

export interface CarPageData {
  carId: string;
  brand: string;
  model: string;
  name: string;
  priceMin: number | null;
  priceMax: number | null;
  variantCount: number | null;
  powertrains: CarPowertrain[];
  seating: string[];
  claimCount: number;
  sourceCount: number;
  /** All facets with at least 2 claims, best score first. */
  facets: CarFacetSummary[];
  /** Facets to celebrate (score >= 0.2), best first, quotes attached. */
  likes: CarFacetSummary[];
  /** Facets to warn about (score < 0.2, worst first), quotes attached. */
  shortfalls: CarFacetSummary[];
  /** Latest time the scores behind this page were regenerated. */
  updatedAt: string | null;
}

export interface FeaturedCarSummary {
  carId: string;
  brand: string;
  model: string;
  name: string;
  priceMin: number | null;
  priceMax: number | null;
  /** Fuel types as stored in the catalog (e.g. "petrol", "electric"). */
  fuels: string[];
  claimCount: number;
  sourceCount: number;
  updatedAt: string | null;
}

// A verdict resting on one or two remarks is anecdote, not consensus. The
// ratings list needs 3+ claims; the "likes" / "falls short" sections and the
// summary sentence (which name a car's best and worst traits) need 5+.
const MIN_FACET_CLAIMS = 3;
const MIN_HEADLINE_CLAIMS = 5;
const MAX_LIKES = 6;
const MAX_SHORTFALLS = 5;
const QUOTE_MIN_CHARS = 50;
const QUOTE_MAX_CHARS = 240;

/** How long car data is cached before Supabase is asked again (matches the pages' ISR). */
const CAR_DATA_TTL_SECONDS = 86400;

/**
 * Every car that currently has a public page, with what the index, sitemap and
 * "related cars" need. Built by loading each catalogued car's page data
 * (itself cached per car) and keeping the ones isPublishable() accepts, so the
 * list can never include a car whose page would 404. Cached for a day: one
 * pass over the catalog per day, not per request.
 */
export const fetchFeaturedCarSummaries = unstable_cache(
  async (): Promise<FeaturedCarSummary[]> => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("cars").select("car_id").order("car_id");
    if (error) throw error;
    const ids = ((data ?? []) as any[]).map((c) => String(c.car_id));
    const out: FeaturedCarSummary[] = [];
    // Small batches keep Supabase load modest during a build or revalidation.
    for (let i = 0; i < ids.length; i += 6) {
      const pages = await Promise.all(ids.slice(i, i + 6).map((id) => fetchCarPageData(id)));
      for (const d of pages) {
        if (!d) continue;
        out.push({
          carId: d.carId,
          brand: d.brand,
          model: d.model,
          name: d.name,
          priceMin: d.priceMin,
          priceMax: d.priceMax,
          fuels: Array.from(new Set(d.powertrains.map((p) => p.fuel).filter((f): f is string => !!f))),
          claimCount: d.claimCount,
          sourceCount: d.sourceCount,
          updatedAt: d.updatedAt,
        });
      }
    }
    return out;
  },
  ["published-car-summaries-v1"],
  { revalidate: CAR_DATA_TTL_SECONDS, tags: ["car-pages"] },
);

// Model names that are also ordinary words, so seeing one in a quote does not
// mean the reviewer was talking about that car.
const AMBIGUOUS_MODEL_WORDS = new Set(["city", "punch", "safari", "swift", "venue", "compass", "classic", "electric"]);

/** True when a quote names a different car from the catalog. Comparison
 * videos often mention rivals in the same breath, and a sentence like "the
 * Taigun stopped shortest, unlike the Seltos" is not clean evidence about
 * either car, so such quotes are never shown (the claim still counts). */
function mentionsOtherCar(text: string, ownModel: string, allModels: string[]): boolean {
  const own = ownModel.toLowerCase();
  const lower = text.toLowerCase();
  for (const m of allModels) {
    const model = m.toLowerCase();
    if (model === own || own.includes(model) || model.includes(own)) continue;
    const word = model.split(" ")[0];
    if (word.length < 4 || AMBIGUOUS_MODEL_WORDS.has(word)) continue;
    if (new RegExp(`\\b${word.replace(/[^a-z0-9]/g, "")}\\b`).test(lower)) return true;
  }
  return false;
}

/** Page data for one car, or null when the car has no catalog row or its
 * review data is too thin to publish (see isPublishable). Cached per car. */
export const fetchCarPageData = unstable_cache(
  (carId: string): Promise<CarPageData | null> => loadCarPageData(carId),
  ["car-page-data-v1"],
  { revalidate: CAR_DATA_TTL_SECONDS, tags: ["car-pages"] },
);

export async function loadCarPageData(carId: string): Promise<CarPageData | null> {
  const supabase = getSupabaseServerClient();

  const [carRes, ptRes, variantRes, facetRes, claimRes, modelsRes] = await Promise.all([
    supabase.from("cars").select("car_id, brand, model, price_min, price_max, variant_count").eq("car_id", carId).maybeSingle(),
    supabase.from("powertrains").select("powertrain_id, fuel, transmission, engine_type, displacement, max_power, max_torque, gearbox").eq("car_id", carId),
    supabase.from("variants").select("seating_capacity").eq("car_id", carId).limit(500),
    supabase
      .from("facet_scores")
      .select("car_id, granularity, powertrain_id, variant_id, theme, facet, score, claim_count, confidence, source_types, evidence, generated_at")
      .eq("car_id", carId)
      .limit(1000),
    supabase
      .from("review_claims")
      .select("facet, sentiment, evidence_quote, source_type, video_id, source_title, timestamp_seconds, post_id")
      .eq("car_id", carId)
      .limit(1000),
    supabase.from("cars").select("model"),
  ]);

  for (const r of [carRes, ptRes, variantRes, facetRes, claimRes, modelsRes]) if (r.error) throw r.error;
  const allModels = ((modelsRes.data ?? []) as any[]).map((m) => String(m.model));
  const car = carRes.data as any;
  if (!car) return null;

  const claims = (claimRes.data ?? []) as any[];
  if (claims.length < MIN_CLAIMS_TO_PUBLISH) return null;

  const facetRows = (facetRes.data ?? []) as (FacetScoreRow & { generated_at: string })[];
  const updatedAt = facetRows.reduce<string | null>((m, r) => (!m || r.generated_at > m ? r.generated_at : m), null);

  // One consolidated row per facet. A model-level row is already the whole-car
  // view; when a facet only exists per powertrain/variant, pool those rows
  // weighted by how many claims each holds.
  const byFacet = new Map<string, FacetScoreRow[]>();
  for (const r of facetRows) (byFacet.get(r.facet) ?? byFacet.set(r.facet, []).get(r.facet)!).push(r);

  const consolidated: Omit<CarFacetSummary, "quote">[] = [];
  for (const [facet, rows] of byFacet) {
    const model = rows.find((r) => r.granularity === "model");
    let score: number;
    let claimCount: number;
    if (model) {
      score = Number(model.score);
      claimCount = model.claim_count;
    } else {
      claimCount = rows.reduce((s, r) => s + r.claim_count, 0);
      score = claimCount ? rows.reduce((s, r) => s + Number(r.score) * r.claim_count, 0) / claimCount : 0;
    }
    if (claimCount < MIN_FACET_CLAIMS) continue;
    consolidated.push({ facet, theme: rows[0].theme, score, claimCount });
  }
  consolidated.sort((a, b) => b.score - a.score || b.claimCount - a.claimCount);

  const usedQuotes = new Set<string>();
  const quoteFor = (facet: string, sentiment: "positive" | "negative"): CarQuote | null => {
    const candidates = claims
      .filter((c) => c.facet === facet && c.sentiment === sentiment)
      .map((c) => ({ c, text: cleanQuote(c.evidence_quote) }))
      // "spillover" marks a claim about this car pulled from another car's video.
      .filter(({ c }) => !/spillover/i.test(String(c.source_title ?? "")))
      .filter(({ text }) => text.length >= QUOTE_MIN_CHARS && text.length <= QUOTE_MAX_CHARS && !usedQuotes.has(text))
      .filter(({ text }) => !mentionsOtherCar(text, String(car.model), allModels))
      // The longest fitting quote says the most; ties keep source order.
      .sort((a, b) => b.text.length - a.text.length);
    const pick = candidates[0];
    if (!pick) return null;
    usedQuotes.add(pick.text);
    const isForum = Boolean(pick.c.post_id);
    return {
      text: pick.text,
      sourceType: pick.c.source_type,
      sourceTitle: cleanTitle(pick.c.source_title),
      url:
        !isForum && typeof pick.c.video_id === "string" && pick.c.video_id.length === 11
          ? `https://www.youtube.com/watch?v=${pick.c.video_id}${pick.c.timestamp_seconds != null ? `&t=${Math.floor(Number(pick.c.timestamp_seconds))}s` : ""}`
          : null,
    };
  };

  const likes = consolidated
    .filter((f) => f.score >= 0.2 && f.claimCount >= MIN_HEADLINE_CLAIMS)
    .slice(0, MAX_LIKES)
    .map((f) => ({ ...f, quote: quoteFor(f.facet, "positive") }));

  const shortfalls = [...consolidated]
    .filter((f) => f.score < 0.2 && f.claimCount >= MIN_HEADLINE_CLAIMS)
    .sort((a, b) => a.score - b.score || b.claimCount - a.claimCount)
    .slice(0, MAX_SHORTFALLS)
    .map((f) => ({ ...f, quote: quoteFor(f.facet, "negative") }));

  const facets = consolidated.map((f) => ({ ...f, quote: null }));

  const seating = Array.from(
    new Set(((variantRes.data ?? []) as any[]).map((v) => String(v.seating_capacity ?? "").trim()).filter(Boolean)),
  );

  const page: CarPageData = {
    carId: car.car_id,
    brand: car.brand,
    model: car.model,
    name: carDisplayName(car.brand, car.model),
    priceMin: car.price_min,
    priceMax: car.price_max,
    variantCount: car.variant_count,
    powertrains: ((ptRes.data ?? []) as any[]).map((p) => ({
      fuel: p.fuel,
      transmission: p.transmission,
      engine: p.engine_type,
      displacement: p.displacement,
      power: p.max_power,
      torque: p.max_torque,
      gearbox: p.gearbox,
    })),
    seating,
    claimCount: claims.length,
    sourceCount: new Set(claims.map((c) => c.video_id)).size,
    facets,
    likes,
    shortfalls,
    updatedAt,
  };
  return isPublishable(page) ? page : null;
}

/** Strips the pipeline's own annotations, e.g. "(MG Astor video - ...)". */
function cleanTitle(raw: unknown): string | null {
  const title = String(raw ?? "").replace(/\s*\([^)]*spillover[^)]*\)\s*$/i, "").trim();
  return title || null;
}

function cleanQuote(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["“”']+|["“”']+$/g, "")
    .trim();
}
