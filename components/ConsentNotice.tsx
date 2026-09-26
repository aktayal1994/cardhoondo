/**
 * The short consent notice shown right above the button on every form that
 * collects name / pincode / phone (the questionnaire intro and the on-road
 * price tool). Wording is versioned in lib/consent.ts -- change the text
 * here and you must bump CURRENT_NOTICE_VERSION. Pressing the button is the
 * consent action, so the button label must say "Agree" (see callers).
 *
 * /terms and /privacy are real pages (app/terms, app/privacy).
 */
export default function ConsentNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-border bg-charcoal-800/40 px-4 py-3 text-xs leading-relaxed text-ink-soft ${className}`}
    >
      <p>
        By tapping <span className="font-semibold text-ink">Agree</span> you confirm you are 18 or older, accept our{" "}
        <a href="/terms" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink">
          Privacy Policy
        </a>
        , and consent to us using your pincode, name and phone number for the purposes described here: your pincode to
        tailor results to your city; your name and phone to get in touch about your recommendations and to ask for your
        feedback so we can improve CarDhoondo.
      </p>
      <p className="mt-1.5">
        We don&apos;t share your details with car dealers. You can withdraw consent or ask us to delete your data any
        time: mycardhoondo@gmail.com.
      </p>
    </div>
  );
}
