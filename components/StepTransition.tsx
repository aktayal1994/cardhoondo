"use client";

import { useEffect } from "react";
import Image from "next/image";

const VISIBLE_MS = 1700;

interface StepTransitionProps {
  message: string;
  onDone: () => void;
}

/** The full-screen acknowledgment shown between step-forms (see
 * app/questionnaire/*\/page.tsx) -- replaces the earlier design where a
 * "section complete" line stayed permanently inline in a continuously
 * scrolling page. Auto-advances after a fixed delay; respects
 * prefers-reduced-motion by skipping straight through, same as
 * ThinkingBridge. Deliberately not used for the what_matters -> results
 * transition, since ThinkingBridge already IS that step's acknowledgment
 * screen while /api/recommend runs. */
export default function StepTransition({ message, onDone }: StepTransitionProps) {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduceMotion ? 0 : VISIBLE_MS;
    const timeout = window.setTimeout(onDone, delay);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="stage-glow flex min-h-screen flex-col items-center justify-center bg-stage px-6 text-center">
      <Image src="/cardhoondo-icon.png" alt="" width={237} height={237} className="mb-2 h-10 w-10" />
      <div className="flex gap-1.5" aria-hidden>
        <span className="animate-pulse-dot h-2 w-2 rounded-full bg-accent-gold" style={{ animationDelay: "0ms" }} />
        <span className="animate-pulse-dot h-2 w-2 rounded-full bg-accent-gold" style={{ animationDelay: "180ms" }} />
        <span className="animate-pulse-dot h-2 w-2 rounded-full bg-accent-gold" style={{ animationDelay: "360ms" }} />
      </div>
      <p className="animate-fade-up mt-6 max-w-sm font-display text-lg font-medium text-stage-ink">{message}</p>
    </main>
  );
}
