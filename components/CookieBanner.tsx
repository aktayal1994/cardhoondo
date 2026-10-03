"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CONSENT_CHANGED_EVENT,
  OPEN_SETTINGS_EVENT,
  clearAnalyticsCookies,
  getCookieChoice,
  loadAnalytics,
  setCookieChoice,
  type CookieChoice,
} from "../lib/cookieConsent";
import { trackEvent } from "../lib/analytics";

/**
 * Analytics settings panel. Since 3 Oct 2026 analytics is on by default and
 * this panel never pops up on its own (almost no ad visitor pressed Accept,
 * so GA counted nothing). It opens only from a "Cookie settings" link (see
 * CookieSettingsButton). "Turn off" deletes any analytics cookies already set
 * and stops all tracking; a Reject made under the old banner still counts.
 */
export default function CookieBanner() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<CookieChoice>(null);

  useEffect(() => {
    const current = getCookieChoice();
    setChoice(current);
    if (current === "denied") clearAnalyticsCookies();
    else loadAnalytics();

    const onChanged = () => setChoice(getCookieChoice());
    const onOpen = () => setOpen(true);
    window.addEventListener(CONSENT_CHANGED_EVENT, onChanged);
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, onChanged);
      window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
    };
  }, []);

  function accept() {
    const wasOff = choice === "denied";
    setCookieChoice("granted");
    loadAnalytics();
    // The page_view for the page they are already on was skipped while
    // analytics was off, so send it now.
    if (wasOff) {
      trackEvent("page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
    setOpen(false);
  }

  function reject() {
    setCookieChoice("denied");
    clearAnalyticsCookies();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      role="region"
      aria-label="Cookie choice"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-2xl border border-border bg-paper-raised p-4 shadow-card sm:inset-x-auto sm:right-4 sm:bottom-4 sm:mx-0"
    >
      <p className="text-sm leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">Analytics cookies.</span> We use Google Analytics cookies to see
        which pages people use, so we can improve CarDhoondo. You can turn them off, and the site works the same either
        way.{" "}
        <a href="/privacy#8-cookies-and-similar-technologies" className="underline underline-offset-2 hover:text-ink">
          Details
        </a>
      </p>
      <p className="mt-1.5 text-xs text-ink-faint">
        Analytics is currently {choice === "denied" ? "off" : "on"}.
      </p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={accept}
          className="flex-1 rounded-full bg-accent-rust px-5 py-2.5 text-sm font-semibold text-stage transition hover:brightness-110 active:scale-[0.98]"
        >
          Keep analytics on
        </button>
        <button
          type="button"
          onClick={reject}
          className="flex-1 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-accent-rust/60 active:scale-[0.98]"
        >
          Turn off
        </button>
      </div>
    </div>
  );
}

/** A small link-style button that reopens the banner. Put it in footers. */
export function CookieSettingsButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
      className={className}
    >
      Cookie settings
    </button>
  );
}
