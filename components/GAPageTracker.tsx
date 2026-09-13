"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "../lib/analytics";

/**
 * The questionnaire moved from one client-state SPA page to 4 real routes
 * (/questionnaire/intro -> core-requirements -> everyday-driving ->
 * what-matters -> /results), but gtag's base install only ever fires an
 * automatic page_view on the very first full page load -- Next.js
 * client-side navigation between those routes never triggers another one.
 * Every step past the landing page was invisible to GA4 until this
 * existed. send_page_view is disabled in the base gtag config (see
 * app/layout.tsx) so this is the ONLY source of page_view events, avoiding
 * a double-count on first load.
 */
function PageTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    trackEvent("page_view", {
      page_path: query ? `${pathname}?${query}` : pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams.toString()]);

  return null;
}

export default function GAPageTracker() {
  return (
    <Suspense fallback={null}>
      <PageTrackerInner />
    </Suspense>
  );
}
