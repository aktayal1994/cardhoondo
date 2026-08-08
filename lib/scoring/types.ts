/** Shared types for the scoring port. Mirrors the row shapes written by
 * scripts/import_to_supabase.py into the `facet_scores` / `brand_facet_scores`
 * tables (supabase/schema.sql), which are themselves a direct import of
 * aggregate_claims.py / aggregate_brand_facets.py's JSON output. */

export type Granularity = "model" | "powertrain" | "variant";
export type Confidence = "low" | "medium" | "high";
export type Sentiment = "positive" | "negative" | "neutral";

export interface EvidenceQuote {
  video_id?: string;
  car_id?: string;
  sentiment: Sentiment;
  quote: string;
}

/** One row of `facet_scores` for a single car. */
export interface FacetScoreRow {
  car_id: string;
  granularity: Granularity;
  powertrain_id: string | null;
  variant_id: string | null;
  theme: string;
  facet: string;
  score: number;
  claim_count: number;
  confidence: Confidence;
  source_types: Record<string, number>;
  evidence: EvidenceQuote[];
}

/** One row of `brand_facet_scores`. */
export interface BrandFacetScoreRow {
  brand: string;
  theme: string;
  facet: string;
  score: number;
  claim_count: number;
  confidence: Confidence;
  source_types: Record<string, number>;
  cars_contributing: Record<string, number>;
  evidence: EvidenceQuote[];
}

export interface ScoreBreakdownItem {
  facet: string;
  theme: string;
  score: number;
  weight: number;
  effective_weight: number;
  contribution: number;
  claim_count: number;
  confidence: Confidence;
  source_types: Record<string, number>;
  resolved_from: Granularity | "brand";
  sample_evidence: EvidenceQuote[];
}

export interface ScoreResult {
  composite_score: number;
  raw_composite_score: number;
  coverage_ratio: number;
  facets_with_data: number;
  facets_missing: number;
  breakdown: ScoreBreakdownItem[];
}

/** Catalog variant shape, joined from `variants` + `cars` (see supabase/schema.sql). */
export interface CatalogVariant {
  car_id: string;
  brand: string;
  car_model: string;
  variant_id: string;
  url: string | null;
  on_road_price: number | null;
  ex_showroom_price: number | null;
  seating_capacity: number | null;
  fuel_type: string | null;
  drive_type: string | null;
  spec_sections: Record<string, Record<string, unknown>>;
}
