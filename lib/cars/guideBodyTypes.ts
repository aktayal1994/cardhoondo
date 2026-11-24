/**
 * Fine-grained body type per car, set by hand, for the body-type guides
 * ("best sedan under 15 lakh", "best MPV") and as the rule behind RIVAL_PAIRS
 * in comparisons.ts. Separate from lib/cars/bodyStyles.ts on purpose: that
 * file is the questionnaire's four coarse shapes (q_body_type); guides need
 * finer ones (a Punch is not a hatchback, a Kodiaq is not a Creta rival).
 * A car missing here simply never appears in a body-type guide; add new cars.
 */
export type GuideBodyType =
  | "hatchback"
  | "micro_suv"
  | "compact_sedan"
  | "sedan"
  | "compact_suv"
  | "suv"
  | "large_suv"
  | "mpv"
  | "offroader";

const LIST: Record<GuideBodyType, string> = {
  hatchback: "tata_tiago maruti_wagon_r maruti_alto_k10 maruti_celerio maruti_swift maruti_baleno citroen_c3x maruti_s_presso renault_kwid",
  micro_suv: "hyundai_exter tata_punch",
  compact_sedan: "maruti_dzire honda_amaze hyundai_aura",
  sedan: "honda_city hyundai_verna skoda_slavia volkswagen_virtus",
  compact_suv:
    "hyundai_venue hyundai_venue_n_line kia_sonet kia_syros tata_nexon maruti_brezza maruti_fronx toyota_urban_cruiser_taisor skoda_kylaq mahindra_xuv_3xo nissan_magnite kia_syros_ev tata_nexon_ev",
  suv: "hyundai_creta kia_seltos maruti_grand_vitara toyota_urban_cruiser_hyryder honda_elevate skoda_kushaq volkswagen_taigun tata_curvv tata_sierra maruti_victoris mg_astor hyundai_bayon citroen_basalt nissan_tekton renault_duster hyundai_creta_electric tata_sierra_ev mahindra_be6 mg_zs_ev tata_curvv_ev maruti_e_vitara mg_windsor_ev mahindra_xuv400_ev vinfast_vf6",
  large_suv:
    "tata_harrier tata_safari mahindra_xuv_7xo mahindra_scorpio_n hyundai_alcazar mg_hector mg_hector_plus jeep_compass mahindra_scorpio_classic force_gurkha_5_door jeep_meridian skoda_kodiaq kia_sorento toyota_fortuner mahindra_xev_9e mahindra_xev_9s tata_harrier_ev",
  mpv: "maruti_ertiga maruti_xl6 kia_carens kia_carens_clavis toyota_innova_hycross toyota_innova_crysta byd_emax_7 kia_carens_clavis_ev",
  offroader: "mahindra_thar maruti_jimny force_gurkha mahindra_thar_roxx",
};

export const GUIDE_BODY_TYPE: Record<string, GuideBodyType> = Object.fromEntries(
  (Object.entries(LIST) as [GuideBodyType, string][]).flatMap(([body, ids]) => ids.split(" ").map((id) => [id, body])),
);
