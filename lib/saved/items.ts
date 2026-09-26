import type { RecommendOutput } from "../scoring/recommend";
import type { Persona, TopCarSnapshot } from "../persona/derivePersona";

/** Columns the API returns for a saved search (never response_id / user_id). */
export const SAVED_ITEM_COLUMNS = "id, persona, custom_name, top_cars, created_at, last_opened_at, archived";

export interface SavedSearchItem {
  id: string;
  persona: Persona;
  custom_name: string | null;
  top_cars: TopCarSnapshot[];
  created_at: string;
  last_opened_at: string | null;
  archived: boolean;
}

/** Snapshot of the top 3 shortlisted cars, stored with a saved search. */
export function buildTopCars(output: RecommendOutput): TopCarSnapshot[] {
  return (output.shortlist ?? []).slice(0, 3).map((c, i) => ({
    car_id: c.car_id,
    brand: c.brand,
    car_model: c.car_model,
    variant_id: c.variant_id,
    price_on_road: c.price_on_road,
    rank: i + 1,
  }));
}

export interface ShortlistDiff {
  changed: boolean;
  added: { car_id: string; brand: string; car_model: string; rank: number }[];
  removed: { car_id: string; brand: string; car_model: string; rank: number }[];
  moved: { car_id: string; brand: string; car_model: string; from: number; to: number }[];
}

/** What changed between the shortlist saved earlier and the one computed now. */
export function computeDiff(before: TopCarSnapshot[], after: TopCarSnapshot[]): ShortlistDiff {
  const beforeById = new Map(before.map((c) => [c.car_id, c]));
  const afterById = new Map(after.map((c) => [c.car_id, c]));

  const added = after
    .filter((c) => !beforeById.has(c.car_id))
    .map((c) => ({ car_id: c.car_id, brand: c.brand, car_model: c.car_model, rank: c.rank }));
  const removed = before
    .filter((c) => !afterById.has(c.car_id))
    .map((c) => ({ car_id: c.car_id, brand: c.brand, car_model: c.car_model, rank: c.rank }));
  const moved = after
    .filter((c) => beforeById.has(c.car_id) && beforeById.get(c.car_id)!.rank !== c.rank)
    .map((c) => ({
      car_id: c.car_id,
      brand: c.brand,
      car_model: c.car_model,
      from: beforeById.get(c.car_id)!.rank,
      to: c.rank,
    }));

  return { changed: added.length + removed.length + moved.length > 0, added, removed, moved };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
