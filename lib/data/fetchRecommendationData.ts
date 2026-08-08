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

export async function fetchRecommendationData(): Promise<RecommendationData> {
  const supabase = getSupabaseServerClient();

  const { data: variantRows, error: variantErr } = await supabase
    .from("variants")
    .select("car_id, variant_id, url, ex_showroom_price, on_road_price, seating_capacity, fuel_type, drive_type, spec_sections, cars(brand, model)");
  if (variantErr) throw variantErr;

  const catalogVariants: CatalogVariant[] = (variantRows ?? []).map((v: any) => ({
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

  const { data: facetRows, error: facetErr } = await supabase
    .from("facet_scores")
    .select("car_id, granularity, powertrain_id, variant_id, theme, facet, score, claim_count, confidence, source_types, evidence");
  if (facetErr) throw facetErr;

  const facetScoresByCar: Record<string, FacetScoreRow[]> = {};
  for (const row of (facetRows ?? []) as FacetScoreRow[]) {
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
