import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { GuideFooter, GuideNav } from "../../../components/GuideLayout";
import { fetchCarPageData, fetchFeaturedCarSummaries } from "../../../lib/data/fetchCarPage";
import type { CarFacetSummary, CarPageData, FeaturedCarSummary } from "../../../lib/data/fetchCarPage";
import { FEATURED_CAR_IDS, SITE_URL, carIdToSlug, slugToCarId } from "../../../lib/cars/featured";
import { capitalize, formatLakh, formatLongDate, fuelLabel, joinList, priceRangeText } from "../../../lib/cars/format";
import { facetLabel, facetLabelInline, themeLabel } from "../../../lib/cars/labels";
import { verdictPhrase, verdictTone } from "../../../lib/verdict";

/**
 * Public review page for one popular car: what owners and experts say, drawn
 * only from the claims already in the database (no new data, no AI text).
 * Only cars in FEATURED_CAR_IDS exist; anything else is a 404.
 */
export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return FEATURED_CAR_IDS.map((id) => ({ slug: carIdToSlug(id) }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const carId = slugToCarId(slug);
  const data = carId ? await fetchCarPageData(carId) : null;
  if (!data) return {};

  const price = priceRangeText(data.priceMin, data.priceMax);
  const title = `${data.name} Review India: Owner & Expert Verdict`;
  const description = `${data.name} review built from ${data.claimCount} statements in ${data.sourceCount} owner and expert reviews: what people like, common complaints${price ? `, price ${price} ex-showroom` : ""} and engine options.`;
  const url = `/cars/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "article", url, images: [{ url: "/og-image.png", width: 1200, height: 630 }] },
  };
}

export default async function CarPage({ params }: Params) {
  const { slug } = await params;
  const carId = slugToCarId(slug);
  if (!carId) notFound();
  const [data, featured] = await Promise.all([fetchCarPageData(carId), fetchFeaturedCarSummaries()]);
  if (!data) notFound();

  const { name } = data;
  const price = priceRangeText(data.priceMin, data.priceMax);
  const fuels = uniq(data.powertrains.map((p) => p.fuel).filter((f): f is string => !!f).map(fuelLabel));
  const gearboxes = uniq(data.powertrains.map((p) => p.transmission).filter((t): t is string => !!t).map(capitalize));
  const topLikes = data.likes.slice(0, 3).map((f) => facetLabelInline(f.facet));
  const topComplaints = data.shortfalls.filter((f) => f.score < 0).slice(0, 3).map((f) => facetLabelInline(f.facet));
  const related = pickRelated(data, featured);

  const faqs = buildFaqs(data, { price, fuels, gearboxes, topLikes, topComplaints });

  const pageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${name} review India: owner and expert verdict`,
    url: `${SITE_URL}/cars/${slug}`,
    inLanguage: "en-IN",
    ...(data.updatedAt ? { dateModified: data.updatedAt } : {}),
    about: { "@type": "Car", name, brand: { "@type": "Brand", name: data.brand } },
    publisher: { "@type": "Organization", name: "CarDhoondo", url: SITE_URL },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  const themes = groupByTheme(data.facets);

  return (
    <main className="min-h-screen bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([pageLd, faqLd]) }} />
      <GuideNav />

      <article className="mx-auto max-w-3xl px-6 py-12">
        <Breadcrumbs trail={[{ name: "Car reviews", href: "/cars" }, { name }]} />

        <p className="mt-6 font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">{data.brand} review</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-balance text-ink sm:text-4xl">
          {name} review: what owners and experts say
        </h1>
        <p className="mt-3 text-sm text-ink-faint">
          Based on {data.claimCount} statements from {data.sourceCount} owner and expert reviews
          {data.updatedAt && (
            <>
              {" "}
              · Updated <time dateTime={data.updatedAt}>{formatLongDate(data.updatedAt)}</time>
            </>
          )}
        </p>

        <p className="mt-6 text-lg leading-relaxed text-ink-soft">
          {price ? (
            <>
              The {name} costs {price} ex-showroom in India
              {data.variantCount ? ` across ${data.variantCount} variants` : ""}
              {fuels.length ? `, sold with ${joinList(fuels.map(inlineFuel))} ${fuels.length === 1 && fuels[0] === "Electric" ? "powertrain" : "powertrains"}` : ""}.{" "}
            </>
          ) : null}
          {topLikes.length > 0 ? (
            <>
              Reviewers are most positive about its {joinList(topLikes)}
              {topComplaints.length > 0 ? `, and most critical of its ${joinList(topComplaints)}` : ""}.
            </>
          ) : (
            <>Reviews are still building for this car.</>
          )}{" "}
          Here is the full picture, with the actual words reviewers used.
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
          <Fact label="Ex-showroom price" value={price ?? "Not listed"} />
          <Fact label="Variants" value={data.variantCount ? String(data.variantCount) : "n/a"} />
          <Fact label="Fuel" value={fuels.join(", ") || "n/a"} />
          <Fact label="Seating" value={data.seating.join(", ") || "n/a"} />
        </dl>

        <Section title={`${name} price and engine options in India`}>
          {price ? (
            <p>
              Ex-showroom prices run from {formatLakh(data.priceMin)} to {formatLakh(data.priceMax)}. On-road prices depend on your
              city, so check them before you commit.
            </p>
          ) : null}
          {data.powertrains.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[520px] text-left text-sm">
                <caption className="sr-only">{name} engine and gearbox options</caption>
                <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-faint">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Fuel</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Gearbox</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Engine</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Power / torque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink-soft">
                  {data.powertrains.map((p, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-ink">{fuelLabel(p.fuel ?? "")}</td>
                      <td className="px-4 py-3">
                        {capitalize(p.transmission ?? "")}
                        {p.gearbox ? ` (${p.gearbox})` : ""}
                      </td>
                      <td className="px-4 py-3">{[p.engine, p.displacement].filter(Boolean).join(", ")}</td>
                      <td className="px-4 py-3">{[p.power, p.torque].filter(Boolean).join(" / ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4">
            Got a dealer quote for the {name}?{" "}
            <Link href={`/quotation?car=${data.carId}`} className="text-accent-rust-soft underline underline-offset-2">
              Check it for hidden charges
            </Link>
            .
          </p>
        </Section>

        {data.likes.length > 0 && (
          <Section title={`What owners and experts like about the ${name}`}>
            {data.likes.map((f) => (
              <FacetBlock key={f.facet} f={f} />
            ))}
          </Section>
        )}

        {data.shortfalls.length > 0 && (
          <Section title={`Where the ${name} falls short`}>
            <p>
              Not every point below is a serious flaw. Some are mixed opinions where reviewers disagreed, and the label says which.
            </p>
            {data.shortfalls.map((f) => (
              <FacetBlock key={f.facet} f={f} />
            ))}
          </Section>
        )}

        <Section title={`${name} ratings by area`}>
          <p>Every area where we have at least two reviews, with the overall verdict.</p>
          {themes.map(([theme, items]) => (
            <div key={theme} className="mt-5">
              <h3 className="font-display text-lg font-bold text-ink">{themeLabel(theme)}</h3>
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
                {items.map((f) => (
                  <li key={f.facet} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <span className="text-ink">{facetLabel(f.facet)}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-ink-faint">
                        {f.claimCount} {f.claimCount === 1 ? "review" : "reviews"}
                      </span>
                      <Verdict score={f.score} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Section>

        <Section title={`Is the ${name} right for you?`}>
          <p>
            A car that reviewers love can still be wrong for your roads, family and budget. Answer 11 quick questions about how you
            actually drive and live, and we&rsquo;ll match you to the cars with the strongest evidence behind them.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/questionnaire/intro"
              className="inline-flex items-center gap-2 rounded-full bg-accent-rust px-6 py-3 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
            >
              Find my car <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/quotation?car=${data.carId}`}
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-ink transition hover:border-accent-rust/50"
            >
              Check a {name} dealer quote
            </Link>
          </div>
        </Section>

        <Section title={`${name} FAQs`}>
          {faqs.map((f) => (
            <div key={f.q} className="mt-5 first:mt-0">
              <h3 className="font-display text-lg font-bold text-ink">{f.q}</h3>
              <p className="mt-1">{f.a}</p>
            </div>
          ))}
        </Section>

        {related.length > 0 && (
          <Section title="More car reviews">
            <ul className="grid gap-3 sm:grid-cols-2">
              {related.map((c) => (
                <li key={c.carId}>
                  <Link
                    href={`/cars/${carIdToSlug(c.carId)}`}
                    className="block rounded-2xl border border-border bg-paper-raised px-4 py-3 transition hover:border-accent-rust/50"
                  >
                    <span className="font-display text-base font-bold text-ink">{c.name} review</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">{priceRangeText(c.priceMin, c.priceMax) ?? ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <p className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-ink-faint">
          How this page is made: we collect what real owners and expert reviewers say in published video reviews, tag each statement
          by topic (for example ride comfort or service cost) and score how positive or negative it is. Nothing here is paid for
          by manufacturers or dealers, and no result is sponsored. Prices come from CarDekho and can change; confirm with a dealer.
          Read more in{" "}
          <Link href="/guides/why-everyone-has-different-opinion" className="underline underline-offset-2">
            why car advice conflicts
          </Link>
          .
        </p>
      </article>

      <GuideFooter />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      <div className="mt-3 leading-relaxed text-ink-soft [&_p]:mb-3">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper-raised px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Verdict({ score }: { score: number }) {
  const tone = verdictTone(score);
  const cls =
    tone === "positive"
      ? "bg-positive-bg text-positive"
      : tone === "negative"
        ? "bg-negative-bg text-negative"
        : "bg-neutral-verdict-bg text-neutral-verdict";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{verdictPhrase(score)}</span>;
}

function FacetBlock({ f }: { f: CarFacetSummary }) {
  return (
    <div className="mt-6 first:mt-4">
      <h3 className="font-display text-lg font-bold text-ink">{facetLabel(f.facet)}</h3>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <Verdict score={f.score} />
        <span className="text-ink-faint">
          based on {f.claimCount} {f.claimCount === 1 ? "review" : "reviews"}
        </span>
      </p>
      {f.quote && (
        <blockquote className="mt-3 border-l-2 border-accent-rust/60 pl-4 text-ink-soft">
          <p className="italic">&ldquo;{f.quote.text}&rdquo;</p>
          <footer className="mt-1 text-xs text-ink-faint">
            {f.quote.sourceType === "ownership" ? "Owner review" : "Expert review"}
            {f.quote.sourceTitle ? (
              <>
                {" · "}
                {f.quote.url ? (
                  <a href={f.quote.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {f.quote.sourceTitle}
                  </a>
                ) : (
                  f.quote.sourceTitle
                )}
              </>
            ) : null}
          </footer>
        </blockquote>
      )}
    </div>
  );
}

function buildFaqs(
  data: CarPageData,
  x: { price: string | null; fuels: string[]; gearboxes: string[]; topLikes: string[]; topComplaints: string[] },
): { q: string; a: string }[] {
  const { name } = data;
  const faqs: { q: string; a: string }[] = [];
  if (x.price) {
    faqs.push({
      q: `How much does the ${name} cost in India?`,
      a: `The ${name} costs ${x.price} ex-showroom${data.variantCount ? ` across ${data.variantCount} variants` : ""}. On-road price depends on your city, so ask a dealer or use our dealer quote check to see what a quote should look like.`,
    });
  }
  if (x.fuels.length) {
    faqs.push({
      q: `Which engine and gearbox options does the ${name} have?`,
      a: `The ${name} is sold with ${joinList(x.fuels.map(inlineFuel))} powertrains and ${joinList(x.gearboxes.map((g) => g.toLowerCase()))} gearboxes. The table above lists every engine and gearbox combination.`,
    });
  }
  if (x.topLikes.length) {
    faqs.push({
      q: `What do owners like most about the ${name}?`,
      a: `Owners and experts are most positive about the ${name}'s ${joinList(x.topLikes)}.`,
    });
  }
  if (x.topComplaints.length) {
    faqs.push({
      q: `What are the common complaints about the ${name}?`,
      a: `The most common criticism is about the ${name}'s ${joinList(x.topComplaints)}. Check the full list above to see how strongly reviewers agree.`,
    });
  }
  faqs.push({
    q: `Is the ${name} the right car for me?`,
    a: `It depends on how you drive and live. Answer CarDhoondo's 11 quick questions and we will match you to the cars with the strongest review evidence for your situation.`,
  });
  return faqs;
}

function groupByTheme(facets: CarFacetSummary[]): [string, CarFacetSummary[]][] {
  const map = new Map<string, CarFacetSummary[]>();
  for (const f of facets) (map.get(f.theme) ?? map.set(f.theme, []).get(f.theme)!).push(f);
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
}

/** Same brand first, then the nearest starting price. */
function pickRelated(data: CarPageData, all: FeaturedCarSummary[]): FeaturedCarSummary[] {
  const others = all.filter((c) => c.carId !== data.carId);
  const base = data.priceMin ?? 0;
  return others
    .sort((a, b) => {
      const sameA = a.brand === data.brand ? 0 : 1;
      const sameB = b.brand === data.brand ? 0 : 1;
      if (sameA !== sameB) return sameA - sameB;
      return Math.abs((a.priceMin ?? 0) - base) - Math.abs((b.priceMin ?? 0) - base);
    })
    .slice(0, 6);
}

function inlineFuel(fuel: string): string {
  return fuel === "CNG" ? fuel : fuel.toLowerCase();
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
