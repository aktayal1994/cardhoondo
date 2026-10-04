import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { GuideFooter, GuideNav } from "../../../components/GuideLayout";
import { fetchCarPageData } from "../../../lib/data/fetchCarPage";
import type { CarFacetSummary, CarPageData, CarQuote } from "../../../lib/data/fetchCarPage";
import { fetchPublishedComparisons } from "../../../lib/data/fetchComparisons";
import { SITE_URL, carIdToSlug } from "../../../lib/cars/featured";
import { pairForSlug } from "../../../lib/cars/comparisons";
import { capitalize, formatLakh, fuelLabel, joinList, priceRangeText } from "../../../lib/cars/format";
import { comparisonDescription, comparisonTitle } from "../../../lib/cars/seo";
import { pageMetadata } from "../../../lib/seo";
import { facetLabel, facetLabelInline } from "../../../lib/cars/labels";
import { verdictPhrase, verdictTone } from "../../../lib/verdict";

/**
 * Head-to-head page for two rivals, built only from the review data both
 * review pages already use (facet scores and claims). No AI text: every
 * sentence is assembled from the numbers, so it can never claim more than
 * the evidence says. A pair exists only while both cars have a published
 * review page and are on sale (fetchPublishedComparisons).
 */
export const revalidate = 86400;
export const dynamicParams = true;

/** Score gap that counts as one car being clearly ahead (scores run -1 to +1). */
const CLEAR_GAP = 0.3;
const MAX_AHEAD = 4;

export async function generateStaticParams() {
  const pairs = await fetchPublishedComparisons();
  return pairs.map((p) => ({ slug: p.slug }));
}

type Params = { params: Promise<{ slug: string }> };

async function loadPair(slug: string): Promise<[CarPageData, CarPageData] | null> {
  if (!pairForSlug(slug)) return null;
  const published = await fetchPublishedComparisons();
  const pair = published.find((p) => p.slug === slug);
  if (!pair) return null;
  const [a, b] = await Promise.all([fetchCarPageData(pair.a.carId), fetchCarPageData(pair.b.carId)]);
  return a && b ? [a, b] : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const pair = await loadPair(slug);
  if (!pair) return {};
  const [a, b] = pair;
  return pageMetadata({
    title: comparisonTitle(a.name, secondName(a, b), a.model, b.model),
    description: comparisonDescription(a.model, b.model, a.sourceCount + b.sourceCount),
    path: `/compare/${slug}`,
    type: "article",
  });
}

interface AreaRow {
  facet: string;
  a: CarFacetSummary | null;
  b: CarFacetSummary | null;
  gap: number;
}

export default async function ComparisonPage({ params }: Params) {
  const { slug } = await params;
  const pair = await loadPair(slug);
  if (!pair) notFound();
  const [a, b] = pair;
  const A = a.model;
  const B = b.model;

  const rows = buildRows(a, b);
  const shared = rows.filter((r) => r.a && r.b);
  const aAhead = shared.filter((r) => r.gap >= CLEAR_GAP).sort((x, y) => y.gap - x.gap);
  const bAhead = shared.filter((r) => r.gap <= -CLEAR_GAP).sort((x, y) => x.gap - y.gap);
  const level = shared.filter((r) => Math.abs(r.gap) < CLEAR_GAP);

  const aWins = aAhead.slice(0, 3).map((r) => facetLabelInline(r.facet));
  const bWins = bAhead.slice(0, 3).map((r) => facetLabelInline(r.facet));
  const levelNames = level.slice(0, 3).map((r) => facetLabelInline(r.facet));

  const priceA = priceRangeText(a.priceMin, a.priceMax);
  const priceB = priceRangeText(b.priceMin, b.priceMax);
  const priceLine = startingPriceLine(a, b);
  const sources = a.sourceCount + b.sourceCount;

  const summary = summaryLine(A, B, aWins, bWins);
  const faqs = [
    { q: `Which is better, the ${A} or the ${B}?`, a: `${summary} ${chooseLine(A, B, aWins, bWins)}` },
    ...(priceLine ? [{ q: `Which is cheaper, the ${A} or the ${B}?`, a: priceLine }] : []),
    {
      q: `How did CarDhoondo compare the ${A} and ${B}?`,
      a: `We went through ${sources} owner and expert video reviews of the two cars, tagged every statement by topic, such as mileage or rear seat space, and scored how positive it was. Nobody paid for this comparison and it is not sponsored.`,
    },
  ];

  const pageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${a.name} vs ${secondName(a, b)}: what owners and experts say`,
    url: `${SITE_URL}/compare/${slug}`,
    inLanguage: "en-IN",
    about: [
      { "@type": "Car", name: a.name, brand: { "@type": "Brand", name: a.brand } },
      { "@type": "Car", name: b.name, brand: { "@type": "Brand", name: b.brand } },
    ],
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
        <Breadcrumbs trail={[{ name: "Comparisons", href: "/compare" }, { name: `${A} vs ${B}` }]} />

        <p className="mt-6 font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">Head to head</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-balance text-ink sm:text-4xl">
          {a.name} vs {secondName(a, b)}: what owners and experts say
        </h1>
        <p className="mt-3 text-sm text-ink-faint">
          Based on {a.claimCount + b.claimCount} statements from {sources} owner and expert reviews
        </p>

        <p className="mt-6 text-lg leading-relaxed text-ink-soft">
          {summary} {levelNames.length > 0 && `On ${joinList(levelNames)} there is little to separate them. `}
          {priceLine}
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <caption className="sr-only">
              {a.name} and {b.name} key facts
            </caption>
            <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  <span className="sr-only">Fact</span>
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">{A}</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">{B}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-ink-soft">
              <FactRow label="Ex-showroom price" a={priceA ?? "Not listed"} b={priceB ?? "Not listed"} />
              <FactRow label="Fuel" a={fuelsOf(a) || "n/a"} b={fuelsOf(b) || "n/a"} />
              <FactRow label="Gearbox" a={gearboxesOf(a) || "n/a"} b={gearboxesOf(b) || "n/a"} />
              <FactRow label="Seating" a={a.seating.join(", ") || "n/a"} b={b.seating.join(", ") || "n/a"} />
              <FactRow label="Reviews we read" a={String(a.sourceCount)} b={String(b.sourceCount)} />
            </tbody>
          </table>
        </div>

        {aAhead.length > 0 && (
          <Section title={`Where the ${A} does better`}>
            {aAhead.slice(0, MAX_AHEAD).map((r) => (
              <AheadBlock key={r.facet} row={r} winner={a} loser={b} winnerSide="a" />
            ))}
          </Section>
        )}

        {bAhead.length > 0 && (
          <Section title={`Where the ${B} does better`}>
            {bAhead.slice(0, MAX_AHEAD).map((r) => (
              <AheadBlock key={r.facet} row={r} winner={b} loser={a} winnerSide="b" />
            ))}
          </Section>
        )}

        <Section title="Area by area">
          <p>
            Every area where reviewers said enough about at least one of the two cars. &ldquo;Too few reviews&rdquo; means we
            won&rsquo;t guess.
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <caption className="sr-only">
                {A} and {B} verdicts by area
              </caption>
              <thead className="bg-paper-raised text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Area</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink">{A}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink">{B}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.facet}>
                    <td className="px-4 py-2.5 text-ink">{facetLabel(r.facet)}</td>
                    <td className="px-4 py-2.5">{r.a ? <Verdict score={r.a.score} /> : <NoData />}</td>
                    <td className="px-4 py-2.5">{r.b ? <Verdict score={r.b.score} /> : <NoData />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title={`So, ${A} or ${B}?`}>
          <p>{chooseLine(A, B, aWins, bWins)}</p>
          <p>
            Reviews only tell you how a car has worked out for other people. Whether it suits you depends on your roads, your family
            and your budget. Answer 11 quick questions and we&rsquo;ll match you to the cars with the strongest evidence for how you
            actually drive.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/questionnaire/core-requirements"
              className="inline-flex items-center gap-2 rounded-full bg-accent-rust px-6 py-3 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
            >
              Find my car <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/quotation"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-ink transition hover:border-accent-rust/50"
            >
              Check a dealer quote
            </Link>
          </div>
        </Section>

        <Section title="Read the full reviews">
          <ul className="grid gap-3 sm:grid-cols-2">
            {[a, b].map((c) => (
              <li key={c.carId}>
                <Link
                  href={`/cars/${carIdToSlug(c.carId)}`}
                  className="block rounded-2xl border border-border bg-paper-raised px-4 py-3 transition hover:border-accent-rust/50"
                >
                  <span className="font-display text-base font-bold text-ink">{c.name} review</span>
                  <span className="mt-0.5 block text-xs text-ink-faint">
                    {c.claimCount} statements from {c.sourceCount} reviews
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={`${A} vs ${B} FAQs`}>
          {faqs.map((f) => (
            <div key={f.q} className="mt-5 first:mt-0">
              <h3 className="font-display text-lg font-bold text-ink">{f.q}</h3>
              <p className="mt-1">{f.a}</p>
            </div>
          ))}
        </Section>

        <p className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-ink-faint">
          How this page is made: we collect what real owners and expert reviewers say in published video reviews, tag each statement
          by topic and score how positive or negative it is. A car only counts as doing better in an area when the gap between the
          two verdicts is clear. Nothing here is paid for by manufacturers or dealers. Prices come from CarDekho and can change, so
          confirm with a dealer.
        </p>
      </article>

      <GuideFooter />
    </main>
  );
}

/** Union of both cars' rated areas, shared ones first (biggest gap first), then one-sided ones. */
function buildRows(a: CarPageData, b: CarPageData): AreaRow[] {
  const aBy = new Map(a.facets.map((f) => [f.facet, f]));
  const bBy = new Map(b.facets.map((f) => [f.facet, f]));
  const all = Array.from(new Set([...aBy.keys(), ...bBy.keys()]));
  const rows = all.map((facet) => {
    const fa = aBy.get(facet) ?? null;
    const fb = bBy.get(facet) ?? null;
    return { facet, a: fa, b: fb, gap: fa && fb ? fa.score - fb.score : 0 };
  });
  return rows.sort((x, y) => {
    const xs = x.a && x.b ? 1 : 0;
    const ys = y.a && y.b ? 1 : 0;
    return ys - xs || Math.abs(y.gap) - Math.abs(x.gap) || facetLabel(x.facet).localeCompare(facetLabel(y.facet));
  });
}

function summaryLine(A: string, B: string, aWins: string[], bWins: string[]): string {
  if (aWins.length && bWins.length) {
    return `Owners and experts rate the ${A} better for ${joinList(aWins)}, while the ${B} comes out ahead on ${joinList(bWins)}.`;
  }
  if (aWins.length) return `Reviewers rate the ${A} better for ${joinList(aWins)}, and there is no area where the ${B} is clearly ahead.`;
  if (bWins.length) return `Reviewers rate the ${B} better for ${joinList(bWins)}, and there is no area where the ${A} is clearly ahead.`;
  return `Reviewers rate the ${A} and the ${B} about the same in every area we track, so neither one is clearly better.`;
}

function chooseLine(A: string, B: string, aWins: string[], bWins: string[]): string {
  if (aWins.length && bWins.length) {
    return `Go for the ${A} if ${joinList(aWins.slice(0, 2))} matter most to you. Pick the ${B} if you care more about ${joinList(bWins.slice(0, 2))}.`;
  }
  if (aWins.length) return `If ${joinList(aWins.slice(0, 2))} matter to you, the ${A} is the safer bet. Otherwise it comes down to price, looks and the test drive.`;
  if (bWins.length) return `If ${joinList(bWins.slice(0, 2))} matter to you, the ${B} is the safer bet. Otherwise it comes down to price, looks and the test drive.`;
  return `Since reviewers see them as evenly matched, let price, the variant you can afford and a back-to-back test drive decide.`;
}

/** "The Creta starts at ₹11 lakh and the Seltos at ₹10.99 lakh (ex-showroom), ..." */
function startingPriceLine(a: CarPageData, b: CarPageData): string {
  if (a.priceMin == null || b.priceMin == null) return "";
  const gap = Math.abs(a.priceMin - b.priceMin);
  const base = `The ${a.model} starts at ${formatLakh(a.priceMin)} and the ${b.model} at ${formatLakh(b.priceMin)} ex-showroom`;
  if (gap < 25000) return `${base}, so they cost about the same to get into.`;
  const cheaper = a.priceMin < b.priceMin ? a.model : b.model;
  return `${base}, so the ${cheaper} is about ${formatLakh(gap)} cheaper to start with.`;
}

/** The second car's full name, or just its model when both share a brand. */
function secondName(a: CarPageData, b: CarPageData): string {
  return a.brand === b.brand ? b.model : b.name;
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

function FactRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr>
      <th scope="row" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </th>
      <td className="px-4 py-3 text-ink">{a}</td>
      <td className="px-4 py-3 text-ink">{b}</td>
    </tr>
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

function AheadBlock({
  row,
  winner,
  loser,
  winnerSide,
}: {
  row: AreaRow;
  winner: CarPageData;
  loser: CarPageData;
  winnerSide: "a" | "b";
}) {
  const w = (winnerSide === "a" ? row.a : row.b)!;
  const l = (winnerSide === "a" ? row.b : row.a)!;
  return (
    <div className="mt-6 first:mt-4">
      <h3 className="font-display text-lg font-bold text-ink">{facetLabel(row.facet)}</h3>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-ink">{winner.model}:</span> <Verdict score={w.score} />
        <span className="text-ink">{loser.model}:</span> <Verdict score={l.score} />
      </p>
      {w.quote && <Quote quote={w.quote} car={winner.model} />}
      {l.quote && <Quote quote={l.quote} car={loser.model} />}
    </div>
  );
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
