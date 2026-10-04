import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";
import MobileMenu from "./MobileMenu";

/**
 * Shared chrome for /guides/* content pages. Distinct from LandingScreen's
 * Nav/Footer because guide pages are real routes (not the homepage SPA) --
 * "Find my car" is a plain link to /questionnaire/core-requirements (the
 * flow's first question step) here, not a client callback, and nav links
 * point back to homepage anchors via "/".
 */
const SITE_URL = "https://cardhoondo.com";

/** Every guide is written and maintained by the founder; the byline and the
 * Article structured data must say the same thing. */
const AUTHOR_NAME = "Aakash Tayal";

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function GuideLayout({
  eyebrow,
  title,
  dek,
  slug,
  datePublished,
  dateModified,
  heroImage,
  children,
}: {
  eyebrow: string;
  title: string;
  dek: string;
  slug: string;
  /** ISO date (YYYY-MM-DD) the guide first went live. */
  datePublished: string;
  /** ISO date (YYYY-MM-DD) of the last real content change. */
  dateModified: string;
  heroImage?: { src: string; alt: string; width: number; height: number };
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: dek,
    image: `${SITE_URL}${heroImage ? heroImage.src : "/og-image.png"}`,
    datePublished,
    dateModified,
    author: { "@type": "Person", name: AUTHOR_NAME },
    publisher: {
      "@type": "Organization",
      name: "CarDhoondo",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/cardhoondo-logo.png` },
    },
    inLanguage: "en-IN",
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/guides/${slug}` },
  };

  return (
    <main className="min-h-screen bg-paper">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GuideNav />
      {heroImage && (
        <div className="mx-auto max-w-5xl px-6 pt-8">
          <Image
            src={heroImage.src}
            alt={heroImage.alt}
            width={heroImage.width}
            height={heroImage.height}
            priority
            className="w-full rounded-2xl border border-border object-cover"
          />
        </div>
      )}
      <article className="mx-auto max-w-2xl px-6 py-14">
        <Breadcrumbs trail={[{ name: "Guides", href: "/guides" }, { name: title }]} />
        <p className="mt-6 font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">{eyebrow}</p>
        {/* The hero image already carries the headline as baked-in text for
            readers -- this h1 stays in the DOM (visually hidden) so search
            engines and screen readers still get a real, crawlable heading,
            since text inside an image isn't either of those. */}
        <h1
          className={`mt-3 font-display text-3xl font-bold text-balance text-ink sm:text-4xl ${
            heroImage ? "sr-only" : ""
          }`}
        >
          {title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{dek}</p>
        <p className="mt-4 text-sm text-ink-faint">
          By <span className="font-medium text-ink-soft">{AUTHOR_NAME}</span> · Published{" "}
          <time dateTime={datePublished}>{formatDate(datePublished)}</time>
          {dateModified !== datePublished && (
            <>
              {" "}
              · Updated <time dateTime={dateModified}>{formatDate(dateModified)}</time>
            </>
          )}
        </p>
        <div className="prose-guide mt-10">{children}</div>
        <BottomCta />
      </article>
      <GuideFooter />
    </main>
  );
}

export function GuideNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="CarDhoondo home">
          <Image src="/cardhoondo-icon.png" alt="" width={237} height={237} className="h-8 w-8" />
          <span className="font-display text-base font-bold text-ink">CarDhoondo</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft sm:flex">
          <Link href="/cars" className="transition hover:text-ink">
            Car reviews
          </Link>
          <Link href="/guides" className="transition hover:text-ink">
            Guides
          </Link>
          <Link href="/quotation" className="transition hover:text-ink">
            Check my quote
          </Link>
          <Link href="/#why-cardhoondo" className="transition hover:text-ink">
            Why CarDhoondo
          </Link>
          <Link href="/#faq" className="transition hover:text-ink">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-1">
          <Link
            href="/questionnaire/core-requirements"
            className="hidden rounded-full bg-accent-rust px-5 py-2.5 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98] sm:inline-flex"
          >
            Find my car
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

function BottomCta() {
  return (
    <div className="mt-14 rounded-2xl border border-border bg-stage p-8 text-center">
      <p className="font-display text-xl font-bold text-stage-ink">
        Still not sure? Tell us how you actually drive.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stage-ink-soft">
        11 quick questions, no signup — we&apos;ll match your answers against real ownership and expert
        review evidence and hand you 2–3 cars that genuinely fit, not a list of fifty.
      </p>
      <Link
        href="/questionnaire/core-requirements"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent-rust px-6 py-3 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
      >
        Find my car <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function GuideFooter() {
  return (
    <footer className="bg-stage py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div>
          <div className="flex items-center justify-center gap-2.5 sm:justify-start">
            <Image src="/cardhoondo-icon.png" alt="" width={237} height={237} className="h-7 w-7" />
            <p className="font-display text-base font-bold text-stage-ink">CarDhoondo</p>
          </div>
          <p className="mt-2 max-w-xs text-sm text-stage-ink-soft">
            No dealer commissions. No sponsored results. Just the car that fits your life.
          </p>
        </div>

        <nav className="flex items-center gap-6 text-sm font-medium text-stage-ink-soft">
          <Link href="/#faq" className="transition hover:text-stage-ink">
            FAQ
          </Link>
          <Link href="/cars" className="transition hover:text-stage-ink">
            Car reviews
          </Link>
          <Link href="/guides" className="transition hover:text-stage-ink">
            Guides
          </Link>
          <Link href="/#contact" className="transition hover:text-stage-ink">
            Contact
          </Link>
        </nav>

        <p className="text-xs text-stage-ink-soft">
          &copy; {new Date().getFullYear()} CarDhoondo · Made for car buyers across India
        </p>
      </div>
    </footer>
  );
}
