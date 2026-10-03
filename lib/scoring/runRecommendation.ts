import { deriveWeightVector, type QuestionnaireAnswers } from "./questionnaireWeights";
import { recommend, type RecommendOutput } from "./recommend";
import type { CatalogVariant } from "./types";
import { fetchRecommendationData } from "../data/fetchRecommendationData";
import { fetchCityPriceMap } from "../data/fetchCityPrices";
import { toRelativeVariantUrl } from "../data/fetchQuotationData";
import { resolvePincodeCity } from "../pricing/resolvePincode";
import type { CityMasterEntry } from "../pricing/cityMaster";
import { estimateOnRoadPrice } from "../pricing/rtoFallback";

type CityPrices = { city: CityMasterEntry; prices: Map<string, number> } | null;

/** Pincode -> city -> that city's scraped prices. Null (= Delhi prices) on
 * no/invalid pincode or any failure. Runs alongside the main data fetch. */
async function loadCityPrices(pincode: string | null | undefined): Promise<CityPrices> {
  if (!pincode) return null;
  try {
    const resolved = await resolvePincodeCity(pincode);
    if (!resolved) return null;
    return { city: resolved.city, prices: await fetchCityPriceMap(resolved.city.city_key) };
  } catch (e) {
    console.error("city pricing failed, using Delhi prices:", (e as Error).message);
    return null;
  }
}

/**
 * Prices every variant for the buyer's city before ranking, so both the
 * budget filter and the price shown use the local on-road price. Per
 * variant: scraped city price, else the city estimate on ex-showroom
 * (rtoFallback.ts), else the catalog's New Delhi price.
 */
function priceForCity(variants: CatalogVariant[], cityPrices: CityPrices): CatalogVariant[] {
  const delhi = (v: CatalogVariant): CatalogVariant => ({ ...v, price_city: "New Delhi", price_basis: "delhi" });
  if (!cityPrices) return variants.map(delhi);
  const { city, prices } = cityPrices;
  return variants.map((v) => {
    const scraped = prices.get(`${v.car_id}::${toRelativeVariantUrl(v.url)}`);
    if (scraped != null) return { ...v, on_road_price: scraped, price_city: city.display_name, price_basis: "city" };
    if (v.ex_showroom_price != null) {
      const est = estimateOnRoadPrice(v.ex_showroom_price, city.city_key).on_road_price;
      return { ...v, on_road_price: est, price_city: city.display_name, price_basis: "estimate" };
    }
    return delhi(v);
  });
}

/**
 * Score a set of answers against the current review data and return the
 * ranked shortlist. Shared by /api/recommend (a fresh submission) and
 * /api/saved-searches/[id]/open (re-running a saved search), so both always use
 * exactly the same scoring path. Server-only (reads Supabase).
 */
export async function runRecommendation(
  answers: QuestionnaireAnswers,
  topN = 3,
  opts: { pincode?: string | null } = {},
): Promise<RecommendOutput> {
  const weights = deriveWeightVector(answers);
  const [recommendationData, cityPrices] = await Promise.all([fetchRecommendationData(), loadCityPrices(opts.pincode)]);
  const catalogVariants = priceForCity(recommendationData.catalogVariants, cityPrices);
  return recommend({ answers, weights, topN, ...recommendationData, catalogVariants });
}
