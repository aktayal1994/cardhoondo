"use client";

import { useEffect, useRef, useState } from "react";

const STAGES = [
  "Reading your answers",
  "Filtering the catalog by budget, fuel and seating",
  "Weighing dozens of review factors against what you told us",
  "Cross-checking evidence from real owners and experts",
  "Ranking the shortlist",
];

const STAGE_INTERVAL_MS = 1100;
const MIN_VISIBLE_MS = 1800;

interface ThinkingBridgeProps {
  /** True once the real /api/recommend response has arrived. The bridge
   * won't call onDone before this, however fast the stage cycle runs. */
  ready: boolean;
  onDone: () => void;
}

export default function ThinkingBridge({ ready, onDone }: ThinkingBridgeProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const doneRef = useRef(false);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      if (ready && !doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return;
    }

    const interval = window.setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, STAGE_INTERVAL_MS);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || doneRef.current) return;
    const elapsed = Date.now() - startRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const timeout = window.setTimeout(() => {
      doneRef.current = true;
      onDone();
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [ready, onDone]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex gap-1.5" aria-hidden>
        <span className="animate-pulse-dot h-2 w-2 rounded-full bg-navy-700" style={{ animationDelay: "0ms" }} />
        <span className="animate-pulse-dot h-2 w-2 rounded-full bg-navy-700" style={{ animationDelay: "180ms" }} />
        <span className="animate-pulse-dot h-2 w-2 rounded-full bg-navy-700" style={{ animationDelay: "360ms" }} />
      </div>
      <p className="animate-fade-up mt-6 text-lg font-medium text-ink" key={stageIndex}>
        {STAGES[stageIndex]}
      </p>
      <p className="mt-2 text-sm text-ink-faint">This usually takes a few seconds.</p>
    </main>
  );
}
