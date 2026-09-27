/**
 * Cars that get a public, indexable page at /cars/<slug>.
 *
 * Deliberately short. A page is only worth publishing when the car sells in
 * volume (people actually search for it) AND we hold enough review claims to
 * say something real (>= 100 claims, 8+ source reviews when this list was
 * made, 27 Sep 2026). Thin pages for rarely-searched or barely-reviewed cars
 * would dilute the site rather than help it.
 *
 * "Sells in volume" is a judgement from general knowledge of India's
 * 2025-26 monthly sales rankings (roughly 2,500+ units a month), not from a
 * sales dataset in this repo. Hyundai Creta (88 claims) and Tata Nexon
 * (63 claims) sell more than most of these but sit under the claims bar;
 * add them here once more reviews are extracted.
 *
 * To add a car: append its car_id here, confirm it has a catalog row and
 * claims, and redeploy. The page, index card and sitemap entry follow.
 */
export const FEATURED_CAR_IDS = [
  "kia_seltos",
  "maruti_dzire",
  "maruti_brezza",
  "maruti_ertiga",
  "maruti_baleno",
  "maruti_grand_vitara",
  "hyundai_venue",
  "hyundai_verna",
  "hyundai_exter",
  "kia_sonet",
  "mahindra_xuv_3xo",
  "mahindra_scorpio_n",
  "mahindra_thar",
  "mahindra_thar_roxx",
  "honda_city",
  "toyota_fortuner",
  "tata_harrier",
  "tata_nexon_ev",
  "mg_windsor_ev",
  "skoda_kylaq",
] as const;

/** Safety net: even a featured car renders 404 if the database ever holds
 * fewer claims than this (e.g. after a bad import), rather than publishing a
 * hollow page. */
export const MIN_CLAIMS_TO_PUBLISH = 60;

export const SITE_URL = "https://cardhoondo.com";

export function carIdToSlug(carId: string): string {
  return carId.replace(/_/g, "-");
}

export function slugToCarId(slug: string): string | null {
  const id = slug.replace(/-/g, "_");
  return (FEATURED_CAR_IDS as readonly string[]).includes(id) ? id : null;
}

/** The catalog stores the short brand; people search the full name. */
const DISPLAY_BRAND: Record<string, string> = {
  Maruti: "Maruti Suzuki",
};

export function displayBrand(brand: string): string {
  return DISPLAY_BRAND[brand] ?? brand;
}

export function carDisplayName(brand: string, model: string): string {
  return `${displayBrand(brand)} ${model}`;
}
