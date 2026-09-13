"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";

const STEP_LABELS = ["Your info", "Core requirements", "Everyday driving", "What matters"];

interface StepProgressProps {
  /** 1-indexed current step, 1-4. */
  current: number;
}

/** The 4-segment step indicator flagged as the primary missing-feedback item
 * from user testing -- shown at the top of every step-form page so it's
 * always clear how far through the flow you are and how much is left. A
 * single glowing amber bar (animated width, not a jump-cut) carries the
 * overall sense of progress; the numbered circles underneath still name
 * each step for anyone who wants the detail. */
export default function StepProgress({ current }: StepProgressProps) {
  const total = STEP_LABELS.length;
  const pct = ((current - 1) / (total - 1)) * 100;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4 sm:px-6">
      <div className="h-1 w-full overflow-hidden rounded-full bg-charcoal-800">
        <motion.div
          className="h-full rounded-full bg-accent-rust shadow-glow-sm"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="mt-3 flex items-center">
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
                      ? "bg-accent-rust text-charcoal-950"
                      : isCurrent
                        ? "border-2 border-accent-rust bg-paper text-accent-rust-soft shadow-glow-sm"
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
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-ink-faint sm:hidden">
        Step {current} of {total}: {STEP_LABELS[current - 1]}
      </p>
    </div>
  );
}
