"use client";

import { useEffect, useState } from "react";
import type { CatalogOptionRow } from "./data/fetchCatalogOptions";
import type { QuestionnaireAnswers } from "./scoring/questionnaireWeights";
import { passesStructuralFilters } from "./scoring/recommend";
import type { CatalogVariant } from "./scoring/types";

/** Light catalog for the questionnaire (budget count, brands-to-skip list).
 * Fetched once per page load and shared. Null while loading or on error,
 * so callers must work without it. */
let cache: Promise<CatalogOptionRow[] | null> | null = null;

function load(): Promise<CatalogOptionRow[] | null> {
  if (!cache) {
    cache = fetch("/api/catalog-options")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && Array.isArray(j.rows) && j.rows.length > 0 ? (j.rows as CatalogOptionRow[]) : null))
      .catch(() => null);
  }
  return cache;
}

export function useCatalogOptions(): CatalogOptionRow[] | null {
  const [rows, setRows] = useState<CatalogOptionRow[] | null>(null);
  useEffect(() => {
    let live = true;
    load().then((r) => live && setRows(r));
    return () => {
      live = false;
    };
  }, []);
  return rows;
}

function asVariant(row: CatalogOptionRow): CatalogVariant {
  return {
    car_id: row.car_id,
    brand: row.brand,
    car_model: "",
    variant_id: "",
    url: null,
    on_road_price: row.price,
    ex_showroom_price: null,
    seating_capacity: row.seats,
    fuel_type: row.fuel,
    drive_type: null,
    spec_sections: { "Engine & Transmission": { "Transmission Type": row.trans } },
  } as CatalogVariant;
}

/** Rows that pass the same hard filters the recommender uses, for the
 * answers given so far. Brand vetoes are left out on purpose. */
export function matchingRows(rows: CatalogOptionRow[], answers: QuestionnaireAnswers): CatalogOptionRow[] {
  const { q_brand_avoid: _skip, ...rest } = answers;
  return rows.filter((r) => passesStructuralFilters(asVariant(r), rest).ok);
}

export function countCars(rows: CatalogOptionRow[]): number {
  return new Set(rows.map((r) => r.car_id)).size;
}
