"use client";

import { useEffect, useState } from "react";
import { isAnswerComplete, type QuestionDef } from "../lib/questions";
import type { QuestionnaireAnswers } from "../lib/scoring/questionnaireWeights";

interface QuestionCardProps {
  question: QuestionDef;
  value: string | string[] | undefined;
  /** The full in-progress answer set -- needed to resolve a
   * conditionalLabel (e.g. frustration's refuelling/charging swap), which
   * depends on a *different* question's answer (q_fuel), not just this
   * question's own value. */
  answers: QuestionnaireAnswers;
  /** Fired on every pick, with the full new value (partial for multi2 mid-selection).
   * Parent uses isAnswerComplete() (see lib/questions.ts) to decide whether to
   * auto-advance -- this callback itself carries no "done" signal. */
  onChange: (value: string | string[]) => void;
  /** Only used for "multiAny" -- picking one option doesn't mean "done
   * picking" the way it does for single-select, so there's no safe moment
   * to auto-advance. Parent passes this to advance/close-edit explicitly
   * once the user taps the Continue button rendered below. */
  onConfirm?: () => void;
  /** Compact styling for edit-in-place reopen, vs. the full chat-flow card. */
  compact?: boolean;
}

export default function QuestionCard({ question, value, answers, onChange, onConfirm, compact }: QuestionCardProps) {
  const Icon = question.icon;
  const isMulti2 = question.type === "multi2";
  const isMultiAny = question.type === "multiAny";
  const selected: string[] = Array.isArray(value) ? value : value ? [value] : [];
  const [reaction, setReaction] = useState<string | null>(null);

  useEffect(() => {
    setReaction(null);
  }, [question.id]);

  function pick(optionValue: string) {
    const option = question.options.find((o) => o.value === optionValue);
    const reactionText = option?.conditionalLabel?.(answers) ? option.microcopy : option?.microcopy ?? null;

    if (isMulti2) {
      // toggle, cap at 2 (oldest drops off if a 3rd is tapped)
      let next: string[];
      if (selected.includes(optionValue)) {
        next = selected.filter((v) => v !== optionValue);
      } else if (selected.length >= 2) {
        next = [selected[1], optionValue];
      } else {
        next = [...selected, optionValue];
      }
      setReaction(reactionText);
      onChange(next);
      return;
    }

    if (isMultiAny) {
      // toggle, no cap
      const next = selected.includes(optionValue)
        ? selected.filter((v) => v !== optionValue)
        : [...selected, optionValue];
      setReaction(reactionText);
      onChange(next);
      return;
    }

    setReaction(reactionText);
    onChange(optionValue);
  }

  return (
    <div className={compact ? "" : "animate-fade-up"}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50">
          <Icon className="h-4.5 w-4.5 text-navy-700" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className={compact ? "font-display text-base font-semibold text-ink" : "font-display text-xl font-semibold text-ink"}>
            {question.prompt}
            {isMulti2 && <span className="ml-2 text-sm font-normal text-ink-faint">(pick 2)</span>}
            {isMultiAny && <span className="ml-2 text-sm font-normal text-ink-faint">(pick any)</span>}
            {!question.required && <span className="ml-2 text-sm font-normal text-ink-faint">(optional)</span>}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{question.explainer}</p>
        </div>
      </div>

      <div className="mt-4 ml-12 flex flex-wrap gap-2">
        {question.options.map((option) => {
          const isSelected = selected.includes(option.value);
          const label = option.conditionalLabel?.(answers) ?? option.label;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => pick(option.value)}
              aria-pressed={isSelected}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium transition active:scale-95 ${
                isSelected
                  ? "border-navy-900 bg-navy-900 text-white shadow-sm"
                  : "border-border bg-paper-raised text-ink hover:border-navy-500 hover:bg-navy-50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {reaction && (
        <p key={reaction} className="animate-fade-up mt-3 ml-12 flex items-center gap-1.5 text-sm text-navy-700">
          <span className="h-1 w-1 rounded-full bg-accent-gold" />
          {reaction}
        </p>
      )}

      {isMultiAny && onConfirm && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={!isAnswerComplete(question, value)}
          className="ml-12 mt-4 rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-950 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {selected.length > 0 ? "Continue" : "Continue — no preference"}
        </button>
      )}
    </div>
  );
}
