/**
 * Real logo files for q_brand_avoid's chips, one per BRAND_LIST entry (see
 * lib/scoring/recommend.ts). Sourced from Wikimedia Commons via each brand's
 * Wikidata "logo image" (P154) claim, verified by eye against the current
 * (not historical) mark before being committed -- a first automated pass
 * pulled Citroen's 1919 logo, Mahindra's "Electric SUVs" sub-brand logo, and
 * Skoda's Laurin & Klement predecessor crest, all wrong, before this mapping
 * was corrected. Files live in public/brand-logos/.
 */
export const BRAND_LOGOS: Record<string, string> = {
  Citroen: "/brand-logos/citroen.svg",
  Force: "/brand-logos/force.svg",
  Honda: "/brand-logos/honda.svg",
  Hyundai: "/brand-logos/hyundai.svg",
  Jeep: "/brand-logos/jeep.svg",
  Kia: "/brand-logos/kia.svg",
  MG: "/brand-logos/mg.jpg",
  Mahindra: "/brand-logos/mahindra.svg",
  Maruti: "/brand-logos/maruti.svg",
  Nissan: "/brand-logos/nissan.svg",
  Renault: "/brand-logos/renault.svg",
  Skoda: "/brand-logos/skoda.svg",
  Tata: "/brand-logos/tata.svg",
  Toyota: "/brand-logos/toyota.png",
  VinFast: "/brand-logos/vinfast.svg",
  Volkswagen: "/brand-logos/volkswagen.svg",
};
