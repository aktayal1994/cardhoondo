"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * The short consent notice shown right above the button on every form that
 * collects name / pincode / phone (the questionnaire intro and the dealer-quote
 * check). Collapsed by default to a single line; "Details" expands the
 * full itemised text. The two versions must say the same thing -- the
 * collapsed line is a summary, the expanded text is the itemised notice.
 *
 * Wording is versioned in lib/consent.ts -- change ANY of the text here and
 * you must bump CURRENT_NOTICE_VERSION. Pressing the button is the consent
 * action, so the button label must say "Agree" (see callers).
 *
 * /terms and /privacy are real pages (app/terms, app/privacy).
 */
export default function ConsentNotice({ className = "" }: { className?: string }) {
  const [expanded, setExpanded] = useState(false);

  const linkClass = "underline underline-offset-2 hover:text-ink";

  return (
    <div
      className={`rounded-xl border border-border bg-charcoal-800/40 px-4 py-2.5 text-xs leading-relaxed text-ink-soft ${className}`}
    >
      <p>
        By tapping <span className="font-semibold text-ink">Agree</span> you accept our{" "}
        <a href="/terms" target="_blank" rel="noopener" className={linkClass}>
          Terms
        </a>{" "}
        &amp;{" "}
        <a href="/privacy" target="_blank" rel="noopener" className={linkClass}>
          Privacy Policy
        </a>
        .{" "}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="consent-notice-details"
          className="inline-flex items-center gap-0.5 font-semibold text-accent-rust-soft hover:text-ink"
        >
          {expanded ? "Less" : "Details"}
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} strokeWidth={2.25} />
        </button>
      </p>

      {expanded && (
        <div id="consent-notice-details" className="mt-2 space-y-1.5 border-t border-border pt-2">
          <p>
            You confirm you are 18 or older, and you consent to us using your{" "}
            <span className="font-medium text-ink">pincode</span> to tailor results to your city, and your{" "}
            <span className="font-medium text-ink">name and phone number</span> to get in touch about your
            recommendations or dealer-quote check and to ask for your feedback so we can improve CarDhoondo.
          </p>
          <p>
            We don&apos;t share your details with car dealers. You can withdraw consent or ask us to delete your data
            any time: mycardhoondo@gmail.com.
          </p>
        </div>
      )}
    </div>
  );
}
