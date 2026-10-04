import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "../../components/Breadcrumbs";
import { GuideFooter, GuideNav } from "../../components/GuideLayout";
import { fetchPublishedComparisons } from "../../lib/data/fetchComparisons";
import { priceRangeText } from "../../lib/cars/format";
import { pageMetadata } from "../../lib/seo";

export const revalidate = 86400;

export const metadata: Metadata = pageMetadata({
  title: "Car Comparisons India: Owner Verdicts | CarDhoondo",
  description:
    "Creta vs Seltos, Nexon vs Brezza, Punch vs Exter and more. See where each car wins, based on what real owners and expert reviewers say.",
  path: "/compare",
});

export default async function ComparisonsIndex() {
  const pairs = await fetchPublishedComparisons();

  return (
    <main className="min-h-screen bg-paper">
      <GuideNav />
      <article className="mx-auto max-w-3xl px-6 py-12">
        <Breadcrumbs trail={[{ name: "Comparisons" }]} />
        <h1 className="mt-6 font-display text-3xl font-bold text-balance text-ink sm:text-4xl">Car comparisons</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          Stuck between two cars? Each comparison shows where one does better than the other, using what owners and expert
          reviewers actually said, with their own words. No sponsored picks.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {pairs.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/compare/${p.slug}`}
                className="block h-full rounded-2xl border border-border bg-paper-raised px-4 py-3 transition hover:border-accent-rust/50"
              >
                <span className="font-display text-base font-bold text-ink">
                  {p.a.model} vs {p.b.model}
                </span>
                <span className="mt-0.5 block text-xs text-ink-faint">
                  {p.a.brand} {p.a.model}: {priceRangeText(p.a.priceMin, p.a.priceMax) ?? "price not listed"}
                </span>
                <span className="block text-xs text-ink-faint">
                  {p.b.brand} {p.b.model}: {priceRangeText(p.b.priceMin, p.b.priceMax) ?? "price not listed"}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-ink-soft">
          Want to look at one car in depth?{" "}
          <Link href="/cars" className="text-accent-rust-soft underline underline-offset-2">
            Browse all car reviews
          </Link>
          .
        </p>
      </article>
      <GuideFooter />
    </main>
  );
}
