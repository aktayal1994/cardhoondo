import Link from "next/link";
import GuideLayout from "./GuideLayout";
import type { CarFacetSummary, CarPageData } from "../lib/data/fetchCarPage";
import { SITE_URL, carIdToSlug } from "../lib/cars/featured";
import { verdictPhrase, verdictTone } from "../lib/verdict";
import { formatOnRoad } from "../lib/format";
import { FAMILY_CHECKS, FAMILY_FAQS, RANKED_GUIDES, type RankedGuide, type RankedGuideCheck } from "../lib/guides/rankedGuides";
import { loadGuidePicks, type CarPick } from "../lib/guides/guidePicks";

/**
 * Renders one entry of lib/guides/rankedGuides.ts: a short answer first (the
 * part AI chats quote), then ranked cars with plain verdicts, the next few
 * that came close, then the questions people ask next. The page sets metadata
 * and `revalidate`; the picks come from lib/guides/guidePicks.ts.
 */
function facetOf(page: CarPageData, facet: string): CarFacetSummary | undefined {
  return page.facets.find((f) => f.facet === facet);
}

/** The pick owners rate best on one facet (5+ reviews so it is not one opinion). */
function bestOn(picks: CarPick[], facet: string): { pick: CarPick; f: CarFacetSummary } | null {
  let best: { pick: CarPick; f: CarFacetSummary } | null = null;
  for (const pick of picks) {
    const f = facetOf(pick.page, facet);
    if (!f || f.claimCount < 5 || f.score < 0.2) continue;
    if (!best || f.score > best.f.score || (f.score === best.f.score && f.claimCount > best.f.claimCount)) best = { pick, f };
  }
  return best;
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export default async function RankedGuidePage({ guide }: { guide: RankedGuide }) {
  const { slug, title, published } = guide;
  const checks = guide.checks ?? FAMILY_CHECKS;
  const { picks, close } = await loadGuidePicks(guide);
  const top3 = picks.slice(0, 3).map((p) => p.name);
  const totalSources = picks.reduce((n, p) => n + p.page.sourceCount, 0);
  const updated = picks
    .map((p) => p.page.updatedAt)
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  // Never earlier than the day the guide went live.
  const dateModified = updated && updated.slice(0, 10) > published ? updated.slice(0, 10) : published;

  const shortAnswer = `${guide.lead}, the ${listNames(top3)} come out best on what owners and expert reviewers actually say about ${guide.judgedOn}.`;

  const faqs: { q: string; a: string }[] = [{ q: guide.bestQuestion, a: shortAnswer }];
  for (const faq of guide.faqs ?? FAMILY_FAQS) {
    const best = bestOn(picks, faq.facet);
    if (!best) continue;
    faqs.push({
      q: `Which ${guide.which} ${faq.ask}?`,
      a: `Of the cars on this list, owners rate the ${best.pick.name} best on ${faq.label}: ${verdictPhrase(best.f.score).toLowerCase()}, based on ${best.f.claimCount} reviews.`,
    });
  }
  faqs.push(
    {
      q: "How did CarDhoondo pick these cars?",
      a: `We read owner and expert reviews of every car on sale, sort each opinion into topics like back seat room or ride comfort, and score the cars on the topics that matter to ${guide.audience}. Nobody pays us to rank a car, and dealers and manufacturers have no say.`,
    },
    {
      q: "Are these prices on-road?",
      a: "Yes. Each price is the on-road price in New Delhi for the variant named. On-road prices change from city to city because of road tax, so check your own city's price before you visit a dealer.",
    },
  );

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: title,
      itemListElement: picks.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        url: `${SITE_URL}/cars/${carIdToSlug(p.page.carId)}`,
      })),
    },
  ];

  return (
    <GuideLayout
      eyebrow={guide.eyebrow}
      title={title}
      slug={slug}
      datePublished={published}
      dateModified={dateModified}
      dek={`No sponsored picks. These cars are ranked on what real owners and expert reviewers say about the things ${guide.audience} lives with every day.`}
    >
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-10 rounded-2xl border border-accent-rust/40 bg-paper-raised p-6">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">Short answer</p>
        <p className="mt-2 leading-relaxed text-ink">{shortAnswer}</p>
        <p className="mt-3 text-sm text-ink-faint">
          Based on {totalSources} independent owner and expert reviews of these {picks.length} cars. Updated daily as
          new reviews come in.
        </p>
      </div>

      <h2>
        The {picks.length} best {guide.listHeading}
      </h2>
      <p>
        Every car below has an on-road price of {guide.budgetPhrase} in at least one variant. For each one we show how
        owners and reviewers rate the {checks.length} things that matter most here. Where there are too few reviews to
        say, we tell you instead of guessing.
      </p>

      {/* Wrapped so the guide prose styles (numbered markers) skip this list: each card shows its own rank. */}
      <div>
        <ol className="mt-6 space-y-6">
          {picks.map((p, i) => (
            <CarCard key={p.page.carId} pick={p} rank={i + 1} checks={checks} />
          ))}
        </ol>
      </div>

      {close.length > 0 && (
        <>
          <h2>
            {close.length} more that came close
          </h2>
          <p>
            These scored just below the top {picks.length} for {guide.audience}. Each one is still worth a look if it
            suits you better on the point named.
          </p>
          <ul>
            {close.map((p) => (
              <CloseCar key={p.page.carId} pick={p} checks={checks} />
            ))}
          </ul>
        </>
      )}

      <h2>How we picked these</h2>
      <p>
        We ran our own recommender with the answers {guide.audience} typically gives: {guide.profile}. It is the same
        scoring a visitor gets when they take the questionnaire.
      </p>
      <p>
        The scores come from opinions in owner and expert reviews, each one sorted into a topic such as back seat room
        or ride comfort. A car with only a handful of opinions on a topic is not allowed to win on it. We are not paid
        by any dealer or manufacturer, and nobody can buy a place on this list.
      </p>
      <p>
        Your situation might not be typical. If you drive mostly on highways, have parents riding in the back, or care
        more about features than running costs, the right car changes. That is what the{" "}
        <Link href="/questionnaire/core-requirements">11-question match</Link> is for.
      </p>

      <h2>Common questions</h2>
      {faqs.slice(1).map((f) => (
        <div key={f.q} className="mb-6">
          <h3 className="font-display text-lg font-bold text-ink">{f.q}</h3>
          <p className="mt-2 leading-relaxed text-ink-soft">{f.a}</p>
        </div>
      ))}

      <h2>More shortlists built the same way</h2>
      <ul>
        {RANKED_GUIDES.filter((g) => g.slug !== slug).map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="text-accent-rust-soft underline underline-offset-2">
              {g.indexTitle}
            </Link>
          </li>
        ))}
      </ul>
    </GuideLayout>
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

/** One line for a car just outside the main list: price, then its best and worst point among this guide's checks. */
function CloseCar({ pick, checks }: { pick: CarPick; checks: RankedGuideCheck[] }) {
  const { candidate, page, name } = pick;
  const rated = checks
    .map((c) => ({ label: c.label.toLowerCase(), f: facetOf(page, c.facet) }))
    .filter((x): x is { label: string; f: CarFacetSummary } => !!x.f && x.f.claimCount >= 3);
  const best = rated.filter((x) => x.f.score >= 0.2).sort((a, b) => b.f.score - a.f.score)[0];
  const worst = rated.filter((x) => x.f.score <= -0.2).sort((a, b) => a.f.score - b.f.score)[0];
  return (
    <li>
      <Link href={`/cars/${carIdToSlug(page.carId)}`} className="font-semibold text-accent-rust-soft underline underline-offset-2">
        {name}
      </Link>
      : {candidate.variant_id},{" "}
      {formatOnRoad(candidate.price_on_road, candidate.price_city ?? null, candidate.price_basis ?? null)}.
      {best && ` Reviewers are ${verdictPhrase(best.f.score).toLowerCase()} about its ${best.label}`}
      {best && worst && `, and ${verdictPhrase(worst.f.score).toLowerCase()} about its ${worst.label}`}
      {!best && worst && ` Reviewers are ${verdictPhrase(worst.f.score).toLowerCase()} about its ${worst.label}`}
      {(best || worst) && "."}
    </li>
  );
}

function CarCard({ pick, rank, checks }: { pick: CarPick; rank: number; checks: RankedGuideCheck[] }) {
  const { candidate, page, name } = pick;
  const href = `/cars/${carIdToSlug(page.carId)}`;
  // A quote on the first topic this guide checks that has one, else the car's strongest praise.
  const quote =
    checks.map((c) => facetOf(page, c.facet)?.quote).find((q) => q) ?? page.likes.find((l) => l.quote)?.quote ?? null;

  return (
    <li className="rounded-2xl border border-border bg-paper-raised p-5 sm:p-6">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-2xl font-bold text-accent-rust">{rank}</span>
        <h3 className="font-display text-xl font-bold text-ink">
          <Link href={href} className="hover:underline">
            {name}
          </Link>
        </h3>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Variant to look at: <span className="font-medium text-ink">{candidate.variant_id}</span>,{" "}
        {formatOnRoad(candidate.price_on_road, candidate.price_city ?? null, candidate.price_basis ?? null)}
      </p>
      <p className="mt-1 text-xs text-ink-faint">Based on {page.sourceCount} owner and expert reviews</p>

      <dl className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {checks.map((c) => {
          const f = facetOf(page, c.facet);
          return (
            <div key={c.facet} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
              <dt className="text-sm text-ink-soft">{c.label}</dt>
              <dd className="text-right">
                {f ? (
                  <span className="inline-flex items-center gap-2">
                    <Verdict score={f.score} />
                    <span className="text-xs text-ink-faint">{f.claimCount}</span>
                  </span>
                ) : (
                  <span className="text-xs text-ink-faint">Not enough reviews yet</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-2 text-xs text-ink-faint">The small number is how many reviews mention it.</p>

      {quote && (
        <blockquote className="mt-4 border-l-2 border-accent-rust/60 pl-4 text-sm text-ink-soft">
          <p className="italic">&ldquo;{quote.text}&rdquo;</p>
          <footer className="mt-1 text-xs text-ink-faint">
            {quote.sourceType === "ownership" ? "Owner review" : "Expert review"}
          </footer>
        </blockquote>
      )}

      <Link href={href} className="mt-4 inline-block text-sm font-semibold text-accent-rust-soft hover:underline">
        Full {page.model} review &rarr;
      </Link>
    </li>
  );
}
