import { getSupabaseServerClient } from "../supabaseClient";
import type { BrandFacetScoreRow, CatalogVariant, FacetScoreRow } from "../scoring/types";

/**
 * All the Supabase I/O recommend.ts needs, gathered up front so recommend()
 * itself can stay a pure function (easier to test, matches how recommend.py
 * separates "load the JSON files" from "do the ranking math").
 */
export interface RecommendationData {
  catalogVariants: CatalogVariant[];
  facetScoresByCar: Record<string, FacetScoreRow[]>;
  brandFacetScoresByBrand: Record<string, BrandFacetScoreRow[]>;
}


// Supabase (PostgREST) silently caps every response at 1,000 rows, so a plain
// .select() over variants/facet_scores returns only the first 1,000 by
// insertion order -- which quietly dropped every car past the alphabetical
// cut (Skoda, Volkswagen, ...) from recommendations. Page explicitly, ordered
// by the primary key so pages never overlap or skip.
const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export async function fetchRecommendationData(): Promise<RecommendationData> {
  const supabase = getSupabaseServerClient();

  const variantRows = await fetchAllRows<any>((from, to) =>
    supabase
      .from("variants")
      .select("id, car_id, variant_id, url, ex_showroom_price, on_road_price, seating_capacity, fuel_type, drive_type, spec_sections, cars(brand, model)")
      .order("id")
      .range(from, to),
  );

  const catalogVariants: CatalogVariant[] = variantRows.map((v: any) => ({
    car_id: v.car_id,
    brand: v.cars?.brand ?? "",
    car_model: v.cars?.model ?? "",
    variant_id: v.variant_id,
    url: v.url,
    on_road_price: v.on_road_price,
    ex_showroom_price: v.ex_showroom_price,
    seating_capacity: v.seating_capacity,
    fuel_type: v.fuel_type,
    drive_type: v.drive_type,
    spec_sections: v.spec_sections ?? {},
  }));

  const facetRows = await fetchAllRows<FacetScoreRow>((from, to) =>
    supabase
      .from("facet_scores")
      .select("id, car_id, granularity, powertrain_id, variant_id, theme, facet, score, claim_count, confidence, source_types, evidence")
      .order("id")
      .range(from, to),
  );

  const facetScoresByCar: Record<string, FacetScoreRow[]> = {};
  for (const row of facetRows) {
    (facetScoresByCar[row.car_id] ??= []).push(row);
  }

  const { data: brandRows, error: brandErr } = await supabase
    .from("brand_facet_scores")
    .select("brand, theme, facet, score, claim_count, confidence, source_types, cars_contributing, evidence");
  if (brandErr) throw brandErr;

  const brandFacetScoresByBrand: Record<string, BrandFacetScoreRow[]> = {};
  for (const row of (brandRows ?? []) as BrandFacetScoreRow[]) {
    (brandFacetScoresByBrand[row.brand] ??= []).push(row);
  }

  return { catalogVariants, facetScoresByCar, brandFacetScoresByBrand };
}
