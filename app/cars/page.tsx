import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "../../components/Breadcrumbs";
import { GuideFooter, GuideNav } from "../../components/GuideLayout";
import { fetchFeaturedCarSummaries } from "../../lib/data/fetchCarPage";
import { carIdToSlug, displayBrand } from "../../lib/cars/featured";
import { priceRangeText } from "../../lib/cars/format";

export const revalidate = 86400;

const TITLE = "Car Reviews India: What Owners and Experts Say";
const DESCRIPTION =
  "Honest reviews of India's most popular cars, built from what real owners and expert reviewers say: strengths, common complaints, prices and engine options. No sponsored picks.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/cars" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/cars" },
};

export default async function CarsIndexPage() {
  const cars = await fetchFeaturedCarSummaries();
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
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">{DESCRIPTION}</p>

        {[...byBrand.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([brand, list]) => (
            <section key={brand} className="mt-10">
              <h2 className="font-display text-2xl font-bold text-ink">{brand} car reviews</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {list.map((c) => (
                  <li key={c.carId}>
                    <Link
                      href={`/cars/${carIdToSlug(c.carId)}`}
                      className="block rounded-2xl border border-border bg-paper-raised p-5 transition hover:border-accent-rust/50"
                    >
                      <h3 className="font-display text-lg font-bold text-ink">{c.name} review</h3>
                      <p className="mt-1 text-sm text-ink-soft">{priceRangeText(c.priceMin, c.priceMax) ?? "Price not listed"} ex-showroom</p>
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
