import type { Metadata } from "next";
import Link from "next/link";
import GuideLayout from "../../../components/GuideLayout";
import { pageMetadata } from "../../../lib/seo";
import { SITE_URL, carIdToSlug } from "../../../lib/cars/featured";
import { facetLabel, facetLabelInline, themeLabel } from "../../../lib/cars/labels";
import study from "../../../lib/studies/ownerComplaints.json";

/**
 * Data study meant to be cited and linked to: what owners and expert reviewers
 * criticise across every review CarDhoondo has read. Numbers are a dated
 * snapshot (scripts/build_complaints_study.mjs -> lib/studies/ownerComplaints.json),
 * so quoted figures never shift under someone who cited them. Refresh by
 * re-running the script and bumping DATE_MODIFIED.
 */
const SLUG = "what-indian-car-owners-complain-about";
const DATE_PUBLISHED = "2026-11-24";
const DATE_MODIFIED = "2026-11-24";

const T = study.totals;
const fmt = (n: number) => n.toLocaleString("en-IN");
const pct = (x: number) => `${Math.round(x * 100)}%`;

const TITLE = `What Indian Car Owners Complain About: ${fmt(T.statements)} Review Statements Analysed`;
const SEO_TITLE = "What Car Owners in India Complain About (2026 Study)";
const DESCRIPTION = `We read ${fmt(T.sources)} owner and expert reviews of ${T.cars} cars. Owners complain most about build quality, glitchy tech and reliability; experts about power and mileage.`;

export const metadata: Metadata = pageMetadata({
  title: SEO_TITLE,
  description: DESCRIPTION,
  path: `/guides/${SLUG}`,
  type: "article",
});

// Chart colours: the site's denim for owners (and single-series charts), a
// validated orange for experts (dataviz validator: CVD dE 25.5, normal dE 34.4
// on white; below 3:1 contrast, so every bar carries its value as text).
const OWNER = "#27548a";
const EXPERT = "#e07b39";

export default function Page() {
  const biggestGap = study.themes[0];
  const expertHarsher = [...study.themes].sort((a, b) => b.experts - b.owners - (a.experts - a.owners))[0];
  const bestBrand = study.brands[0];
  const worstBrand = study.brands[study.brands.length - 1];
  const mostCommon = study.commonComplaints[0];

  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "What Indian car owners complain about (CarDhoondo review study)",
    description: `${fmt(T.statements)} statements from ${fmt(T.sources)} owner and expert car reviews of ${T.cars} cars sold in India, each tagged by topic and marked positive or negative.`,
    url: `${SITE_URL}/guides/${SLUG}`,
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_MODIFIED,
    creator: { "@type": "Organization", name: "CarDhoondo", url: SITE_URL },
    license: "https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree: true,
    spatialCoverage: "India",
  };

  return (
    <GuideLayout
      eyebrow="CarDhoondo study"
      title={TITLE}
      slug={SLUG}
      datePublished={DATE_PUBLISHED}
      dateModified={DATE_MODIFIED}
      dek={`We read ${fmt(T.sources)} owner and expert reviews of ${T.cars} cars sold in India and sorted ${fmt(T.statements)} statements by what they praise and what they criticise. Here is what people who live with these cars actually complain about.`}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />

      <h2>Key findings</h2>
      <ul>
        <li>
          <strong>Owners and experts complain about different things.</strong> Owners are harsher than expert reviewers on{" "}
          {themeLabel(biggestGap.theme).toLowerCase()} ({pct(biggestGap.owners)} of owner remarks critical, against{" "}
          {pct(biggestGap.experts)} from experts), build quality and reliability. Experts are harsher on{" "}
          {themeLabel(expertHarsher.theme).toLowerCase()} ({pct(expertHarsher.experts)} against {pct(expertHarsher.owners)}).
        </li>
        <li>
          <strong>
            Remarks about {facetLabelInline(study.worstTopics[0].facet)} are the most critical of any topic:{" "}
            {pct(study.worstTopics[0].share)} are negative.
          </strong>{" "}
          Next come {facetLabelInline(study.worstTopics[1].facet)} ({pct(study.worstTopics[1].share)}) and{" "}
          {facetLabelInline(study.worstTopics[2].facet)} ({pct(study.worstTopics[2].share)}).
        </li>
        <li>
          <strong>{facetLabel(mostCommon.facet)} is the single most common complaint,</strong> with {fmt(mostCommon.negative)}{" "}
          critical remarks.
        </li>
        <li>
          <strong>Breakdowns and routine service bills are rarely the problem.</strong> Only{" "}
          {pct(study.bestTopics.find((b) => b.facet === "breakdown_frequency")?.share ?? 0)} of remarks about breakdowns and{" "}
          {pct(study.bestTopics.find((b) => b.facet === "routine_service_cost")?.share ?? 0)} about routine service cost are
          critical.
        </li>
        <li>
          <strong>Service and reliability complaints vary a lot by brand:</strong> {pct(bestBrand.share)} of {bestBrand.brand}{" "}
          remarks on these topics are critical, against {pct(worstBrand.share)} for {worstBrand.brand}.
        </li>
      </ul>

      <h2>Owners vs expert reviewers: who complains about what</h2>
      <p>
        Expert reviewers usually drive a car for a few days. Owners live with it for months or years. That difference shows up
        clearly in what each group criticises. Each pair of bars below is the share of remarks on that topic that are critical.
      </p>
      <Legend />
      <div className="not-prose mt-4 space-y-4">
        {study.themes.map((t) => (
          <div key={t.theme}>
            <p className="text-sm font-medium text-ink">{themeLabel(t.theme)}</p>
            <Bar value={t.owners} color={OWNER} label={`${pct(t.owners)} owners`} title={`Owners: ${pct(t.owners)} of ${fmt(t.ownersRated)} remarks critical`} />
            <Bar value={t.experts} color={EXPERT} label={`${pct(t.experts)} experts`} title={`Experts: ${pct(t.experts)} of ${fmt(t.expertsRated)} remarks critical`} />
          </div>
        ))}
      </div>
      <p className="mt-6">
        The pattern is consistent: what goes wrong slowly (rattles, glitchy screens, reliability) shows up in owner reviews, while
        what a short drive reveals (power, mileage on a test loop) shows up in expert reviews. If you only watch launch reviews,
        you are hearing about the second group.
      </p>

      <h2>The topics people criticise most</h2>
      <p>
        Share of remarks on each topic that are critical, counting only topics with at least {study.thresholds.MIN_FACET} rated
        remarks. Under each, one owner in their own words.
      </p>
      <div className="not-prose mt-4 space-y-5">
        {study.worstTopics.map((t) => (
          <div key={t.facet}>
            <p className="text-sm font-medium text-ink">{facetLabel(t.facet)}</p>
            <Bar value={t.share} color={OWNER} label={pct(t.share)} title={`${pct(t.share)} of ${fmt(t.rated)} remarks critical`} />
            {t.quote && (
              <blockquote className="mt-2 border-l-2 border-accent-rust/60 pl-3 text-sm text-ink-soft">
                <span className="italic">&ldquo;{t.quote.text}&rdquo;</span>{" "}
                <a href={t.quote.url} target="_blank" rel="noopener noreferrer" className="text-xs text-ink-faint underline underline-offset-2">
                  {t.quote.car} owner
                </a>
              </blockquote>
            )}
          </div>
        ))}
      </div>

      <h2>What people rarely complain about</h2>
      <p>The topics with the smallest share of critical remarks. Good news for anyone worried about highway trips or service bills.</p>
      <div className="not-prose mt-4 space-y-3">
        {study.bestTopics.map((t) => (
          <div key={t.facet}>
            <p className="text-sm font-medium text-ink">{facetLabel(t.facet)}</p>
            <Bar value={t.share} color={OWNER} label={pct(t.share)} title={`${pct(t.share)} of ${fmt(t.rated)} remarks critical`} />
          </div>
        ))}
      </div>

      <h2>Service and reliability complaints by brand</h2>
      <p>
        Share of critical remarks about reliability, service cost and the dealer experience, for brands with at least{" "}
        {study.thresholds.MIN_BRAND_SERVICE} such remarks. Lower is better. The number of reviews behind each brand is shown,
        because a brand with few reviews can move a lot when more come in.
      </p>
      <div className="not-prose mt-4 space-y-3">
        {study.brands.map((b) => (
          <div key={b.brand}>
            <p className="text-sm font-medium text-ink">
              {b.brand} <span className="font-normal text-ink-faint">· {fmt(b.rated)} remarks from {b.sources} reviews</span>
            </p>
            <Bar value={b.share} color={OWNER} label={pct(b.share)} title={`${b.brand}: ${pct(b.share)} of ${fmt(b.rated)} remarks critical`} />
          </div>
        ))}
      </div>

      <h2>Most and least criticised cars</h2>
      <p>
        Share of all rated remarks that are critical, for cars on sale with at least {study.thresholds.MIN_CAR} rated remarks and{" "}
        {study.thresholds.MIN_CAR_OWNER} from owners. Cars reviewed only around their launch are left out, because launch reviews
        run kinder than owners do. A high share is not a verdict on the whole car: off-roaders like the Thar and Gurkha, for
        example, are criticised for on-road comfort their buyers often accept.
      </p>
      <div className="not-prose mt-4 grid gap-6 sm:grid-cols-2">
        <CarList title="Most criticised" cars={study.mostCriticisedCars} />
        <CarList title="Least criticised" cars={study.leastCriticisedCars} />
      </div>
      <p className="mt-4 text-sm text-ink-faint">Out of {study.carsCounted} cars that met the bar.</p>

      <h2>How we did this</h2>
      <p>
        CarDhoondo collects owner and expert reviews from YouTube, plus a few forum threads. Every statement about a car is tagged
        with one of 51 topics (such as rear seat space or service cost) and marked positive, negative or neutral. This study
        counts {fmt(T.statements)} statements ({fmt(T.ownerStatements)} from owners, {fmt(T.expertStatements)} from experts) from{" "}
        {fmt(T.sources)} reviews of {T.cars} cars. A topic&rsquo;s &ldquo;share critical&rdquo; is its negative statements divided
        by its positive plus negative ones; neutral remarks are left out.
      </p>
      <p>
        Videos marked as paid or sponsored by a manufacturer are excluded. Nothing here is paid for by manufacturers or dealers.
        This measures what reviewers say, not how often a part fails: a topic people care about gets talked about more, in both
        directions. Figures are a snapshot taken on{" "}
        {new Date(`${study.generatedAt}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}.
      </p>

      <h2>Use these numbers</h2>
      <p>
        Journalists, creators and researchers are welcome to quote this study and use the charts. Please credit{" "}
        <strong>CarDhoondo</strong> and link to this page:{" "}
        <a href={`${SITE_URL}/guides/${SLUG}`}>
          {SITE_URL.replace("https://", "")}/guides/{SLUG}
        </a>
        . For the underlying numbers or a question about the method, email mycardhoondo@gmail.com.
      </p>
      <p>
        Looking at one car? Every car we cover has its own <Link href="/cars">owner review page</Link>, with problems, pros and
        real mileage in owners&rsquo; own words.
      </p>
    </GuideLayout>
  );
}

function Legend() {
  return (
    <div className="not-prose mt-4 flex gap-5 text-sm text-ink-soft" aria-hidden="true">
      <span className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: OWNER }} /> Owners
      </span>
      <span className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: EXPERT }} /> Expert reviewers
      </span>
    </div>
  );
}

/** One horizontal bar: 0-100% scale, value as text beside it (never colour alone). */
function Bar({ value, color, label, title }: { value: number; color: string; label: string; title: string }) {
  return (
    <div className="mt-1 flex items-center gap-3" title={title}>
      <div className="relative h-3.5 flex-1 rounded-r bg-paper-raised" role="img" aria-label={title}>
        <div className="absolute inset-y-0 left-0 rounded-r" style={{ width: `${Math.max(1, value * 100)}%`, background: color }} />
      </div>
      <span className="w-24 shrink-0 text-right text-xs tabular-nums text-ink-soft">{label}</span>
    </div>
  );
}

function CarList({ title, cars }: { title: string; cars: { carId: string; name: string; share: number; rated: number }[] }) {
  return (
    <div>
      <p className="font-display text-base font-bold text-ink">{title}</p>
      <ol className="mt-2 divide-y divide-border rounded-2xl border border-border">
        {cars.map((c) => (
          <li key={c.carId} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <Link href={`/cars/${carIdToSlug(c.carId)}`} className="text-ink underline-offset-2 hover:underline">
              {c.name}
            </Link>
            <span className="shrink-0 tabular-nums text-ink-soft" title={`${Math.round(c.share * 100)}% of ${c.rated} remarks critical`}>
              {Math.round(c.share * 100)}% critical
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
