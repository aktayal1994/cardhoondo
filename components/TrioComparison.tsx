import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";
import DecideCta from "./DecideCta";
import { GuideFooter, GuideNav } from "./GuideLayout";
import { SITE_URL, carIdToSlug } from "../lib/cars/featured";
import { capitalize, formatLakh, fuelLabel, joinList, priceRangeText } from "../lib/cars/format";
import { facetLabel, facetLabelInline } from "../lib/cars/labels";
import type { CarFacetSummary, CarPageData, CarQuote } from "../lib/data/fetchCarPage";
import type { PublishedComparison } from "../lib/data/fetchComparisons";
import { verdictPhrase, verdictTone } from "../lib/verdict";

/**
 * Three-way comparison (/compare/a-vs-b-vs-c), built the same way as the
 * two-car page: only from the facet scores and quotes on each car's review
 * page, no AI text. A car "leads" an area only when it beats both others by a
 * clear gap, so the page never crowns a winner on noise.
 */

const LEAD_GAP = 0.2;
const MAX_LEADS = 4;

interface Row {
  facet: string;
  scores: (CarFacetSummary | null)[];
  /** Index of the car that clearly leads this area, or null. */
  leader: number | null;
  spread: number;
}

export function trioName(cars: CarPageData[]): string {
  return cars.map((c) => c.model).join(" vs ");
}

export default function TrioComparison({
  slug,
  cars,
  pairs,
}: {
  slug: string;
  cars: CarPageData[];
  /** Published two-car pages among these three cars. */
  pairs: PublishedComparison[];
}) {
  const title = trioName(cars);
  const models = cars.map((c) => c.model);
  const rows = buildRows(cars);
  const leads = cars.map((_, i) => rows.filter((r) => r.leader === i));
  const leadNames = leads.map((ls) => ls.slice(0, 3).map((r) => facetLabelInline(r.facet)));
  const sources = cars.reduce((s, c) => s + c.sourceCount, 0);
  const priceLine = cheapestLine(cars);

  const pickLines = cars
    .map((c, i) => (leadNames[i].length ? `Pick the ${c.model} if ${joinList(leadNames[i].slice(0, 2))} ${leadNames[i].length === 1 ? "matters" : "matter"} most to you.` : null))
    .filter(Boolean) as string[];
  const noLead = cars.filter((_, i) => leadNames[i].length === 0).map((c) => c.model);
  const summary =
    pickLines.length > 0
      ? `${pickLines.join(" ")}${noLead.length ? ` The ${joinList(noLead)} ${noLead.length === 1 ? "doesn't" : "don't"} clearly lead any area, but ${noLead.length === 1 ? "isn't" : "aren't"} far behind either.` : ""}`
      : `Reviewers rate the ${joinList(models)} about the same in every area we track, so let price, the variant you can afford and a test drive decide.`;

  const faqs = [
    { q: `Which is better: ${joinList(models, "or")}?`, a: summary },
    ...(priceLine ? [{ q: `Which is the cheapest of the ${joinList(models)}?`, a: priceLine }] : []),
    {
      q: `How did CarDhoondo compare these cars?`,
      a: `We went through ${sources} owner and expert reviews of the three cars, tagged every statement by topic, such as mileage or rear seat space, and scored how positive it was. Nobody paid for this comparison.`,
    },
  ];

  const pageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${title}: what owners and experts say`,
    url: `${SITE_URL}/compare/${slug}`,
    inLanguage: "en-IN",
    about: cars.map((c) => ({ "@type": "Car", name: c.name, brand: { "@type": "Brand", name: c.brand } })),
    publisher: { "@type": "Organization", name: "CarDhoondo", url: SITE_URL },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <main className="min-h-screen bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([pageLd, faqLd]) }} />
      <GuideNav />

      <article className="mx-auto max-w-3xl px-6 py-12">
        <div className="page-band">
          <Breadcrumbs trail={[{ name: "Comparisons", href: "/compare" }, { name: title }]} />
          <p className="mt-6 font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">Three-way comparison</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-balance text-ink sm:text-4xl">
            {title}: what owners and experts say
          </h1>
          <p className="mt-3 text-sm text-ink-faint">
            Based on {cars.reduce((s, c) => s + c.claimCount, 0)} statements from {sources} owner and expert reviews
          </p>
        </div>

        <DecideCta
          question={`${joinList(models, "or")}?`}
          title={`Which of these three suits you?`}
          sub="The page below says what reviewers think. Answer 8 quick questions about how you drive and we'll rank these three for you."
          carIds={cars.map((c) => c.carId)}
          button="Rank these for me"
        />

        <p className="mt-6 text-lg leading-relaxed text-ink-soft">
          {summary} {priceLine}
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">{title} key facts</caption>
            <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  <span className="sr-only">Fact</span>
                </th>
                {models.map((m) => (
                  <th key={m} scope="col" className="px-4 py-3 font-semibold text-ink">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-ink-soft">
              <FactRow label="Ex-showroom price" values={cars.map((c) => priceRangeText(c.priceMin, c.priceMax) ?? "Not listed")} />
              <FactRow label="Fuel" values={cars.map((c) => fuelsOf(c) || "n/a")} />
              <FactRow label="Gearbox" values={cars.map((c) => gearboxesOf(c) || "n/a")} />
              <FactRow label="Seating" values={cars.map((c) => c.seating.join(", ") || "n/a")} />
              <FactRow label="Reviews we read" values={cars.map((c) => String(c.sourceCount))} />
            </tbody>
          </table>
        </div>

        {cars.map((c, i) =>
          leads[i].length > 0 ? (
            <Section key={c.carId} title={`Where the ${c.model} leads`}>
              {leads[i].slice(0, MAX_LEADS).map((r) => (
                <div key={r.facet} className="mt-6 first:mt-4">
                  <h3 className="font-display text-lg font-bold text-ink">{facetLabel(r.facet)}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    {cars.map((cc, j) => (
                      <span key={cc.carId} className="flex items-center gap-1.5">
                        <span className="text-ink">{cc.model}:</span>
                        {r.scores[j] ? <Verdict score={r.scores[j]!.score} /> : <NoData />}
                      </span>
                    ))}
                  </p>
                  {r.scores[i]?.quote && <Quote quote={r.scores[i]!.quote!} car={c.model} />}
                </div>
              ))}
            </Section>
          ) : null,
        )}

        <Section title="Area by area">
          <p>
            Every area where reviewers said enough about at least two of the three cars. A tick marks a clear leader;
            &ldquo;Too few reviews&rdquo; means we won&rsquo;t guess.
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">{title} verdicts by area</caption>
              <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Area</th>
                  {models.map((m) => (
                    <th key={m} scope="col" className="px-4 py-3 font-semibold text-ink">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.facet}>
                    <td className="px-4 py-2.5 text-ink">{facetLabel(r.facet)}</td>
                    {r.scores.map((s, j) => (
                      <td key={j} className="px-4 py-2.5">
                        {s ? (
                          <span className="inline-flex items-center gap-1">
                            <Verdict score={s.score} />
                            {r.leader === j && (
                              <span aria-label="Clear leader" className="text-positive">
                                ✓
                              </span>
                            )}
                          </span>
                        ) : (
                          <NoData />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Still can't decide?">
          <p>
            Reviews only tell you how a car has worked out for other people. Which of these suits you depends on your roads, your
            family and your budget. Answer a few quick questions and we&rsquo;ll rank them for the way you actually drive.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/decide?cars=${cars.map((c) => c.carId).join(",")}`}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-rust px-6 py-3 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
            >
              Rank these three for me <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/questionnaire/core-requirements"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-ink transition hover:border-accent-rust/50"
            >
              Find my car from scratch
            </Link>
          </div>
        </Section>

        {pairs.length > 0 && (
          <Section title="Compare two at a time">
            <ul className="grid gap-3 sm:grid-cols-2">
              {pairs.map((p) => (
                <li key={p.slug}>
                  <CardLink href={`/compare/${p.slug}`} title={`${p.a.model} vs ${p.b.model}`} sub="Head to head, area by area" />
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Read the full reviews">
          <ul className="grid gap-3 sm:grid-cols-2">
            {cars.map((c) => (
              <li key={c.carId}>
                <CardLink
                  href={`/cars/${carIdToSlug(c.carId)}`}
                  title={`${c.name} review`}
                  sub={`${c.claimCount} statements from ${c.sourceCount} reviews`}
                />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Questions people ask">
          {faqs.map((f) => (
            <div key={f.q} className="mt-5 first:mt-0">
              <h3 className="font-display text-lg font-bold text-ink">{f.q}</h3>
              <p className="mt-1">{f.a}</p>
            </div>
          ))}
        </Section>

        <p className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-ink-faint">
          How this page is made: we collect what real owners and expert reviewers say in published video reviews, tag each statement
          by topic and score how positive or negative it is. A car only leads an area when it beats both others by a clear gap.
          Nothing here is paid for by manufacturers or dealers. Prices come from CarDekho and can change, so confirm with a dealer.
        </p>
      </article>

      <GuideFooter />
    </main>
  );
}

function buildRows(cars: CarPageData[]): Row[] {
  const maps = cars.map((c) => new Map(c.facets.map((f) => [f.facet, f])));
  const all = Array.from(new Set(maps.flatMap((m) => [...m.keys()])));
  const rows: Row[] = [];
  for (const facet of all) {
    const scores = maps.map((m) => m.get(facet) ?? null);
    const present = scores.filter(Boolean).length;
    if (present < 2) continue;
    let leader: number | null = null;
    if (present === 3) {
      const vals = scores.map((s) => s!.score);
      const best = vals.indexOf(Math.max(...vals));
      if (vals.every((v, j) => j === best || vals[best] - v >= LEAD_GAP)) leader = best;
    }
    const vals = scores.filter(Boolean).map((s) => s!.score);
    rows.push({ facet, scores, leader, spread: Math.max(...vals) - Math.min(...vals) });
  }
  return rows.sort(
    (x, y) =>
      Number(y.scores.every(Boolean)) - Number(x.scores.every(Boolean)) ||
      y.spread - x.spread ||
      facetLabel(x.facet).localeCompare(facetLabel(y.facet)),
  );
}

function cheapestLine(cars: CarPageData[]): string {
  if (cars.some((c) => c.priceMin == null)) return "";
  const sorted = [...cars].sort((a, b) => a.priceMin! - b.priceMin!);
  const parts = sorted.map((c) => `the ${c.model} at ${formatLakh(c.priceMin)}`);
  return `By starting ex-showroom price, ${parts[0]} is the cheapest way in, then ${parts[1]} and ${parts[2]}.`;
}

function fuelsOf(c: CarPageData): string {
  return Array.from(new Set(c.powertrains.map((p) => p.fuel).filter((f): f is string => !!f).map(fuelLabel))).join(", ");
}

function gearboxesOf(c: CarPageData): string {
  return Array.from(new Set(c.powertrains.map((p) => p.transmission).filter((t): t is string => !!t).map(capitalize))).join(", ");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      <div className="mt-3 leading-relaxed text-ink-soft [&_p]:mb-3">{children}</div>
    </section>
  );
}

function FactRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <th scope="row" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </th>
      {values.map((v, i) => (
        <td key={i} className="px-4 py-3 text-ink">
          {v}
        </td>
      ))}
    </tr>
  );
}

function CardLink({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="block rounded-2xl border border-border bg-paper-raised px-4 py-3 transition hover:border-accent-rust/50">
      <span className="font-display text-base font-bold text-ink">{title}</span>
      <span className="mt-0.5 block text-xs text-ink-faint">{sub}</span>
    </Link>
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
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{verdictPhrase(score)}</span>;
}

function NoData() {
  return <span className="text-xs text-ink-faint">Too few reviews</span>;
}

function Quote({ quote, car }: { quote: CarQuote; car: string }) {
  return (
    <blockquote className="mt-3 border-l-2 border-accent-rust/60 pl-4 text-ink-soft">
      <p className="italic">
        <span className="not-italic font-semibold text-ink">{car}: </span>&ldquo;{quote.text}&rdquo;
      </p>
      <footer className="mt-1 text-xs text-ink-faint">
        {quote.sourceType === "ownership" ? "Owner review" : "Expert review"}
        {quote.sourceTitle ? (
          <>
            {", "}
            {quote.url ? (
              <a href={quote.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {quote.sourceTitle}
              </a>
            ) : (
              quote.sourceTitle
            )}
          </>
        ) : null}
      </footer>
    </blockquote>
  );
}
