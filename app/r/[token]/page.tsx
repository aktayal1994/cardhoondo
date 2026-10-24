import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, IndianRupee, Fuel, Users, ShieldCheck, Car } from "lucide-react";
import { GuideFooter, GuideNav } from "../../../components/GuideLayout";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";
import { SHARE_TOKEN_RE, type ShareSnapshot, type SharedCar, type SharedFacet } from "../../../lib/share/snapshot";
import { fetchFeaturedCarSummaries } from "../../../lib/data/fetchCarPage";
import { carIdToSlug } from "../../../lib/cars/featured";
import { facetLabel } from "../../../lib/cars/labels";
import { BRAND_LOGOS } from "../../../lib/brandLogos";
import { ALL_FACETS } from "../../../lib/scoring/questionnaireWeights";

/**
 * /r/<token> -- a shortlist someone shared (see /api/share). Read-only and
 * built for the person who receives the link: the cars at a glance, how they
 * rate on what the sharer cares about, and a way to get their own shortlist.
 * Never indexed; holds no personal details.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

const FIND_MY_CAR = "/questionnaire/core-requirements?utm_source=shared_link&utm_medium=share&utm_campaign=shortlist";
const TOTAL_FACETS = ALL_FACETS.length;

async function loadSnapshot(token: string): Promise<ShareSnapshot | null> {
  if (!SHARE_TOKEN_RE.test(token)) return null;
  const { data } = await getSupabaseServerClient().from("shared_results").select("snapshot").eq("id", token).maybeSingle();
  const snap = data?.snapshot as ShareSnapshot | undefined;
  return snap?.version === 1 && snap.cars?.length ? snap : null;
}

const carName = (c: SharedCar) => `${c.brand} ${c.car_model}`;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const snap = await loadSnapshot(token);
  if (!snap) return { title: "Shortlist not found | CarDhoondo", robots: { index: false, follow: false } };
  const names = snap.cars.map((c) => c.car_model).join(", ");
  const title = `${snap.persona.title}: a car shortlist`;
  const description = `${names}. Ranked for these needs from real owner and expert reviews on CarDhoondo. Find the car that fits you.`;
  return {
    title: { absolute: `${title} | CarDhoondo` },
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, url: `/r/${token}`, siteName: "CarDhoondo", type: "website", images: ["/og-image.png"] },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
  };
}

export default async function SharedShortlistPage({ params }: Params) {
  const { token } = await params;
  const snap = await loadSnapshot(token);
  if (!snap) notFound();

  const published = new Set((await fetchFeaturedCarSummaries().catch(() => [])).map((c) => c.carId));
  const chipIcons = [IndianRupee, Fuel, Users, ShieldCheck];
  const made = new Date(snap.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <main className="min-h-screen bg-paper">
      <GuideNav />

      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_60%_100%_at_80%_0%,rgba(226,152,74,0.16),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
          {/* Hero */}
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-rust-soft">A car shortlist made for</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink sm:text-5xl">{snap.persona.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {snap.persona.chips.map((chip, i) => {
              const Icon = chipIcons[i] ?? Check;
              return (
                <span key={chip} className="flex items-center gap-1.5 rounded-full border border-border bg-paper-raised px-3 py-1.5 text-xs text-ink-soft">
                  <Icon className="h-3.5 w-3.5 text-accent-rust" strokeWidth={2} />
                  {chip}
                </span>
              );
            })}
          </div>
          <p className="mt-5 max-w-2xl text-ink-soft">
            Someone shared their CarDhoondo shortlist with you. These {snap.cars.length === 1 ? "is the car" : `are the ${snap.cars.length} cars`} that
            fit these needs best, ranked from what real owners and expert reviewers say. Nobody paid to be on this list.
          </p>
          <Link
            href={FIND_MY_CAR}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent-rust px-6 py-3 text-sm font-semibold text-charcoal-950 shadow-glow-sm transition hover:brightness-110"
          >
            Find the car that fits you <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Podium */}
          <div className={`mt-10 grid gap-4 ${snap.cars.length >= 3 ? "sm:grid-cols-3" : snap.cars.length === 2 ? "sm:grid-cols-2" : ""} sm:items-end`}>
            {snap.cars.map((c) => (
              <PodiumCard key={c.car_id} car={c} reviewHref={published.has(c.car_id) ? `/cars/${carIdToSlug(c.car_id)}` : null} />
            ))}
          </div>

          {snap.budget && <BudgetStrip cars={snap.cars} budget={snap.budget} />}

          {snap.grid.facets.length > 0 && <RatingGrid snap={snap} />}

          {/* Why each car */}
          <h2 className="mt-12 font-display text-2xl font-bold text-ink">Why each car made the list</h2>
          <div className="mt-4 space-y-4">
            {snap.cars.map((c) => (
              <WhyCard key={c.car_id} car={c} />
            ))}
          </div>

          {/* CTA */}
          <section className="mt-12 rounded-3xl bg-gradient-to-br from-accent-rust to-accent-rust-soft p-6 text-charcoal-950 sm:p-8">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Your needs are different. So is your car.</h2>
            <p className="mt-2 max-w-xl text-sm font-medium sm:text-base">
              Answer 11 quick questions about how you drive and who rides with you. Get 2 or 3 cars matched to you, each backed by real
              owner and expert reviews. Free, and no dealer will call you.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={FIND_MY_CAR}
                className="inline-flex items-center gap-2 rounded-full bg-charcoal-950 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-charcoal-900"
              >
                Find my car <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/quotation" className="text-sm font-semibold underline decoration-dotted underline-offset-4">
                Got a dealer quote? Check it free
              </Link>
            </div>
          </section>

          <p className="mt-6 text-xs text-ink-faint">
            Shortlist made on {made}. Prices are on-road estimates from that day and may have changed; confirm with the dealer.
            CarDhoondo takes no payment from dealers or car makers.
          </p>
        </div>
      </div>

      <GuideFooter />
    </main>
  );
}

function brandLogo(carId: string): string | undefined {
  const prefix = carId.split("_")[0];
  const key = Object.keys(BRAND_LOGOS).find((b) => b.toLowerCase() === prefix);
  return key ? BRAND_LOGOS[key] : undefined;
}

function RankBadge({ rank, small = false }: { rank: number; small?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent-rust font-semibold text-charcoal-950 ${
        small ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-xs"
      }`}
    >
      {rank}
    </span>
  );
}

function CoverageRing({ covered }: { covered: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, covered / TOTAL_FACETS);
  return (
    <svg width="64" height="64" viewBox="0 0 66 66" aria-hidden>
      <circle cx="33" cy="33" r={r} className="stroke-charcoal-800" strokeWidth="6" fill="none" />
      <circle
        cx="33"
        cy="33"
        r={r}
        stroke="#e2984a"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(c * frac).toFixed(1)} ${c.toFixed(1)}`}
        transform="rotate(-90 33 33)"
      />
      <text x="33" y="32" textAnchor="middle" fontSize="15" fontWeight="600" className="fill-ink">
        {covered}
      </text>
      <text x="33" y="45" textAnchor="middle" fontSize="9" className="fill-ink-faint">
        of {TOTAL_FACETS}
      </text>
    </svg>
  );
}

function PodiumCard({ car, reviewHref }: { car: SharedCar; reviewHref: string | null }) {
  const first = car.rank === 1;
  const logo = brandLogo(car.car_id);
  const lakh = car.price_on_road != null ? (car.price_on_road / 100000).toFixed(2) : null;
  return (
    <article
      className={`rounded-3xl border bg-paper-raised p-5 text-center ${
        first ? "border-accent-rust shadow-[0_0_0_1px_rgba(226,152,74,0.35),0_12px_40px_-12px_rgba(226,152,74,0.45)] sm:pt-7" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <RankBadge rank={car.rank} />
        {first && <span className="rounded-full bg-accent-rust-soft px-2.5 py-1 text-[11px] font-semibold text-charcoal-950">Best match</span>}
      </div>
      <div className="mx-auto mt-2 flex h-14 w-14 items-center justify-center rounded-full bg-charcoal-50 p-2.5">
        {logo ? (
          <Image src={logo} alt="" width={40} height={40} className="h-full w-full object-contain" />
        ) : (
          <Car className="h-6 w-6 text-charcoal-900" />
        )}
      </div>
      <h3 className="mt-3 font-display text-2xl font-bold text-ink">{car.car_model}</h3>
      <p className="text-xs text-ink-faint">
        {car.brand} · {car.variant_id}
      </p>
      {lakh ? (
        <p className="mt-3 font-display text-3xl font-bold text-accent-rust-soft">
          ₹{lakh}
          <span className="ml-1 font-sans text-xs font-medium text-ink-soft">lakh</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">Price not listed</p>
      )}
      <p className="text-[11px] text-ink-faint">
        on-road{car.price_city ? `, ${car.price_city}` : ""}
        {car.price_basis === "estimate" ? " (estimated)" : ""}
      </p>
      <div className="mt-3 flex items-center justify-center gap-2">
        <CoverageRing covered={car.facets_with_data} />
        <p className="text-left text-[11px] leading-snug text-ink-faint">
          review factors
          <br />
          covered by real
          <br />
          owner &amp; expert reviews
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {car.reasons_to_like.slice(0, 2).map((f) => (
          <span key={f.facet} className="flex items-center justify-center gap-1.5 rounded-full bg-positive-bg px-3 py-1 text-xs font-medium text-positive">
            <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
            {facetLabel(f.facet)}
          </span>
        ))}
      </div>
      {reviewHref && (
        <Link href={reviewHref} className="mt-4 inline-block text-xs font-medium text-accent-rust-soft underline decoration-dotted underline-offset-4">
          Read what owners say →
        </Link>
      )}
    </article>
  );
}

function BudgetStrip({ cars, budget }: { cars: SharedCar[]; budget: { min: number; max: number } }) {
  const prices = cars.map((c) => (c.price_on_road ?? 0) / 100000).filter((p) => p > 0);
  if (prices.length === 0) return null;
  const lo = Math.min(budget.min, Math.floor(Math.min(...prices)));
  const hi = Math.max(budget.max, Math.ceil(Math.max(...prices)));
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const step = hi - lo > 12 ? 5 : hi - lo > 6 ? 2 : 1;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);
  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Where they sit in the budget</h2>
      <div className="relative mx-3 mt-4 h-12">
        <div className="absolute inset-x-0 top-[15px] h-0.5 bg-charcoal-800" />
        <div
          className="absolute top-3 h-2 rounded-full bg-gradient-to-r from-accent-rust/40 to-accent-rust/70"
          style={{ left: `${pct(budget.min)}%`, right: `${100 - pct(budget.max)}%` }}
        />
        {ticks.map((t) => (
          <span key={t} className="absolute top-7 -translate-x-1/2 text-[10px] text-ink-faint" style={{ left: `${pct(t)}%` }}>
            ₹{t}L
          </span>
        ))}
        {cars.map((c) =>
          c.price_on_road ? (
            <span
              key={c.car_id}
              title={carName(c)}
              className={`absolute top-0.5 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 border-accent-rust text-[11px] font-semibold ${
                c.rank === 1 ? "bg-accent-rust text-charcoal-950" : "bg-paper-raised text-ink"
              }`}
              style={{ left: `${pct(c.price_on_road / 100000)}%` }}
            >
              {c.rank}
            </span>
          ) : null,
        )}
      </div>
    </section>
  );
}

const LEVELS = [
  { min: 0.6, word: "Loved", cls: "bg-[#2e7a4e] text-[#eafff1]" },
  { min: 0.2, word: "Liked", cls: "bg-[#24503a] text-[#bdf0cf]" },
  { min: -0.2, word: "Mixed", cls: "bg-[#3a3630] text-[#e2dcd2]" },
  { min: -0.6, word: "Some complaints", cls: "bg-[#5a2c28] text-[#ffc9c3]" },
  { min: -Infinity, word: "Disliked", cls: "bg-[#93392f] text-[#fff0ee]" },
];
function level(score: number) {
  if (score >= 0.6) return LEVELS[0];
  if (score >= 0.2) return LEVELS[1];
  if (score > -0.2) return LEVELS[2];
  if (score > -0.6) return LEVELS[3];
  return LEVELS[4];
}

function RatingGrid({ snap }: { snap: ShareSnapshot }) {
  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">How reviewers rate them on what matters here</h2>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-faint">
        {LEVELS.map((l) => (
          <span key={l.word} className="flex items-center gap-1">
            <i className={`inline-block h-2.5 w-2.5 rounded-sm ${l.cls}`} />
            {l.word}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-ink-faint" />
          Faded = fewer than 3 reviews
        </span>
      </div>
      <table className="mt-3 w-full table-fixed border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="w-[30%]" />
            {snap.cars.map((c) => (
              <th key={c.car_id} className="pb-1 text-center font-display text-sm font-semibold text-ink">
                <span className="inline-flex flex-col items-center gap-1 sm:flex-row">
                  <RankBadge rank={c.rank} small />
                  {c.car_model}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {snap.grid.facets.map((f) => (
            <tr key={f}>
              <td className="pr-1 text-xs font-medium text-ink-soft sm:text-sm">{facetLabel(f)}</td>
              {snap.cars.map((c) => {
                const cell = snap.grid.cells[c.car_id]?.[f];
                if (!cell) {
                  return (
                    <td key={c.car_id}>
                      <div className="rounded-lg border border-dashed border-border px-1 py-2 text-center text-[10px] text-ink-faint sm:text-xs">No data yet</div>
                    </td>
                  );
                }
                const l = level(cell.score);
                const thin = cell.claim_count < 3;
                return (
                  <td key={c.car_id}>
                    <div
                      className={`rounded-lg px-1 py-1.5 text-center text-[11px] font-semibold leading-tight sm:text-xs ${l.cls} ${
                        thin ? "opacity-50 outline-dashed outline-1 -outline-offset-1 outline-white/40" : ""
                      }`}
                    >
                      {l.word}
                      <span className="mt-0.5 block text-[9px] font-normal opacity-80 sm:text-[10px]">
                        {thin ? `only ${cell.claim_count} review${cell.claim_count === 1 ? "" : "s"}` : `${cell.claim_count} reviews`}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Bar({ f }: { f: SharedFacet }) {
  const w = Math.max(8, Math.min(100, Math.abs(f.score) * 100));
  const pos = f.score >= 0;
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr_1.75rem] items-center gap-2 text-xs">
      <span className="truncate text-ink-soft">{facetLabel(f.facet)}</span>
      <span className="grid h-3 grid-cols-2">
        <span className="flex justify-end border-r border-ink-faint/50">
          {!pos && <span className="h-3 rounded-l bg-negative" style={{ width: `${w}%` }} />}
        </span>
        <span className="flex">{pos && <span className="h-3 rounded-r bg-positive" style={{ width: `${w}%` }} />}</span>
      </span>
      <span className="text-right text-[11px] text-ink-faint">{f.claim_count}</span>
    </div>
  );
}

function WhyCard({ car }: { car: SharedCar }) {
  const rows = [...car.reasons_to_like.slice(0, 3), ...car.watch_outs.slice(0, 3)];
  const quote = car.reasons_to_like.find((f) => f.quote)?.quote;
  return (
    <article className="rounded-3xl border border-border bg-paper-raised p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <RankBadge rank={car.rank} />
        <div>
          <h3 className="font-display text-xl font-bold text-ink">{carName(car)}</h3>
          {car.headline && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{car.headline}</p>}
          <p className="mt-1 text-xs text-ink-faint">{car.confidence}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-[1.3fr_1fr] sm:items-center">
        <div className="space-y-2">
          <div className="grid grid-cols-[minmax(0,9rem)_1fr_1.75rem] gap-2 text-[10px] text-ink-faint">
            <span />
            <span className="grid grid-cols-2">
              <span className="pr-1 text-right">◀ Complaints</span>
              <span className="pl-1">Praise ▶</span>
            </span>
            <span className="text-right">Reviews</span>
          </div>
          {rows.map((f) => (
            <Bar key={f.facet} f={f} />
          ))}
        </div>
        {quote && (
          <blockquote className="rounded-2xl bg-charcoal-800/50 p-4 font-display text-sm italic leading-relaxed text-ink">
            <span className="mr-1 font-sans text-2xl not-italic leading-none text-accent-rust">“</span>
            {quote.length > 180 ? `${quote.slice(0, 177).trimEnd()}…` : quote}
            <span className="mt-2 block font-sans text-[11px] not-italic text-ink-faint">From a real owner or expert review</span>
          </blockquote>
        )}
      </div>
    </article>
  );
}
