import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "../../components/Breadcrumbs";
import { GuideFooter, GuideNav } from "../../components/GuideLayout";
import { fetchFeaturedCarSummaries } from "../../lib/data/fetchCarPage";
import { fetchPublishedComparisons } from "../../lib/data/fetchComparisons";
import { carIdToSlug, displayBrand } from "../../lib/cars/featured";
import { fuelLabel, priceRangeText } from "../../lib/cars/format";
import { pageMetadata, withBrand } from "../../lib/seo";

export const revalidate = 86400;

const TITLE = "Car Reviews India: What Owners and Experts Say";
const DESCRIPTION =
  "Car reviews built from what real owners and expert reviewers say: strengths, common complaints, prices and engines. No sponsored picks.";

export const metadata: Metadata = pageMetadata({ title: withBrand(TITLE), description: DESCRIPTION, path: "/cars" });

const FUEL_ORDER = ["Petrol", "Diesel", "CNG", "Hybrid", "Electric"];

/** "Petrol, Diesel, CNG" in a fixed order, so cards read consistently. */
function fuelList(fuels: string[]): string {
  const labels = Array.from(new Set(fuels.map((f) => fuelLabel(f))));
  const rank = (l: string) => (FUEL_ORDER.indexOf(l) === -1 ? 99 : FUEL_ORDER.indexOf(l));
  return labels.sort((a, b) => rank(a) - rank(b)).join(", ");
}

function brandAnchor(brand: string): string {
  return brand.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default async function CarsIndexPage() {
  const [cars, comparisons] = await Promise.all([fetchFeaturedCarSummaries(), fetchPublishedComparisons()]);
  const byBrand = new Map<string, typeof cars>();
  for (const c of [...cars].sort((a, b) => a.name.localeCompare(b.name))) {
    const brand = displayBrand(c.brand);
    byBrand.set(brand, [...(byBrand.get(brand) ?? []), c]);
  }

  return (
    <main className="min-h-screen bg-paper">
      <GuideNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Breadcrumbs trail={[{ name: "Car reviews" }]} />
        <p className="mt-6 font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">Car reviews</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-balance text-ink sm:text-4xl">{TITLE}</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
          Reviews of {cars.length} cars sold in India, each built from what real owners and expert reviewers say: strengths,
          common complaints, prices and engine options. No sponsored picks.
        </p>

        {comparisons.length > 0 && (
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Deciding between two?{" "}
            {comparisons.slice(0, 4).map((c, i) => (
              <span key={c.slug}>
                {i > 0 && ", "}
                <Link href={`/compare/${c.slug}`} className="text-accent-rust-soft underline underline-offset-2">
                  {c.a.model} vs {c.b.model}
                </Link>
              </span>
            ))}
            {" or "}
            <Link href="/compare" className="text-accent-rust-soft underline underline-offset-2">
              see all {comparisons.length} comparisons
            </Link>
            .
          </p>
        )}

        <nav aria-label="Jump to a brand" className="mt-8 flex flex-wrap gap-2">
          {[...byBrand.keys()]
            .sort((a, b) => a.localeCompare(b))
            .map((brand) => (
              <a
                key={brand}
                href={`#${brandAnchor(brand)}`}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-ink-soft transition hover:border-accent-rust/50 hover:text-ink"
              >
                {brand} <span className="text-ink-faint">({byBrand.get(brand)!.length})</span>
              </a>
            ))}
        </nav>

        {[...byBrand.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([brand, list]) => (
            <section key={brand} id={brandAnchor(brand)} className="mt-10 scroll-mt-24">
              <h2 className="font-display text-2xl font-bold text-ink">{brand} car reviews</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {list.map((c) => (
                  <li key={c.carId}>
                    <Link
                      href={`/cars/${carIdToSlug(c.carId)}`}
                      className="block rounded-2xl border border-border bg-paper-raised p-5 transition hover:border-accent-rust/50"
                    >
                      <h3 className="font-display text-lg font-bold text-ink">{c.name} review</h3>
                      <p className="mt-1 text-sm text-ink-soft">
                        {priceRangeText(c.priceMin, c.priceMax) ? `${priceRangeText(c.priceMin, c.priceMax)} ex-showroom` : "Price not listed"}
                      </p>
                      <p className="mt-1 text-xs text-ink-faint">
                        {[fuelList(c.fuels), `based on ${c.sourceCount} reviews`].filter(Boolean).join(" · ")}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

        <section className="mt-14 rounded-2xl border border-border bg-stage p-8 text-center">
          <h2 className="font-display text-xl font-bold text-stage-ink">Not sure which of these fits you?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stage-ink-soft">
            Answer 11 quick questions about how you drive and live, and get 2&ndash;3 cars matched to you, each backed by real
            review evidence.
          </p>
          <Link
            href="/questionnaire/core-requirements"
            className="mt-5 inline-flex rounded-full bg-accent-rust px-6 py-3 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
          >
            Find my car
          </Link>
        </section>
      </div>
      <GuideFooter />
    </main>
  );
}
