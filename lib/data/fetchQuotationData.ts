import { getSupabaseServerClient } from "../supabaseClient";

export interface CarModelOption {
  car_id: string;
  brand: string;
  model: string;
}

export interface QuotationVariant {
  car_id: string;
  variant_id: string;
  url: string | null;
  ex_showroom_price: number | null;
  on_road_price: number | null; // Delhi reference price, from variants (see supabase/schema.sql)
  fuel_type: string | null;
  spec_sections: Record<string, Record<string, unknown>>;
}

export async function fetchCarModels(): Promise<CarModelOption[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("cars").select("car_id, brand, model").order("brand").order("model");
  if (error) throw error;
  return (data ?? []) as CarModelOption[];
}

export async function fetchVariantsForCar(carId: string): Promise<QuotationVariant[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("variants")
    .select("car_id, variant_id, url, ex_showroom_price, on_road_price, fuel_type, spec_sections")
    .eq("car_id", carId);
  if (error) throw error;
  return (data ?? []).map((v: any) => ({ ...v, spec_sections: v.spec_sections ?? {} })) as QuotationVariant[];
}

/** variants.url is stored as a full https://www.cardekho.com/... URL;
 * city_on_road_prices.variant_url is the same path with that prefix
 * stripped (see scripts/city_price_scraper.py's parse_city_price_page). */
export function toRelativeVariantUrl(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/^https?:\/\/(www\.)?cardekho\.com\//, "");
}

export interface ScrapedCityPrice {
  ex_showroom_price: number | null;
  rto: number | null;
  insurance: number | null;
  other_charges: number | null;
  optional_accessories: number | null;
  on_road_price: number | null;
  scraped_at: string | null;
}

export async function fetchScrapedCityPrice(
  carId: string,
  cityKey: string,
  variantUrl: string | null,
): Promise<ScrapedCityPrice | null> {
  if (!variantUrl) return null;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("city_on_road_prices")
    .select("ex_showroom_price, rto, insurance, other_charges, optional_accessories, on_road_price, scraped_at")
    .eq("car_id", carId)
    .eq("city_key", cityKey)
    .eq("variant_url", variantUrl)
    .maybeSingle();
  if (error) throw error;
  return data as ScrapedCityPrice | null;
}
