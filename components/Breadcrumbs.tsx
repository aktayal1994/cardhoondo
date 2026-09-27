import Link from "next/link";

const SITE_URL = "https://cardhoondo.com";

export interface Crumb {
  name: string;
  /** Path such as "/guides". Omit on the last crumb (the current page). */
  href?: string;
}

/**
 * The visible "Home › Guides › This page" trail plus the matching
 * BreadcrumbList structured data. Google can show the trail in place of the
 * raw URL in search results, and the links help both readers and crawlers
 * move up a level. The first crumb is always Home; pass the rest.
 */
export default function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const items: Crumb[] = [{ name: "Home", href: "/" }, ...trail];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      // The last item may omit `item` (Google reads it as the current page),
      // but giving it explicitly is also valid, so only skip when unknown.
      ...(c.href !== undefined ? { item: `${SITE_URL}${c.href === "/" ? "" : c.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-xs text-ink-faint">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {items.map((c, i) => {
            const last = i === items.length - 1;
            return (
              <li key={`${c.name}-${i}`} className="flex items-center gap-2">
                {c.href !== undefined && !last ? (
                  <Link href={c.href} className="transition hover:text-ink">
                    {c.name}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined} className={last ? "text-ink-soft" : undefined}>
                    {c.name}
                  </span>
                )}
                {!last && <span aria-hidden="true">›</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
