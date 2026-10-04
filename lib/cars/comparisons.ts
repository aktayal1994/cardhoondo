import { carIdToSlug } from "./featured";

/**
 * Head-to-head pages at /compare/<a>-vs-<b>.
 *
 * Hand-picked on purpose: only rivals people actually cross-shop and search
 * for ("Creta vs Seltos"), never every possible pair. Thousands of thin
 * auto-generated pairs would read as spam to Google and to people. A pair
 * gets a page only while both cars have a published review page and are
 * still on sale (see publishedComparisons in fetchComparisons.ts).
 *
 * Order inside a pair is the order people usually type it.
 */
export const COMPARISON_PAIRS: [string, string][] = [
  // Mid-size SUVs
  ["hyundai_creta", "kia_seltos"],
  ["maruti_grand_vitara", "hyundai_creta"],
  ["toyota_urban_cruiser_hyryder", "maruti_grand_vitara"],
  ["honda_elevate", "hyundai_creta"],
  ["tata_curvv", "hyundai_creta"],
  ["tata_sierra", "hyundai_creta"],
  ["skoda_kushaq", "volkswagen_taigun"],
  ["maruti_victoris", "hyundai_creta"],
  // Compact SUVs (under 4 metres)
  ["tata_nexon", "maruti_brezza"],
  ["hyundai_venue", "kia_sonet"],
  ["maruti_brezza", "hyundai_venue"],
  ["tata_nexon", "mahindra_xuv_3xo"],
  ["skoda_kylaq", "tata_nexon"],
  ["kia_syros", "mahindra_xuv_3xo"],
  ["maruti_fronx", "maruti_brezza"],
  ["maruti_fronx", "toyota_urban_cruiser_taisor"],
  ["nissan_magnite", "kia_sonet"],
  // Micro SUVs and hatchbacks
  ["tata_punch", "hyundai_exter"],
  ["maruti_swift", "maruti_baleno"],
  ["maruti_swift", "tata_punch"],
  // Sedans
  ["honda_city", "hyundai_verna"],
  ["skoda_slavia", "volkswagen_virtus"],
  ["hyundai_verna", "skoda_slavia"],
  // MPVs and 7-seaters
  ["maruti_ertiga", "kia_carens"],
  ["maruti_xl6", "maruti_ertiga"],
  ["toyota_innova_hycross", "mahindra_xuv_7xo"],
  ["mahindra_xuv_7xo", "tata_safari"],
  ["tata_harrier", "mahindra_xuv_7xo"],
  ["mahindra_scorpio_n", "mahindra_xuv_7xo"],
  ["tata_harrier", "mg_hector"],
  ["toyota_fortuner", "jeep_meridian"],
  // Off-roaders
  ["mahindra_thar", "maruti_jimny"],
  ["mahindra_thar_roxx", "mahindra_scorpio_n"],
  // Electric
  ["tata_nexon_ev", "mg_windsor_ev"],
  ["mahindra_be6", "tata_curvv_ev"],
  ["maruti_e_vitara", "hyundai_creta_electric"],
];

export function comparisonSlug(a: string, b: string): string {
  return `${carIdToSlug(a)}-vs-${carIdToSlug(b)}`;
}

/** The pair a slug names, only if it is one of COMPARISON_PAIRS (in that order). */
export function pairForSlug(slug: string): [string, string] | null {
  return COMPARISON_PAIRS.find(([a, b]) => comparisonSlug(a, b) === slug) ?? null;
}
