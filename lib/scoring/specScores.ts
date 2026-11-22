/**
 * Paper specs blended with review evidence (added 22 Nov 2026).
 *
 * Reviews alone let a car with a friendly, launch-period review set beat a
 * car that is plainly better on paper: an 80 bhp non-turbo engine could out-
 * score a 120 bhp turbo for "Strong performance", and safety ignored crash
 * tests. Each spec here becomes one extra score per variant, on the same -1..1
 * scale as a review facet, and counts inside its review theme:
 *
 *   spec_safety   safety_build_quality  60% of the theme  crash stars + airbags/ESC/AEB
 *   spec_child    safety_build_quality  extra, only with young kids
 *   spec_power    power_drivability     50%               power and torque per tonne
 *   spec_running  mileage_efficiency    50%               fuel/charge cost per km
 *   spec_features feature_tech          50%               features on this variant
 *   spec_space    cabin_space           50%               wheelbase, boot, width
 *   spec_agility  (Fun to drive only)                     lighter, lower body
 *
 * Crash stars come from ncapRatings.json (built by scripts/build_ncap_table.py
 * from bncap.in and Global NCAP's 2022-protocol results), never from the
 * CarDekho spec fields, which were wrong for several cars. Global NCAP counts
 * fully; Bharat NCAP alone counts half a star lower; with both, 65/35.
 * An untested car counts as 2.5 stars.
 *
 * Spec scores are percentiles across every catalogued variant (so "good
 * power" means good against the whole Indian market), scaled by SPEC_SCALE so
 * their spread matches review scores, which bunch nearer the middle.
 * Weights and shares were tuned in a 2,000-search simulation, 22 Nov 2026.
 */
import type { CatalogVariant } from "./types";
import ncapRatings from "./ncapRatings.json";

export const SPEC_SCALE = 0.4;

interface NcapTest { adult_stars: number; child_stars: number }
const NCAP = ncapRatings as Record<string, { status: string; bncap?: NcapTest; gncap?: NcapTest }>;

export const SPEC_THEME_SHARE: Record<string, [string, number]> = {
  spec_safety: ["safety_build_quality", 0.6],
  spec_power: ["power_drivability", 0.5],
  spec_running: ["mileage_efficiency", 0.5],
  spec_features: ["feature_tech", 0.5],
  spec_space: ["cabin_space", 0.5],
};

export type SpecScores = Partial<Record<"spec_safety" | "spec_child" | "spec_power" | "spec_running" | "spec_features" | "spec_space" | "spec_agility", number>>;

const num = (x: unknown): number | null => {
  const m = String(x ?? "").replace(/,/g, "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
};
const yes = (x: unknown) => x === true || (typeof x === "string" && x !== "" && !/^(no|false|none|0)$/i.test(x));
const section = (v: CatalogVariant, s: string) => (v.spec_sections?.[s] ?? {}) as Record<string, unknown>;

/** Effective crash stars: Global NCAP counts fully, Bharat NCAP alone half a star lower. */
export function effectiveStars(g: number | null | undefined, b: number | null | undefined): number | null {
  if (g != null && b != null) return 0.65 * g + 0.35 * (b - 0.5);
  if (g != null) return g;
  if (b != null) return b - 0.5;
  return null;
}

export function crashRating(carId: string) {
  const r = NCAP[carId];
  return {
    adult: effectiveStars(r?.gncap?.adult_stars, r?.bncap?.adult_stars),
    child: effectiveStars(r?.gncap?.child_stars, r?.bncap?.child_stars),
  };
}

interface Raw {
  bhp: number | null; nm: number | null; kg: number | null; height: number | null;
  rsPerKm: number | null; features: number; wheelbase: number | null; boot: number | null; width: number | null;
  airbags: number; esc: boolean; aeb: boolean; L: number | null;
}

function raw(v: CatalogVariant): Raw {
  const eng = section(v, "Engine & Transmission"), dim = section(v, "Dimensions & Capacity");
  const saf = section(v, "Safety"), adas = section(v, "ADAS Feature"), fuelS = section(v, "Fuel & Performance");
  const fuel = String(v.fuel_type ?? fuelS["Fuel Type"] ?? "");
  const kmpl = num(fuelS["Petrol Mileage ARAI"] ?? fuelS["Diesel Mileage ARAI"] ?? fuelS["CNG Mileage ARAI"] ?? fuelS["Petrol Mileage (ARAI)"]);
  const kwh = num(eng["Battery Capacity"]), range = num(eng["Range"]);
  let rsPerKm: number | null = null;
  // Rough real-world costs: ARAI x 0.8, claimed EV range x 0.75; fuel at Nov 2026 prices.
  if (/electric/i.test(fuel) && kwh && range) rsPerKm = (9 * kwh) / (range * 0.75);
  else if (kmpl) rsPerKm = (/diesel/i.test(fuel) ? 92 : /cng/i.test(fuel) ? 90 : 103) / (kmpl * 0.8);
  let features = 0;
  for (const s of ["Comfort & Convenience", "Interior", "Exterior", "Entertainment & Communication", "ADAS Feature", "Advance Internet Feature"])
    for (const x of Object.values(section(v, s))) if (yes(x)) features++;
  return {
    bhp: num(eng["Max Power"]), nm: num(eng["Max Torque"]), kg: num(dim["Kerb Weight"]), height: num(dim["Height"]),
    rsPerKm, features, wheelbase: num(dim["Wheel Base"]), boot: num(dim["Boot Space"] ?? dim["Reported Boot Space"]),
    width: num(dim["Width"]), L: num(dim["Length"]),
    airbags: num(saf["No. of Airbags"]) ?? 2, esc: yes(saf["Electronic Stability Control (ESC)"]), aeb: yes(adas["Automatic Emergency Braking"]),
  };
}

const cache = new WeakMap<CatalogVariant[], Map<string, SpecScores>>();
export const specKey = (carId: string, variantId: string) => `${carId}::${variantId}`;

/** Spec scores for every variant, computed once per catalog array. */
export function specScoresFor(variants: CatalogVariant[]): Map<string, SpecScores> {
  const hit = cache.get(variants);
  if (hit) return hit;
  const raws = variants.map(raw);

  // Kerb weight is missing for most cars: estimate it from body volume
  // (length x width x height), fitted on the cars that do list it. Height
  // matters: tall ladder-frame SUVs weigh far more than their footprint says.
  const vol = (r: Raw) => (r.L && r.width && r.height ? (r.L * r.width * r.height) / 1e9 : null);
  const fit = raws.filter((r) => r.kg && vol(r)).map((r) => [vol(r)!, r.kg!]);
  const mx = fit.reduce((s, p) => s + p[0], 0) / Math.max(1, fit.length);
  const my = fit.reduce((s, p) => s + p[1], 0) / Math.max(1, fit.length);
  const den = fit.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  const slope = den ? fit.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / den : 0;
  const kgOf = (r: Raw) => r.kg ?? (vol(r) != null ? my + slope * (vol(r)! - mx) : null);

  const pct = (vals: (number | null)[], higherBetter = true) => {
    const sorted = vals.filter((x): x is number => x != null).sort((a, b) => a - b);
    return (x: number | null): number | null => {
      if (x == null || sorted.length < 2) return null;
      let below = 0;
      while (below < sorted.length && sorted[below] < x) below++;
      const p = below / (sorted.length - 1);
      return (higherBetter ? p : 1 - p) * 2 - 1;
    };
  };
  const p2w = raws.map((r) => { const kg = kgOf(r); return r.bhp && kg ? (1000 * r.bhp) / kg : null; });
  const t2w = raws.map((r) => { const kg = kgOf(r); return r.nm && kg ? (1000 * r.nm) / kg : null; });
  const pP = pct(p2w), pT = pct(t2w), pRun = pct(raws.map((r) => r.rsPerKm), false), pFeat = pct(raws.map((r) => r.features));
  const pWb = pct(raws.map((r) => r.wheelbase)), pBoot = pct(raws.map((r) => r.boot)), pWid = pct(raws.map((r) => r.width));
  const pLight = pct(raws.map(kgOf), false), pLow = pct(raws.map((r) => r.height), false);

  const out = new Map<string, SpecScores>();
  variants.forEach((v, i) => {
    const r = raws[i];
    const s: SpecScores = {};
    const crash = crashRating(v.car_id);
    const stars = (x: number | null) => Math.max(-1, Math.min(1, ((x ?? 2.5) - 3) / 2)); // 5 -> +1, 3 -> 0, untested -> -0.25
    const kit = (r.airbags >= 6 ? 0.5 : -0.5) + (r.esc ? 0.25 : -0.25) + (r.aeb ? 0.25 : 0);
    s.spec_safety = 0.75 * stars(crash.adult) + 0.25 * kit;
    s.spec_child = stars(crash.child ?? crash.adult);
    const a = pP(p2w[i]), b = pT(t2w[i]);
    if (a != null && b != null) s.spec_power = 0.6 * a + 0.4 * b;
    const run = pRun(r.rsPerKm);
    if (run != null) s.spec_running = run;
    const f = pFeat(r.features);
    if (f != null) s.spec_features = f;
    const wb = pWb(r.wheelbase);
    if (wb != null) s.spec_space = 0.5 * wb + 0.3 * (pBoot(r.boot) ?? wb) + 0.2 * (pWid(r.width) ?? wb);
    const light = pLight(kgOf(r)), low = pLow(r.height);
    if (light != null && low != null) s.spec_agility = 0.5 * light + 0.5 * low;
    for (const k of Object.keys(s) as (keyof SpecScores)[]) s[k] = s[k]! * SPEC_SCALE;
    out.set(specKey(v.car_id, v.variant_id), s);
  });
  cache.set(variants, out);
  return out;
}

/**
 * How much each spec counts for these weights: its theme's share of the
 * theme's total review weight, so a priority that lifts a theme lifts its
 * spec with it.
 */
export function specWeights(
  weights: Record<string, number>,
  themeOf: Record<string, string>,
  opts: { youngKids: boolean; funToDrive: boolean },
): Record<keyof SpecScores, number> {
  const themeTotal = (theme: string) =>
    Object.entries(weights).filter(([f]) => themeOf[f] === theme).reduce((s, [, w]) => s + w, 0);
  const w = {} as Record<keyof SpecScores, number>;
  for (const [spec, [theme, share]] of Object.entries(SPEC_THEME_SHARE))
    w[spec as keyof SpecScores] = (themeTotal(theme) * share) / (1 - share);
  w.spec_child = opts.youngKids ? w.spec_safety * 0.5 : 0;
  w.spec_agility = opts.funToDrive ? (weights["handling_cornering"] ?? 1) * 1.5 : 0;
  return w;
}
