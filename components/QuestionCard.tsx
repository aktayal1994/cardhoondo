"use client";

import { useEffect, useState } from "react";
import type { QuestionDef } from "../lib/questions";

interface QuestionCardProps {
  question: QuestionDef;
  value: string | string[] | undefined;
  /** Fired on every pick, with the full new value (partial for multi2 mid-selection).
   * Parent uses isAnswerComplete() (see lib/questions.ts) to decide whether to
   * auto-advance -- this callback itself carries no "done" signal. */
  onChange: (value: string | string[]) => void;
  /** Compact styling for edit-in-place reopen, vs. the full chat-flow card. */
  compact?: boolean;
}

export default function QuestionCard({ question, value, onChange, compact }: QuestionCardProps) {
  const Icon = question.icon;
  const isMulti = question.type === "multi2";
  const selected: string[] = Array.isArray(value) ? value : value ? [value] : [];
  const [reaction, setReaction] = useState<string | null>(null);

  useEffect(() => {
    setReaction(null);
  }, [question.id]);

  function pick(optionValue: string) {
    const option = question.options.find((o) => o.value === optionValue);
    if (!isMulti) {
      setReaction(option?.microcopy ?? null);
      onChange(optionValue);
      return;
    }

    // multi2: toggle, cap at 2 (oldest drops off if a 3rd is tapped)
    let next: string[];
    if (selected.includes(optionValue)) {
      next = selected.filter((v) => v !== optionValue);
    } else if (selected.length >= 2) {
      next = [selected[1], optionValue];
    } else {
      next = [...selected, optionValue];
    }
    setReaction(option?.microcopy ?? null);
    onChange(next);
  }

  return (
    <div className={compact ? "" : "animate-fade-up"}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50">
          <Icon className="h-4.5 w-4.5 text-navy-700" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className={compact ? "text-base font-medium text-ink" : "text-xl font-medium text-ink"}>
            {question.prompt}
            {isMulti && <span className="ml-2 text-sm font-normal text-ink-faint">(pick 2)</span>}
            {!question.required && <span className="ml-2 text-sm font-normal text-ink-faint">(optional)</span>}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{question.explainer}</p>
        </div>
      </div>

      <div className="mt-4 ml-12 flex flex-wrap gap-2">
        {question.options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => pick(option.value)}
              aria-pressed={isSelected}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                isSelected
                  ? "border-navy-800 bg-navy-800 text-white"
                  : "border-border bg-paper-raised text-ink hover:border-navy-500 hover:bg-navy-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {reaction && (
        <p key={reaction} className="animate-fade-up mt-3 ml-12 text-sm text-navy-700">
          {reaction}
        </p>
      )}
    </div>
  );
}
