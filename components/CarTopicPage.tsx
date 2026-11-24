import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";
import DecideCta from "./DecideCta";
import { GuideFooter, GuideNav } from "./GuideLayout";
import { SITE_URL, carIdToSlug } from "../lib/cars/featured";
import { formatLongDate, joinList } from "../lib/cars/format";
import { facetLabel, facetLabelInline } from "../lib/cars/labels";
import { availableTopics } from "../lib/data/fetchCarTopics";
import type { CarTopics, TopicFacet, TopicKind, TopicQuote } from "../lib/data/fetchCarTopics";
import type { PublishedComparison } from "../lib/data/fetchComparisons";
import { verdictPhrase, verdictTone } from "../lib/verdict";

/**
 * One owner-topic page: problems, pros or real mileage for one car. Everything
 * shown is a real remark from a review, with its source; nothing is written by
 * AI. Each page ends in the product (Find my car, Compare my cars).
 */

const MILEAGE_TAG: Record<string, string> = {
  city_mileage_actual: "City",
  highway_mileage_actual: "Highway",
  mileage_vs_claimed_gap: "Claimed vs real",
};

export function topicPath(carId: string, kind: TopicKind): string {
  return `/cars/${carIdToSlug(carId)}/${kind}`;
}

export function topicLinkLabel(kind: TopicKind, model: string, isEv: boolean): string {
  if (kind === "problems") return `${model} problems owners report`;
  if (kind === "pros") return `What owners like about the ${model}`;
  return `${model} ${isEv ? "real range" : "real mileage"}`;
}

export default function CarTopicPage({
  kind,
  topics,
  comparisons,
}: {
  kind: TopicKind;
  topics: CarTopics;
  comparisons: PublishedComparison[];
}) {
  const { car, isEv } = topics;
  const { name, model } = car;
  const slug = carIdToSlug(car.carId);
  const path = topicPath(car.carId, kind);
  const crumb = kind === "problems" ? "Problems" : kind === "pros" ? "Pros" : isEv ? "Real range" : "Real mileage";
  const rivals = comparisons.map((c) => (c.a.carId === car.carId ? c.b : c.a));

  const facets = kind === "mileage" ? [] : (topics[kind] ?? []);
  const mileage = topics.mileage;
  const remarkCount =
    kind === "mileage" ? (mileage?.quoteCount ?? 0) : facets.reduce((s, f) => s + f.matchingClaims, 0);

  const h1 =
    kind === "problems"
      ? `${name} problems: what owners and experts complain about`
      : kind === "pros"
        ? `${name} pros: the good things owners and experts point out`
        : `${name} ${isEv ? "real range" : "real mileage"}: what owners actually get`;

  const top = facets.slice(0, 3).map((f) => facetLabelInline(f.facet));
  const faqs = buildFaqs(kind, topics, top);
  const siblings = availableTopics(topics).filter((k) => k !== kind);

  const pageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: h1,
    url: `${SITE_URL}${path}`,
    inLanguage: "en-IN",
    ...(car.updatedAt ? { dateModified: car.updatedAt } : {}),
    about: { "@type": "Car", name, brand: { "@type": "Brand", name: car.brand } },
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
          <Breadcrumbs trail={[{ name: "Car reviews", href: "/cars" }, { name, href: `/cars/${slug}` }, { name: crumb }]} />
          <p className="mt-6 font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">
            {kind === "mileage" ? (isEv ? "Owner range reports" : "Owner mileage reports") : "Owner and expert reviews"}
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold text-balance text-ink sm:text-4xl">{h1}</h1>
          <p className="mt-3 text-sm text-ink-faint">
            From {remarkCount} {remarkCount === 1 ? "remark" : "remarks"} in real reviews
            {car.updatedAt && (
              <>
                {" "}
                · Updated <time dateTime={car.updatedAt}>{formatLongDate(car.updatedAt)}</time>
              </>
            )}
          </p>
        </div>

        <p className="mt-6 text-lg leading-relaxed text-ink-soft">{intro(kind, topics, top)}</p>

        {kind !== "mileage" && facets.length > 0 && (
          <nav aria-label="On this page" className="mt-6 rounded-2xl border border-border bg-paper-raised px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {kind === "problems" ? "Most reported, first" : "Most praised, first"}
            </p>
            <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {facets.map((f) => (
                <li key={f.facet}>
                  <a href={`#${f.facet}`} className="text-ink underline-offset-2 hover:underline">
                    {facetLabel(f.facet)}
                  </a>{" "}
                  <span className="text-ink-faint">({f.matchingClaims})</span>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {car.onSale ? (
          <DecideCta
            question={rivals[0] ? `${model} or ${rivals[0].model}?` : `${model} or another car?`}
            title={
              kind === "problems"
                ? `Not sure the ${model}'s problems matter for you?`
                : `Weighing the ${model} against another car?`
            }
            sub="Add the cars you're considering, answer 8 quick questions, and see which one suits how you drive."
            carIds={[car.carId]}
            button="Compare with another car"
            rivals={rivals.slice(0, 3).map((r) => ({ carId: r.carId, model: r.model }))}
          />
        ) : (
          <p className="mt-6 rounded-2xl border border-accent-rust/40 px-5 py-4 text-ink-soft">
            <strong className="text-ink">The {name} is no longer sold new in India.</strong> These reviews still help if you are
            looking at a used one.
          </p>
        )}

        {kind !== "mileage" &&
          facets.map((f) => <FacetSection key={f.facet} f={f} kind={kind} />)}

        {kind === "mileage" &&
          mileage?.groups.map((g) => (
            <section key={g.fuel} className="mt-12">
              <h2 className="font-display text-2xl font-bold text-ink">
                {g.fuel === "All versions"
                  ? `${model} ${isEv ? "range" : "mileage"}: all versions`
                  : `${model} ${g.fuel.toLowerCase() === "cng" ? "CNG" : g.fuel.toLowerCase()} ${g.fuel === "Electric" ? "range" : "mileage"}`}
              </h2>
              <p className="mt-2 text-sm text-ink-faint">
                {g.quotes.length} {g.quotes.length === 1 ? "report" : "reports"}, owners first
              </p>
              <div className="mt-2">
                {g.quotes.map((q, i) => (
                  <Quote key={i} q={q} tag={MILEAGE_TAG[q.facet]} showTone />
                ))}
              </div>
            </section>
          ))}

        {kind === "mileage" && (
          <p className="mt-8 rounded-2xl border border-border bg-paper-raised px-5 py-4 text-sm leading-relaxed text-ink-soft">
            {isEv
              ? "Range depends a lot on speed, AC use, weather and how hard you accelerate. Treat these as what real people got, not a promise."
              : "Mileage depends on traffic, driving style, AC use and load. Treat these as what real people got, not a promise. The company's claimed (ARAI) figure is measured in lab conditions and is almost always higher."}
          </p>
        )}

        <Section title={`More on the ${model}`}>
            <ul className="grid gap-3 sm:grid-cols-2">
              <li>
                <CardLink href={`/cars/${slug}`} title={`${name} full review`} sub="Every rated area, with prices and engines" />
              </li>
              {siblings.map((k) => (
                <li key={k}>
                  <CardLink href={topicPath(car.carId, k)} title={topicLinkLabel(k, model, isEv)} sub="In owners' and experts' own words" />
                </li>
              ))}
              {comparisons.slice(0, 4).map((c) => (
                <li key={c.slug}>
                  <CardLink
                    href={`/compare/${c.slug}`}
                    title={`${c.a.model} vs ${c.b.model}`}
                    sub={`Where the ${(c.a.carId === car.carId ? c.b : c.a).model} does better or worse`}
                  />
                </li>
              ))}
            </ul>
          </Section>

        <Section title={`Is the ${model} right for you?`}>
          <p>
            {kind === "problems"
              ? `Whether these problems matter depends on how you drive. Someone in city traffic every day cares about different things than someone on the highway every weekend.`
              : `A car reviewers praise can still be wrong for your roads, family and budget.`}{" "}
            Answer a few quick questions and we&rsquo;ll match you to the cars with the strongest review evidence for the way you
            actually live.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/questionnaire/core-requirements"
              className="inline-flex items-center gap-2 rounded-lg bg-accent-rust px-6 py-3 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
            >
              Find my car <ArrowRight className="h-4 w-4" />
            </Link>
            {car.onSale && (
              <Link
                href={`/decide?cars=${car.carId}`}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-ink transition hover:border-accent-rust/50"
              >
                Compare the {model} with other cars
              </Link>
            )}
          </div>
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
          How this page is made: we collect what real owners and expert reviewers say in published video reviews and forum
          threads, tag each statement by topic and mark it positive or negative. The quotes are their words (translated where the
          review was in Hindi), linked to the moment in the video. Nothing here is paid for by manufacturers or dealers.
        </p>
      </article>

      <GuideFooter />
    </main>
  );
}

function intro(kind: TopicKind, t: CarTopics, top: string[]): string {
  const { model } = t.car;
  if (kind === "problems") {
    return `The most common complaints about the ${model} are about its ${joinList(top)}. Below is every area at least two reviewers criticised, in their own words. Owners come first because they have lived with the car. A complaint here does not mean every ${model} has the problem, so check how many reviews raised it and what the overall verdict is.`;
  }
  if (kind === "pros") {
    return `Owners and experts are most positive about the ${model}'s ${joinList(top)}. Below is every area at least two reviewers praised, in their own words, with owners first. For the other side, see the problems page.`;
  }
  const m = t.mileage!;
  return `Not the company's claimed figure: these are ${m.quoteCount} reports of what people actually got ${t.isEv ? "on a full charge" : "from the tank"}, from ${m.sourceCount} reviews${m.ownerCount ? `, ${m.ownerCount} of them from owners` : ""}. They are grouped by ${t.isEv ? "version" : "fuel"} and tagged city or highway, so find your version and read across.`;
}

function FacetSection({ f, kind }: { f: TopicFacet; kind: TopicKind }) {
  const who = [
    f.ownerClaims ? `${f.ownerClaims} ${f.ownerClaims === 1 ? "owner" : "owners"}` : null,
    f.expertClaims ? `${f.expertClaims} ${f.expertClaims === 1 ? "expert" : "experts"}` : null,
  ]
    .filter(Boolean)
    .join(" and ");
  return (
    <section id={f.facet} className="mt-12 scroll-mt-24">
      <h2 className="font-display text-2xl font-bold text-ink">{facetLabel(f.facet)}</h2>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-faint">
        <span>
          {who} {kind === "problems" ? "criticised this" : "praised this"}, out of {f.totalClaims}{" "}
          {f.totalClaims === 1 ? "review" : "reviews"} that mentioned it.
        </span>
        {f.score !== null && (
          <span className="flex items-center gap-1.5">
            Overall: <Verdict score={f.score} />
          </span>
        )}
      </p>
      <div className="mt-2">
        {f.quotes.map((q, i) => (
          <Quote key={i} q={q} />
        ))}
      </div>
    </section>
  );
}

function Quote({ q, tag, showTone }: { q: TopicQuote; tag?: string; showTone?: boolean }) {
  const meta = [q.sourceType === "ownership" ? "Owner" : "Expert review", q.version, q.context].filter(Boolean).join(" · ");
  return (
    <blockquote className="mt-4 border-l-2 border-accent-rust/60 pl-4 text-ink-soft">
      {(tag || showTone) && (
        <p className="mb-1 flex flex-wrap gap-1.5 text-xs">
          {tag && <span className="rounded-full bg-paper-raised px-2 py-0.5 font-medium text-ink">{tag}</span>}
          {showTone && q.sentiment !== "neutral" && (
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${q.sentiment === "positive" ? "bg-positive-bg text-positive" : "bg-negative-bg text-negative"}`}
            >
              {q.sentiment === "positive" ? "Happy with it" : "Disappointed"}
            </span>
          )}
        </p>
      )}
      <p className="italic">&ldquo;{q.text}&rdquo;</p>
      <footer className="mt-1 text-xs text-ink-faint">
        {meta}
        {q.sourceTitle ? (
          <>
            {" · "}
            {q.url ? (
              <a href={q.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {q.sourceTitle}
              </a>
            ) : (
              q.sourceTitle
            )}
          </>
        ) : null}
      </footer>
    </blockquote>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      <div className="mt-3 leading-relaxed text-ink-soft [&_p]:mb-3">{children}</div>
    </section>
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

function buildFaqs(kind: TopicKind, t: CarTopics, top: string[]): { q: string; a: string }[] {
  const { model, name } = t.car;
  const faqs: { q: string; a: string }[] = [];
  if (kind === "problems") {
    faqs.push({
      q: `What are the common problems with the ${name}?`,
      a: `In owner and expert reviews, the most common complaints about the ${model} are about its ${joinList(top)}.`,
    });
    const rel = (t.problems ?? []).filter((f) => f.theme === "reliability");
    faqs.push({
      q: `Is the ${model} reliable?`,
      a: rel.length
        ? `Some reviewers reported reliability issues, mainly ${joinList(rel.map((f) => facetLabelInline(f.facet)))}. The sections above show how many reviews raised each one.`
        : `Reliability is not among the areas reviewers criticised most for the ${model}. Owner reviews cover only the years people have had the car, so long-term reliability is still worth asking owners about.`,
    });
  } else if (kind === "pros") {
    faqs.push({
      q: `What are the good things about the ${name}?`,
      a: `Owners and experts are most positive about the ${model}'s ${joinList(top)}.`,
    });
  } else {
    faqs.push({
      q: `What is the real ${t.isEv ? "range" : "mileage"} of the ${name}?`,
      a: `It depends on the ${t.isEv ? "version" : "engine"} and how you drive. This page collects ${t.mileage!.quoteCount} reports from owners and testers, grouped by ${t.isEv ? "version" : "fuel"} and tagged city or highway.`,
    });
  }
  faqs.push({
    q: `Should I buy the ${model}?`,
    a: `It depends on how you drive and live. Answer CarDhoondo's quick questions and we will match you to the cars with the strongest review evidence for your situation, or compare the ${model} with the other cars you are considering.`,
  });
  return faqs;
}
