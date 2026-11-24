// Builds the numbers behind /guides/what-indian-car-owners-complain-about
// as a dated snapshot (web/lib/studies/ownerComplaints.json), so the figures
// people quote stay fixed until the study is deliberately refreshed.
//
// Run from web/:  node scripts/build_complaints_study.mjs
// Reads review_claims + cars with the service-role key in .env.local.
// Excludes sponsored ("Branded Content") videos and spillover claims, the
// same rule the public pages use for quotes.
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const claims = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("review_claims")
    .select("car_id, theme, facet, sentiment, source_type, video_id, post_id, source_title, evidence_quote, timestamp_seconds")
    .order("id")
    .range(from, from + 999);
  if (error) throw error;
  claims.push(...data);
  if (data.length < 1000) break;
}
const { data: carRows, error: carErr } = await supabase.from("cars").select("car_id, brand, model, on_sale");
if (carErr) throw carErr;
const cars = Object.fromEntries(carRows.map((c) => [c.car_id, c]));

const EXCLUDE = /branded content|sponsored|paid partnership|spillover/i;
const C = claims.filter((c) => cars[c.car_id] && !EXCLUDE.test(c.source_title ?? ""));
const sourceOf = (c) => c.video_id ?? `post:${c.post_id}`;
const isOwner = (c) => c.source_type === "ownership";

/** Share of rated (positive or negative) remarks that are negative. */
function rate(xs) {
  let p = 0;
  let n = 0;
  for (const x of xs) {
    if (x.sentiment === "positive") p++;
    else if (x.sentiment === "negative") n++;
  }
  return { share: p + n ? n / (p + n) : 0, rated: p + n, negative: n };
}
const groupBy = (xs, key) => {
  const m = new Map();
  for (const x of xs) (m.get(key(x)) ?? m.set(key(x), []).get(key(x))).push(x);
  return m;
};
const round = (x) => Math.round(x * 1000) / 1000;

const MIN_THEME = 200;
const MIN_FACET = 60;
const MIN_BRAND_SERVICE = 40;
const MIN_CAR = 80;
const MIN_CAR_OWNER = 30;
const LAUNCH_ONLY = new Set([
  "renault_duster", "nissan_tekton", "hyundai_bayon", "kia_sorento",
  "kia_syros_ev", "maruti_e_vitara", "mg_hector_tomahawk", "mg_hector_ev",
]);

// 1. Owners vs experts, by theme.
const themes = [...groupBy(C, (c) => c.theme)]
  .map(([theme, xs]) => {
    const o = rate(xs.filter(isOwner));
    const e = rate(xs.filter((x) => !isOwner(x)));
    return { theme, owners: round(o.share), ownersRated: o.rated, experts: round(e.share), expertsRated: e.rated };
  })
  .filter((t) => t.ownersRated + t.expertsRated >= MIN_THEME && t.ownersRated >= 50 && t.expertsRated >= 50)
  .sort((a, b) => b.owners - b.experts - (a.owners - a.experts));

// 2. Topics: most criticised (by share) and least.
const facetStats = [...groupBy(C, (c) => c.facet)].map(([facet, xs]) => ({ facet, ...rate(xs), xs }));
const eligible = facetStats.filter((f) => f.rated >= MIN_FACET);

/** One short owner quote for a topic, to make the finding concrete. */
function quoteFor(xs, sentiment) {
  const pick = xs
    .filter((x) => x.sentiment === sentiment && isOwner(x) && x.video_id && x.video_id.length === 11)
    .map((x) => ({ x, text: String(x.evidence_quote ?? "").replace(/\s+/g, " ").trim().replace(/^["“”']+|["“”']+$/g, "") }))
    .filter(({ text }) => text.length >= 40 && text.length <= 170)
    // Readable English only (many transcripts are Hindi or Hinglish), first-hand only.
    .filter(({ text }) => /^[\x20-\x7E‘-”–—…₹]+$/.test(text))
    .filter(({ text }) => /\b(the|is|it|was|this|my)\b/i.test(text) && !/\b(hai|nahi|mein|bhi|kyunki|toh)\b/i.test(text))
    .filter(({ text }) => !/\b(some people|people say|i heard|reportedly|didn't face)\b/i.test(text))
    .sort((a, b) => b.text.length - a.text.length)[0];
  if (!pick) return null;
  const car = cars[pick.x.car_id];
  return {
    text: pick.text,
    car: `${car.brand === "Maruti" ? "Maruti Suzuki" : car.brand} ${car.model}`,
    url: `https://www.youtube.com/watch?v=${pick.x.video_id}${pick.x.timestamp_seconds != null ? `&t=${Math.floor(pick.x.timestamp_seconds)}s` : ""}`,
  };
}

const worstTopics = [...eligible]
  .sort((a, b) => b.share - a.share)
  .slice(0, 8)
  .map((f) => ({ facet: f.facet, share: round(f.share), rated: f.rated, quote: quoteFor(f.xs, "negative") }));
const bestTopics = [...eligible]
  .sort((a, b) => a.share - b.share)
  .slice(0, 6)
  .map((f) => ({ facet: f.facet, share: round(f.share), rated: f.rated }));
const commonComplaints = [...facetStats]
  .sort((a, b) => b.negative - a.negative)
  .slice(0, 8)
  .map((f) => ({ facet: f.facet, negative: f.negative, share: round(f.share), rated: f.rated }));

// 3. Brands: service, running cost and reliability remarks only.
const SERVICE_THEMES = new Set(["after_sales_dealer", "service_cost", "reliability"]);
const displayBrand = (b) => (b === "Maruti" ? "Maruti Suzuki" : b);
const brands = [...groupBy(C.filter((c) => SERVICE_THEMES.has(c.theme)), (c) => cars[c.car_id].brand)]
  .map(([brand, xs]) => ({ brand: displayBrand(brand), ...rate(xs), sources: new Set(xs.map(sourceOf)).size }))
  .filter((b) => b.rated >= MIN_BRAND_SERVICE)
  .map((b) => ({ brand: b.brand, share: round(b.share), rated: b.rated, sources: b.sources }))
  .sort((a, b) => a.share - b.share);

// 4. Cars on sale: most and least criticised overall.
const carStats = [...groupBy(C, (c) => c.car_id)]
  .filter(([id]) => cars[id].on_sale !== false)
  .map(([id, xs]) => ({
    carId: id,
    name: `${displayBrand(cars[id].brand)} ${cars[id].model}`,
    ...rate(xs),
    ownerRated: rate(xs.filter(isOwner)).rated,
    sources: new Set(xs.map(sourceOf)).size,
  }))
  // Lived-with evidence only: launch-week reviews run rosier, so cars known
  // to have only launch reviews (LAUNCH_REVIEWS_ONLY in recommend.ts, copied
  // here) and cars with few owner remarks are left out of the car lists.
  .filter((c) => !LAUNCH_ONLY.has(c.carId) && c.ownerRated >= MIN_CAR_OWNER)
  .filter((c) => c.rated >= MIN_CAR && c.sources >= 5)
  .map((c) => ({ carId: c.carId, name: c.name, share: round(c.share), rated: c.rated, sources: c.sources }))
  .sort((a, b) => b.share - a.share);

const own = C.filter(isOwner);
const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  totals: {
    statements: C.length,
    sources: new Set(C.map(sourceOf)).size,
    cars: new Set(C.map((c) => c.car_id)).size,
    ownerStatements: own.length,
    expertStatements: C.length - own.length,
    criticalShare: round(rate(C).share),
    ownerCriticalShare: round(rate(own).share),
    expertCriticalShare: round(rate(C.filter((c) => !isOwner(c))).share),
  },
  thresholds: { MIN_THEME, MIN_FACET, MIN_BRAND_SERVICE, MIN_CAR, MIN_CAR_OWNER },
  themes,
  worstTopics,
  bestTopics,
  commonComplaints,
  brands,
  mostCriticisedCars: carStats.slice(0, 8),
  leastCriticisedCars: carStats.slice(-8).reverse(),
  carsCounted: carStats.length,
};
fs.mkdirSync("lib/studies", { recursive: true });
fs.writeFileSync("lib/studies/ownerComplaints.json", JSON.stringify(out, null, 2) + "\n");
console.log(`wrote lib/studies/ownerComplaints.json: ${out.totals.statements} statements, ${out.totals.sources} reviews, ${out.totals.cars} cars`);
