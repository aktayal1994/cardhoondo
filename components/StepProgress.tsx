"use client";

import { Check } from "lucide-react";

const STEP_LABELS = ["Your info", "Core requirements", "Everyday driving", "What matters"];

interface StepProgressProps {
  /** 1-indexed current step, 1-4. */
  current: number;
}

/** The 4-segment step indicator flagged as the primary missing-feedback item
 * from user testing -- shown at the top of every step-form page so it's
 * always clear how far through the flow you are and how much is left. */
export default function StepProgress({ current }: StepProgressProps) {
  const total = STEP_LABELS.length;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4 sm:px-6">
      <div className="flex items-center">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < current;
          const isCurrent = stepNum === current;
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                    isDone
                      ? "bg-navy-900 text-white"
                      : isCurrent
                        ? "border-2 border-navy-900 bg-paper text-navy-900"
                        : "border border-border bg-paper-raised text-ink-faint"
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : stepNum}
                </div>
                <span
                  className={`hidden text-[11px] font-medium sm:block ${
                    isCurrent ? "text-ink" : isDone ? "text-ink-soft" : "text-ink-faint"
                  }`}
                >
                  {label}
                </span>
              </div>
              {stepNum < total && (
                <div className={`mx-2 h-0.5 flex-1 rounded-full transition ${isDone ? "bg-navy-900" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-ink-faint sm:hidden">
        Step {current} of {total} — {STEP_LABELS[current - 1]}
      </p>
    </div>
  );
}
