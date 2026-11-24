/**
 * Body type per car (24 Nov 2026), for the "What kind of car?" question
 * (q_body_type). The data lives in scripts/catalog_models.json ("body_type")
 * and is copied here by `py scripts/build_body_types.py`. A car missing from
 * the file is never filtered out by body type (we don't hide a car because
 * of a gap in our own data).
 */
import bodyTypes from "./bodyStyles.json";

export type BodyType = "hatchback" | "sedan" | "suv" | "muv";

const MAP = bodyTypes as Record<string, BodyType>;

export function bodyTypeOf(carId: string): BodyType | null {
  return MAP[carId] ?? null;
}

/** Answer values for q_body_type -> body type. Values are load-bearing (saved answers). */
export const BODY_TYPE_ANSWERS: Record<string, BodyType> = {
  Hatchback: "hatchback",
  Sedan: "sedan",
  SUV: "suv",
  MUV: "muv",
};

/** The exclusive "open to all" answer: no body type filter at all. */
export const BODY_TYPE_OPEN = "Open to all";

/** Body types the user asked for, or null when there is no filter. */
export function wantedBodyTypes(answer: string | string[] | undefined): Set<BodyType> | null {
  const list = answer == null ? [] : Array.isArray(answer) ? answer : [answer];
  const wanted = list.map((v) => BODY_TYPE_ANSWERS[v]).filter(Boolean);
  return wanted.length > 0 ? new Set(wanted) : null;
}

/** Plain names for the results notice. */
export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  hatchback: "hatchback",
  sedan: "sedan",
  suv: "SUV",
  muv: "MUV",
};
