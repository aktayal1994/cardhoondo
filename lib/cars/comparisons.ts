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

/**
 * Rival pairs worked out from the catalog on 24 Nov 2026 and checked by hand:
 * same body type (lib/cars/guideBodyTypes.ts, with hatchback, micro SUV and compact
 * sedan grouped as small cars: sedan, compact SUV, mid-size
 * SUV, large SUV, MPV, off-roader), EV only with EV, starting price within
 * ~45% and length within 35 cm. Each car gets its closest 3-4 rivals, which
 * is who people actually cross-shop, not every possible pair. Same publish
 * rule as the hand-picked list. More popular car first, the way people type it.
 */
export const RIVAL_PAIRS: [string, string][] = [
  ["maruti_swift", "maruti_dzire"],
  ["maruti_swift", "hyundai_exter"],
  ["maruti_dzire", "tata_punch"],
  ["maruti_dzire", "maruti_baleno"],
  ["maruti_dzire", "hyundai_exter"],
  ["hyundai_creta", "toyota_urban_cruiser_hyryder"],
  ["hyundai_creta", "skoda_kushaq"],
  ["hyundai_creta", "volkswagen_taigun"],
  ["hyundai_creta", "renault_duster"],
  ["hyundai_creta", "nissan_tekton"],
  ["tata_nexon", "maruti_fronx"],
  ["tata_nexon", "kia_sonet"],
  ["tata_nexon", "nissan_magnite"],
  ["tata_nexon", "toyota_urban_cruiser_taisor"],
  ["tata_punch", "maruti_baleno"],
  ["maruti_wagon_r", "maruti_alto_k10"],
  ["maruti_wagon_r", "tata_tiago"],
  ["maruti_wagon_r", "maruti_celerio"],
  ["maruti_wagon_r", "citroen_c3x"],
  ["maruti_ertiga", "kia_carens_clavis"],
  ["maruti_brezza", "kia_sonet"],
  ["maruti_brezza", "skoda_kylaq"],
  ["maruti_brezza", "nissan_magnite"],
  ["maruti_brezza", "toyota_urban_cruiser_taisor"],
  ["maruti_baleno", "hyundai_exter"],
  ["maruti_baleno", "citroen_c3x"],
  ["maruti_fronx", "kia_sonet"],
  ["maruti_fronx", "nissan_magnite"],
  ["mahindra_scorpio_n", "tata_safari"],
  ["mahindra_scorpio_n", "tata_harrier"],
  ["mahindra_scorpio_n", "hyundai_alcazar"],
  ["mahindra_scorpio_n", "mg_hector"],
  ["mahindra_scorpio_n", "mahindra_scorpio_classic"],
  ["kia_seltos", "maruti_grand_vitara"],
  ["kia_seltos", "toyota_urban_cruiser_hyryder"],
  ["maruti_grand_vitara", "maruti_victoris"],
  ["maruti_grand_vitara", "skoda_kushaq"],
  ["maruti_grand_vitara", "volkswagen_taigun"],
  ["maruti_grand_vitara", "renault_duster"],
  ["maruti_grand_vitara", "nissan_tekton"],
  ["kia_sonet", "skoda_kylaq"],
  ["kia_sonet", "toyota_urban_cruiser_taisor"],
  ["hyundai_venue", "mahindra_xuv_3xo"],
  ["hyundai_venue", "skoda_kylaq"],
  ["hyundai_venue", "kia_syros"],
  ["hyundai_venue", "hyundai_venue_n_line"],
  ["mahindra_thar", "force_gurkha"],
  ["mahindra_xuv_7xo", "hyundai_alcazar"],
  ["mahindra_xuv_7xo", "mg_hector_plus"],
  ["mahindra_xuv_3xo", "skoda_kylaq"],
  ["mahindra_xuv_3xo", "hyundai_venue_n_line"],
  ["mahindra_xuv_3xo", "toyota_urban_cruiser_taisor"],
  ["tata_safari", "tata_harrier"],
  ["tata_safari", "hyundai_alcazar"],
  ["tata_safari", "mg_hector"],
  ["tata_safari", "mahindra_scorpio_classic"],
  ["tata_harrier", "mahindra_scorpio_classic"],
  ["honda_city", "skoda_slavia"],
  ["honda_city", "volkswagen_virtus"],
  ["hyundai_verna", "volkswagen_virtus"],
  ["toyota_fortuner", "kia_sorento"],
  ["toyota_fortuner", "skoda_kodiaq"],
  ["kia_carens", "maruti_xl6"],
  ["kia_carens", "kia_carens_clavis"],
  ["maruti_alto_k10", "tata_tiago"],
  ["maruti_alto_k10", "maruti_celerio"],
  ["tata_tiago", "maruti_celerio"],
  ["tata_tiago", "citroen_c3x"],
  ["skoda_kylaq", "kia_syros"],
  ["skoda_kylaq", "toyota_urban_cruiser_taisor"],
  ["kia_syros", "hyundai_venue_n_line"],
  ["toyota_urban_cruiser_hyryder", "tata_sierra"],
  ["toyota_urban_cruiser_hyryder", "honda_elevate"],
  ["maruti_victoris", "renault_duster"],
  ["maruti_victoris", "nissan_tekton"],
  ["tata_sierra", "honda_elevate"],
  ["tata_curvv", "renault_duster"],
  ["tata_curvv", "citroen_basalt"],
  ["tata_curvv", "hyundai_bayon"],
  ["tata_curvv", "mg_astor"],
  ["maruti_xl6", "kia_carens_clavis"],
  ["hyundai_alcazar", "force_gurkha_5_door"],
  ["hyundai_alcazar", "jeep_compass"],
  ["hyundai_alcazar", "mahindra_scorpio_classic"],
  ["tata_nexon_ev", "kia_syros_ev"],
  ["mg_windsor_ev", "maruti_e_vitara"],
  ["mg_windsor_ev", "tata_curvv_ev"],
  ["mg_windsor_ev", "mahindra_xuv400_ev"],
  ["mahindra_be6", "hyundai_creta_electric"],
  ["mahindra_be6", "mg_zs_ev"],
  ["mahindra_be6", "tata_sierra_ev"],
  ["mahindra_be6", "vinfast_vf6"],
  ["maruti_e_vitara", "tata_curvv_ev"],
  ["maruti_e_vitara", "mahindra_xuv400_ev"],
  ["hyundai_creta_electric", "tata_curvv_ev"],
  ["hyundai_creta_electric", "mg_zs_ev"],
  ["hyundai_creta_electric", "tata_sierra_ev"],
  ["hyundai_creta_electric", "vinfast_vf6"],
  ["tata_curvv_ev", "mahindra_xuv400_ev"],
  ["tata_curvv_ev", "mg_zs_ev"],
  ["maruti_jimny", "force_gurkha"],
  ["skoda_kushaq", "hyundai_bayon"],
  ["renault_duster", "mg_astor"],
  ["renault_duster", "nissan_tekton"],
  ["maruti_celerio", "citroen_c3x"],
  ["byd_emax_7", "kia_carens_clavis_ev"],
  ["citroen_basalt", "hyundai_bayon"],
  ["citroen_basalt", "mg_astor"],
  ["force_gurkha_5_door", "jeep_compass"],
  ["force_gurkha_5_door", "mg_hector_plus"],
  ["hyundai_bayon", "mg_astor"],
  ["jeep_compass", "mg_hector_plus"],
  ["jeep_meridian", "kia_sorento"],
  ["jeep_meridian", "mg_hector_plus"],
  ["jeep_meridian", "skoda_kodiaq"],
  ["kia_sorento", "skoda_kodiaq"],
  ["mahindra_xev_9e", "mahindra_xev_9s"],
  ["mg_zs_ev", "tata_sierra_ev"],
  ["mg_zs_ev", "vinfast_vf6"],
  ["tata_sierra_ev", "vinfast_vf6"],
];

/** Three-way pages (/compare/a-vs-b-vs-c): each car with its two closest
 * rivals, at most two per lead car. Same publish rule, applied to all three. */
export const COMPARISON_TRIOS: [string, string, string][] = [
  ["maruti_swift", "maruti_dzire", "maruti_baleno"],
  ["tata_nexon", "maruti_brezza", "maruti_fronx"],
  ["tata_nexon", "maruti_brezza", "kia_sonet"],
  ["maruti_swift", "tata_punch", "hyundai_exter"],
  ["hyundai_creta", "kia_seltos", "toyota_urban_cruiser_hyryder"],
  ["mahindra_scorpio_n", "mahindra_xuv_7xo", "tata_safari"],
  ["mahindra_scorpio_n", "tata_safari", "tata_harrier"],
  ["hyundai_venue", "mahindra_xuv_3xo", "skoda_kylaq"],
  ["hyundai_venue", "mahindra_xuv_3xo", "kia_syros"],
  ["hyundai_creta", "maruti_grand_vitara", "renault_duster"],
  ["maruti_ertiga", "kia_carens", "maruti_xl6"],
  ["maruti_brezza", "maruti_fronx", "nissan_magnite"],
  ["maruti_wagon_r", "maruti_alto_k10", "maruti_celerio"],
  ["maruti_wagon_r", "tata_tiago", "maruti_celerio"],
  ["tata_safari", "tata_harrier", "mg_hector"],
  ["honda_city", "hyundai_verna", "volkswagen_virtus"],
  ["toyota_urban_cruiser_hyryder", "tata_sierra", "honda_elevate"],
  ["maruti_grand_vitara", "skoda_kushaq", "volkswagen_taigun"],
  ["kia_carens", "maruti_xl6", "kia_carens_clavis"],
  ["hyundai_verna", "skoda_slavia", "volkswagen_virtus"],
  ["tata_safari", "tata_harrier", "mahindra_scorpio_classic"],
  ["kia_sonet", "skoda_kylaq", "toyota_urban_cruiser_taisor"],
  ["mahindra_thar", "maruti_jimny", "force_gurkha"],
  ["mg_windsor_ev", "maruti_e_vitara", "mahindra_xuv400_ev"],
  ["mahindra_be6", "hyundai_creta_electric", "tata_sierra_ev"],
  ["maruti_victoris", "renault_duster", "nissan_tekton"],
  ["maruti_e_vitara", "tata_curvv_ev", "mahindra_xuv400_ev"],
  ["hyundai_creta_electric", "tata_curvv_ev", "mg_zs_ev"],
  ["toyota_fortuner", "jeep_meridian", "kia_sorento"],
  ["toyota_fortuner", "kia_sorento", "skoda_kodiaq"],
  ["tata_curvv", "citroen_basalt", "mg_astor"],
  ["tata_curvv", "hyundai_bayon", "mg_astor"],
  ["hyundai_creta_electric", "mg_zs_ev", "tata_sierra_ev"],
  ["force_gurkha_5_door", "jeep_compass", "mg_hector_plus"],
  ["jeep_meridian", "kia_sorento", "mg_hector_plus"],
];

/** Hand-picked pairs first (their order wins), then the catalog rivals; no pair twice in either order. */
export const ALL_PAIRS: [string, string][] = (() => {
  const seen = new Set<string>();
  const out: [string, string][] = [];
  for (const [a, b] of [...COMPARISON_PAIRS, ...RIVAL_PAIRS]) {
    const key = [a, b].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([a, b]);
  }
  return out;
})();

export function comparisonSlug(...ids: string[]): string {
  return ids.map(carIdToSlug).join("-vs-");
}

/** The pair a slug names (in its canonical order), only if it is a listed pair. */
export function pairForSlug(slug: string): [string, string] | null {
  return ALL_PAIRS.find(([a, b]) => comparisonSlug(a, b) === slug) ?? null;
}

export function trioForSlug(slug: string): [string, string, string] | null {
  return COMPARISON_TRIOS.find((t) => comparisonSlug(...t) === slug) ?? null;
}

/** For a slug naming listed cars in another order ("seltos-vs-creta"), the
 * canonical slug to redirect to; null when it already is canonical or unknown. */
export function canonicalComparisonSlug(slug: string): string | null {
  const parts = slug.split("-vs-").map((p) => p.replace(/-/g, "_")).sort().join("|");
  const all: string[][] = [...ALL_PAIRS, ...COMPARISON_TRIOS];
  const hit = all.find((ids) => [...ids].sort().join("|") === parts);
  if (!hit) return null;
  const canon = comparisonSlug(...hit);
  return canon === slug ? null : canon;
}
