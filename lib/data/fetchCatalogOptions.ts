import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "../supabaseClient";

/**
 * A light copy of the catalog for the questionnaire itself (v4, 22 Nov 2026):
 * the budget slider's "N cars fit" line and the "brands to skip" screen,
 * which only lists brands that have a car matching the answers so far.
 * Only cars that can actually be recommended (on sale, with review data).
 * Prices are the default-city on-road prices (the pincode is asked last).
 */
export interface CatalogOptionRow {
  car_id: string;
  brand: string;
  price: number | null;
  fuel: string | null;
  seats: string | null;
  trans: string;
}

const PAGE_SIZE = 1000;

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function load(): Promise<CatalogOptionRow[]> {
  const supabase = getSupabaseServerClient();
  const [variants, facetCars] = await Promise.all([
    fetchAll<any>((from, to) =>
      supabase
        .from("variants")
        .select("id, car_id, on_road_price, ex_showroom_price, seating_capacity, fuel_type, spec_sections, cars(brand, on_sale)")
        .order("id")
        .range(from, to),
    ),
    fetchAll<{ car_id: string }>((from, to) =>
      supabase.from("facet_scores").select("id, car_id").order("id").range(from, to),
    ),
  ]);
  const reviewed = new Set(facetCars.map((r) => r.car_id));
  return variants
    .filter((v) => v.cars?.on_sale !== false && reviewed.has(v.car_id))
    .map((v) => ({
      car_id: v.car_id,
      brand: v.cars?.brand ?? "",
      price: v.on_road_price ?? v.ex_showroom_price ?? null,
      fuel: v.fuel_type ?? null,
      seats: v.seating_capacity ?? null,
      trans: String(v.spec_sections?.["Engine & Transmission"]?.["Transmission Type"] ?? ""),
    }));
}

export const fetchCatalogOptions = unstable_cache(load, ["catalog-options-v1"], {
  revalidate: 86400,
  tags: ["car-pages"],
});
