"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { setSaveIntent } from "../lib/auth/pendingClaim";
import { trackEvent } from "../lib/analytics";

/**
 * Google sign-in sheet. Bottom sheet on phones, centred dialog on larger
 * screens. Signing in is always optional and never blocks the recommendation.
 * Starting Google sign-in is a full-page navigation to /auth/google (the flow
 * runs on the server), so nothing about the user is handled in this component.
 */

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function AuthSheet({
  open,
  onClose,
  next = "/",
  personaTitle,
  saveIntent = false,
  heading = "Save your searches",
}: {
  open: boolean;
  onClose: () => void;
  /** Where to land after signing in. Must be a same-site path. */
  next?: string;
  /** Shown as "Saving: ..." when the sheet was opened from a Save button. */
  personaTitle?: string;
  /** When true, a save is completed automatically after sign-in. */
  saveIntent?: boolean;
  heading?: string;
}) {
  const reduce = useReducedMotion();
  const [going, setGoing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const firstButton = useRef<HTMLButtonElement>(null);

  // Rendered into <body> (a portal): the nav bar uses backdrop-blur, which makes
  // it the containing block for `position: fixed` children, so a sheet rendered
  // inside it would be laid out relative to the header instead of the screen.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setGoing(false);
      return;
    }
    trackEvent("auth_sheet_open", { context: saveIntent ? "save" : "nav" });
    firstButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, saveIntent]);

  function continueWithGoogle() {
    setGoing(true);
    trackEvent("auth_start", { method: "google" });
    if (saveIntent) setSaveIntent();
    window.location.href = `/auth/google?next=${encodeURIComponent(next)}`;
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-sheet-title"
            className="w-full max-w-md rounded-t-[28px] border border-border bg-paper-raised p-6 shadow-card sm:rounded-[24px]"
            initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="auth-sheet-title" className="font-display text-xl font-bold text-ink">
                {heading}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-1 text-sm text-ink-soft">
              Sign in to keep this shortlist, come back to it later, and compare searches.
            </p>

            {personaTitle && (
              <p className="mt-4 text-xs uppercase tracking-wide text-ink-faint">
                Saving
                <span className="mt-0.5 block font-display text-base normal-case tracking-normal text-ink">
                  {personaTitle}
                </span>
              </p>
            )}

            <button
              ref={firstButton}
              type="button"
              onClick={continueWithGoogle}
              disabled={going}
              className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#8E918F] bg-[#131314] px-6 text-[15px] font-medium text-white transition hover:bg-[#1f1f21] active:scale-[0.98] disabled:opacity-70"
            >
              <GoogleG />
              {going ? "Opening Google…" : "Continue with Google"}
            </button>

            <p className="mt-4 text-xs leading-relaxed text-ink-faint">
              By continuing you accept our{" "}
              <a href="/terms" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink-soft">
                Terms
              </a>{" "}
              &amp;{" "}
              <a href="/privacy" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink-soft">
                Privacy Policy
              </a>
              . We use your Google name and email only to sign you in and keep your searches. Signing in is optional, and
              you can keep using CarDhoondo without an account.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
