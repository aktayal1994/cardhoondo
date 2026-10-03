import { getSupabaseServerClient } from "../supabaseClient";

/**
 * Every scraped on-road price for one city, keyed `${car_id}::${variant_url}`
 * (variant_url relative, as city_price_scraper.py stores it; see
 * toRelativeVariantUrl in fetchQuotationData.ts). ~1,400 rows per city, so
 * paged past PostgREST's silent 1,000-row cap.
 */
export async function fetchCityPriceMap(cityKey: string): Promise<Map<string, number>> {
  const supabase = getSupabaseServerClient();
  const map = new Map<string, number>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("city_on_road_prices")
      .select("id, car_id, variant_url, on_road_price")
      .eq("city_key", cityKey)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) {
      if (r.on_road_price != null) map.set(`${r.car_id}::${r.variant_url}`, r.on_road_price);
    }
    if (!data || data.length < PAGE) return map;
  }
}
