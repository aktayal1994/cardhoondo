"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Info, X } from "lucide-react";
import {
  BRANDS_SHOWN_FIRST,
  formatBudgetRange,
  isAnswerComplete,
  type QuestionDef,
  type QuestionOption,
} from "../lib/questions";
import type { QuestionnaireAnswers } from "../lib/scoring/questionnaireWeights";
import { BUDGET_SLIDER_MIN, BUDGET_SLIDER_TOP } from "../lib/scoring/recommend";
import { BRAND_LOGOS } from "../lib/brandLogos";
import { countCars, matchingRows, useCatalogOptions } from "../lib/useCatalogOptions";
import { BODY_TYPE_ANSWERS, bodyTypeOf } from "../lib/cars/bodyStyles";

interface QuestionCardProps {
  question: QuestionDef;
  value: string | string[] | undefined;
  /** The full in-progress answer set (conditional labels, the brand-skip
   * list and the budget count depend on other questions' answers). */
  answers: QuestionnaireAnswers;
  /** Fired on every pick with the full new value. */
  onChange: (value: string | string[]) => void;
  /** Multi-choice and the budget slider wait for the Continue button. The
   * slider passes its value, since its starting position is only saved when
   * the user confirms it. */
  onConfirm?: (value?: string | string[]) => void;
  /** Compact styling for edit-in-place reopen, vs. the full chat-flow card. */
  compact?: boolean;
}

/** Pick-mode tag under the question, so nobody has to guess. */
function pickTag(q: QuestionDef): string {
  if (q.type === "range") return "Drag or type";
  if (q.type === "single") return "Pick one";
  if (q.type === "multi2") return "Pick exactly 2";
  if (q.maxSelect) return `Pick up to ${q.maxSelect}`;
  return "Pick one or more";
}

export default function QuestionCard({ question, value, answers, onChange, onConfirm, compact }: QuestionCardProps) {
  const Icon = question.icon;
  const [reaction, setReaction] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    setReaction(null);
    setInfoOpen(false);
  }, [question.id]);

  return (
    <div className={compact ? "" : "animate-fade-up-blur"}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-charcoal-800/70">
          <Icon className="h-4.5 w-4.5 text-accent-rust-soft" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <h2 className={compact ? "font-display text-base font-semibold text-ink" : "font-display text-xl font-semibold text-ink"}>
            {question.prompt}
            {question.info && (
              <button
                type="button"
                onClick={() => setInfoOpen((o) => !o)}
                aria-expanded={infoOpen}
                aria-label="What does this mean?"
                className="ml-2 inline-flex h-6 w-6 translate-y-0.5 items-center justify-center rounded-full text-accent-rust transition hover:bg-charcoal-800"
              >
                <Info className="h-4.5 w-4.5" strokeWidth={2} />
              </button>
            )}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{question.explainer}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-wash px-2 py-0.5 text-xs font-semibold text-accent-rust">{pickTag(question)}</span>
            {!question.required && <span className="text-xs text-ink-faint">Optional</span>}
          </div>
        </div>
      </div>

      {infoOpen && question.info && (
        <div className="animate-fade-up relative mt-3 ml-12 rounded-[14px] border border-border bg-wash p-4 pr-10 text-sm leading-relaxed text-ink">
          <button
            type="button"
            onClick={() => setInfoOpen(false)}
            aria-label="Close"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-white"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
          {question.info.map((p) => (
            <p key={p} className="mt-2 first:mt-0">
              {p}
            </p>
          ))}
        </div>
      )}

      {question.type === "range" ? (
        <BudgetSlider value={value} answers={answers} onChange={onChange} onConfirm={onConfirm} />
      ) : (
        <ChoiceList
          question={question}
          value={value}
          answers={answers}
          onChange={onChange}
          onConfirm={onConfirm}
          onReaction={setReaction}
        />
      )}

      {reaction && (
        <p key={reaction} className="animate-fade-up mt-3 ml-12 flex items-center gap-1.5 text-sm text-ink-soft">
          <span className="h-1 w-1 rounded-full bg-accent-rust" />
          {reaction}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Choice chips: tick boxes for multiple choice, circles for single choice,
// the "neither/none" option below an "or" divider, and locking.
// ---------------------------------------------------------------------------

function ChoiceList({
  question,
  value,
  answers,
  onChange,
  onConfirm,
  onReaction,
}: {
  question: QuestionDef;
  value: string | string[] | undefined;
  answers: QuestionnaireAnswers;
  onChange: (value: string | string[]) => void;
  onConfirm?: (value?: string | string[]) => void;
  onReaction: (text: string | null) => void;
}) {
  const isSingle = question.type === "single";
  const isMulti2 = question.type === "multi2";
  const isMultiAny = question.type === "multiAny";
  const selected: string[] = Array.isArray(value) ? value : value ? [value] : [];
  const exclusive = question.exclusiveValue;
  const exclusivePicked = !!exclusive && selected.includes(exclusive);
  const normalPicked = selected.filter((v) => v !== exclusive);
  const atCap = !!question.maxSelect && normalPicked.length >= question.maxSelect;

  const [shakeKey, setShakeKey] = useState<{ value: string; n: number } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const catalog = useCatalogOptions();

  useEffect(() => {
    setHint(null);
    setShowAllBrands(false);
  }, [question.id]);

  // Brand-skip screen: only brands with a car that fits the answers so far,
  // minus brands the user said they love.
  const options: QuestionOption[] = useMemo(() => {
    // Body type screen: only shapes with a car that fits the answers so far.
    if (question.id === "q_body_type") {
      if (!catalog) return question.options;
      const { q_body_type: _own, ...rest } = answers;
      const fitting = new Set(matchingRows(catalog, rest).map((r) => bodyTypeOf(r.car_id)));
      if (fitting.size === 0) return question.options;
      return question.options.filter(
        (o) =>
          o.value === question.exclusiveValue ||
          selected.includes(o.value) ||
          !BODY_TYPE_ANSWERS[o.value] ||
          fitting.has(BODY_TYPE_ANSWERS[o.value]),
      );
    }
    if (question.brandMode !== "avoid") return question.options;
    const loved = new Set(
      (Array.isArray(answers["q_brand_love"]) ? answers["q_brand_love"] : []).map((b) => b.toLowerCase()),
    );
    let opts = question.options.filter((o) => !loved.has(o.value.toLowerCase()) || selected.includes(o.value));
    if (catalog) {
      const fitting = new Set(matchingRows(catalog, answers).map((r) => r.brand.toLowerCase()));
      if (fitting.size > 0) opts = opts.filter((o) => fitting.has(o.value.toLowerCase()) || selected.includes(o.value));
    }
    return opts;
  }, [question, answers, catalog, selected]);

  const normalOptions = options.filter((o) => o.value !== exclusive);
  const exclusiveOption = exclusive ? options.find((o) => o.value === exclusive) : undefined;
  const collapsible = !!question.brandMode && !showAllBrands && normalOptions.length > BRANDS_SHOWN_FIRST;
  const visibleNormal = collapsible
    ? normalOptions.filter((o, i) => i < BRANDS_SHOWN_FIRST || selected.includes(o.value))
    : normalOptions;

  function lockedReason(optionValue: string): string | null {
    if (selected.includes(optionValue) || isSingle) return null;
    const exclusiveLabel = exclusiveOption?.label ?? "";
    if (optionValue === exclusive && normalPicked.length > 0) return `Untick your picks to choose "${exclusiveLabel}"`;
    if (optionValue !== exclusive && exclusivePicked) return `Untick "${exclusiveLabel}" to pick specific ones`;
    if (optionValue !== exclusive && atCap) return `You've picked ${question.maxSelect}. Untick one to choose another`;
    return null;
  }

  function pick(optionValue: string) {
    const locked = lockedReason(optionValue);
    if (locked) {
      setHint(locked);
      setShakeKey((k) => ({ value: optionValue, n: (k?.n ?? 0) + 1 }));
      return;
    }
    setHint(null);
    const option = options.find((o) => o.value === optionValue);
    const wasSelected = selected.includes(optionValue);
    onReaction(wasSelected ? null : option?.microcopy ?? null);

    if (isMulti2) {
      let next: string[];
      if (wasSelected) next = selected.filter((v) => v !== optionValue);
      else if (selected.length >= 2) next = [selected[1], optionValue];
      else next = [...selected, optionValue];
      onChange(next);
      return;
    }
    if (isMultiAny) {
      onChange(wasSelected ? selected.filter((v) => v !== optionValue) : [...selected, optionValue]);
      return;
    }
    onChange(optionValue);
  }

  function renderChip(option: QuestionOption) {
    const isSelected = selected.includes(option.value);
    const locked = !!lockedReason(option.value);
    const label = option.conditionalLabel?.(answers) ?? option.label;
    const logoSrc = question.brandMode ? BRAND_LOGOS[option.value] : undefined;
    const shaking = shakeKey?.value === option.value;
    return (
      <button
        key={`${option.value}-${shaking ? shakeKey?.n : 0}`}
        type="button"
        onClick={() => pick(option.value)}
        aria-pressed={isSelected}
        aria-disabled={locked}
        className={`flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-left text-sm font-medium transition active:scale-95 ${
          shaking ? "animate-shake" : ""
        } ${
          isSelected
            ? "border-accent-rust bg-accent-rust text-charcoal-950 shadow-glow-sm"
            : locked
              ? "cursor-not-allowed border-border bg-charcoal-900 text-ink-faint opacity-50"
              : "border-border bg-paper-raised text-ink hover:border-accent-rust/50 hover:bg-charcoal-800/60"
        }`}
      >
        <SelectMark kind={isSingle ? "radio" : "check"} on={isSelected} />
        {logoSrc && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper">
            <Image src={logoSrc} alt="" width={20} height={20} className="h-full w-full object-contain p-0.5" />
          </span>
        )}
        <span>
          <span className="block">{label}</span>
          {option.sublabel && (
            <span className={`block text-xs font-normal ${isSelected ? "text-charcoal-950/85" : "text-ink-soft"}`}>
              {option.sublabel}
            </span>
          )}
        </span>
      </button>
    );
  }

  // Brand screens look different on purpose: "love" is a grid of brand cards (a soft nudge),
  // "avoid" is a plain tick list (a hard filter), so the two never read as the same question.
  function renderBrandOption(option: QuestionOption) {
    const isSelected = selected.includes(option.value);
    const locked = !!lockedReason(option.value);
    const logoSrc = BRAND_LOGOS[option.value];
    const shaking = shakeKey?.value === option.value;
    const logo = logoSrc && (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper">
        <Image src={logoSrc} alt="" width={28} height={28} className="h-full w-full object-contain p-0.5" />
      </span>
    );
    if (question.brandMode === "love") {
      return (
        <button
          key={`${option.value}-${shaking ? shakeKey?.n : 0}`}
          type="button"
          onClick={() => pick(option.value)}
          aria-pressed={isSelected}
          aria-disabled={locked}
          className={`flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition active:scale-95 ${
            shaking ? "animate-shake" : ""
          } ${
            isSelected
              ? "border-2 border-accent-rust bg-accent-rust/10 text-ink"
              : locked
                ? "cursor-not-allowed border-border bg-charcoal-900 text-ink-faint opacity-50"
                : "border-border bg-paper-raised text-ink hover:border-accent-rust/50"
          }`}
        >
          {logo}
          <span className="flex-1">{option.label}</span>
          {isSelected && <Check aria-hidden className="h-4 w-4 shrink-0 text-accent-rust" />}
        </button>
      );
    }
    return (
      <button
        key={`${option.value}-${shaking ? shakeKey?.n : 0}`}
        type="button"
        onClick={() => pick(option.value)}
        aria-pressed={isSelected}
        className={`flex w-full items-center gap-3 border-b border-border px-1 py-2.5 text-left text-sm font-medium text-ink transition last:border-b-0 hover:bg-charcoal-800/40 ${
          shaking ? "animate-shake" : ""
        }`}
      >
        <SelectMark kind="check" on={isSelected} plain />
        <span>{option.label}</span>
      </button>
    );
  }

  const confirmLabel = (() => {
    if (normalPicked.length === 0 && !exclusivePicked) return question.required ? "Pick at least one" : "Skip";
    if (exclusivePicked) return "Continue";
    return `Continue with ${normalPicked.length} selected`;
  })();

  return (
    <div className="ml-12">
      {question.brandMode === "love" ? (
        <div className="mt-4 grid max-w-md grid-cols-2 gap-2">{visibleNormal.map(renderBrandOption)}</div>
      ) : question.brandMode === "avoid" ? (
        <div className="mt-3 max-w-md">{visibleNormal.map(renderBrandOption)}</div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">{visibleNormal.map(renderChip)}</div>
      )}

      {collapsible && (
        <button
          type="button"
          onClick={() => setShowAllBrands(true)}
          className="mt-3 block text-sm font-medium text-accent-rust underline decoration-dotted underline-offset-4"
        >
          Show all brands
        </button>
      )}

      {exclusiveOption && (
        <>
          <div className="my-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-wrap gap-2">{renderChip(exclusiveOption)}</div>
        </>
      )}

      {hint && (
        <p role="status" className="animate-fade-up mt-3 text-sm font-medium text-accent-rust">
          {hint}
        </p>
      )}

      {isMulti2 && selected.length < 2 && (
        <p className="mt-3 text-sm text-ink-soft">{selected.length} of 2 picked</p>
      )}

      {isMultiAny && onConfirm && (
        <button
          type="button"
          onClick={() => onConfirm()}
          disabled={!isAnswerComplete(question, value)}
          className="mt-4 block rounded-lg bg-accent-rust px-6 py-2.5 text-sm font-semibold text-charcoal-950 shadow-glow-sm transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {confirmLabel}
        </button>
      )}
    </div>
  );
}

/** Tick box (multiple choice) or radio circle (single choice). */
/** `plain` = drawn on a white row rather than a filled chip, so the ticked box fills with denim. */
function SelectMark({ kind, on, plain = false }: { kind: "check" | "radio"; on: boolean; plain?: boolean }) {
  if (kind === "radio") {
    return (
      <span
        aria-hidden
        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 ${
          on ? "border-charcoal-950" : "border-ink-faint"
        }`}
      >
        {on && <span className="h-2 w-2 rounded-full bg-charcoal-950" />}
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[5px] border-2 ${
        on ? (plain ? "border-accent-rust bg-accent-rust" : "border-charcoal-950 bg-charcoal-950") : "border-ink-faint"
      }`}
    >
      {on && <Check className={`h-3 w-3 ${plain ? "text-charcoal-950" : "text-accent-rust"}`} strokeWidth={3.5} />}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Budget slider: two handles, Rs 3 lakh to Rs 25 lakh+. Rs 50,000 steps up to
// Rs 20 lakh, Rs 1 lakh steps above. Starts at 8 to 15 lakh; saved only when
// the user moves a handle or presses Continue.
// ---------------------------------------------------------------------------

const BUDGET_STOPS: number[] = (() => {
  const stops: number[] = [];
  for (let v = BUDGET_SLIDER_MIN; v <= 20; v += 0.5) stops.push(v);
  for (let v = 21; v <= BUDGET_SLIDER_TOP; v += 1) stops.push(v);
  return stops;
})();
const DEFAULT_RANGE: [number, number] = [8, 15];
// Handles can't cross; keep at least one step between them.
const MIN_GAP_STEPS = 1;

function stopIndex(lakh: number): number {
  let best = 0;
  BUDGET_STOPS.forEach((s, i) => {
    if (Math.abs(s - lakh) < Math.abs(BUDGET_STOPS[best] - lakh)) best = i;
  });
  return best;
}

function toAnswer(lo: number, hi: number): string[] {
  return [String(BUDGET_STOPS[lo]), String(BUDGET_STOPS[hi])];
}

function BudgetSlider({
  value,
  answers,
  onChange,
  onConfirm,
}: {
  value: string | string[] | undefined;
  answers: QuestionnaireAnswers;
  onChange: (value: string | string[]) => void;
  onConfirm?: (value?: string | string[]) => void;
}) {
  const initial = Array.isArray(value) && value.length === 2 ? value.map(parseFloat) : DEFAULT_RANGE;
  const [lo, setLo] = useState(stopIndex(initial[0]));
  const [hi, setHi] = useState(stopIndex(initial[1]));
  const catalog = useCatalogOptions();
  const last = BUDGET_STOPS.length - 1;
  const current = toAnswer(lo, hi);

  const carCount = useMemo(() => {
    if (!catalog) return null;
    return countCars(matchingRows(catalog, { ...answers, q_budget_range: current }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, lo, hi]);

  function update(nextLo: number, nextHi: number) {
    setLo(nextLo);
    setHi(nextHi);
    onChange(toAnswer(nextLo, nextHi));
  }

  const pct = (i: number) => (i / last) * 100;

  return (
    <div className="ml-12 mt-5 max-w-md">
      <p className="font-display text-lg font-semibold text-ink">{formatBudgetRange(current)}, on-road</p>

      <div className="relative mt-4 h-9">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-charcoal-700" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent-rust"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          type="range"
          className="dual-range"
          min={0}
          max={last}
          step={1}
          value={lo}
          aria-label="Lowest budget"
          aria-valuetext={`₹${BUDGET_STOPS[lo]} lakh`}
          onChange={(e) => update(Math.min(Number(e.target.value), hi - MIN_GAP_STEPS), hi)}
        />
        <input
          type="range"
          className="dual-range"
          min={0}
          max={last}
          step={1}
          value={hi}
          aria-label="Highest budget"
          aria-valuetext={hi === last ? `₹${BUDGET_STOPS[hi]} lakh or more` : `₹${BUDGET_STOPS[hi]} lakh`}
          onChange={(e) => update(lo, Math.max(Number(e.target.value), lo + MIN_GAP_STEPS))}
        />
      </div>
      <div className="mt-2 flex items-end justify-between gap-4">
        <BudgetBox
          label="Min"
          lakh={BUDGET_STOPS[lo]}
          suffix="lakh"
          onCommit={(lakh) => {
            const i = Math.min(stopIndex(lakh), hi - MIN_GAP_STEPS);
            update(Math.max(0, i), hi);
            return BUDGET_STOPS[Math.max(0, i)];
          }}
        />
        <BudgetBox
          label="Max"
          lakh={BUDGET_STOPS[hi]}
          suffix={hi === last ? "lakh+" : "lakh"}
          alignRight
          onCommit={(lakh) => {
            const i = Math.max(stopIndex(lakh), lo + MIN_GAP_STEPS);
            update(lo, Math.min(last, i));
            return BUDGET_STOPS[Math.min(last, i)];
          }}
        />
      </div>
      <p className="mt-1 text-xs text-ink-faint">
        Any amount from ₹{BUDGET_SLIDER_MIN} to ₹{BUDGET_SLIDER_TOP} lakh.
      </p>

      <p className="mt-3 min-h-5 text-sm text-ink-soft">
        {carCount == null
          ? " "
          : carCount === 0
            ? "No cars fit this range yet. Try widening it."
            : `${carCount} ${carCount === 1 ? "car fits" : "cars fit"} this range`}
      </p>

      {onConfirm && (
        <button
          type="button"
          onClick={() => onConfirm(current)}
          className="mt-4 rounded-lg bg-accent-rust px-6 py-2.5 text-sm font-semibold text-charcoal-950 shadow-glow-sm transition hover:brightness-110 active:scale-95"
        >
          Continue
        </button>
      )}
    </div>
  );
}

/** Typed end of the budget range. Accepts any number; on Enter or leaving the box it is kept
 * within ₹3 to 25 lakh, snapped to the slider's steps and kept below/above the other end. */
function BudgetBox({
  label,
  lakh,
  suffix,
  alignRight = false,
  onCommit,
}: {
  label: string;
  lakh: number;
  suffix: string;
  alignRight?: boolean;
  onCommit: (lakh: number) => number;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft == null) return;
    const typed = parseFloat(draft.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(typed)) {
      const clamped = Math.min(BUDGET_SLIDER_TOP, Math.max(BUDGET_SLIDER_MIN, typed));
      onCommit(clamped);
    }
    setDraft(null);
  }

  return (
    <label className={`flex flex-col gap-1 ${alignRight ? "items-end" : ""}`}>
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <span className="flex items-center gap-1.5 rounded-lg border border-border bg-paper-raised px-2.5 py-1.5 focus-within:border-accent-rust">
        <span className="text-sm text-ink-soft">₹</span>
        <input
          type="text"
          inputMode="decimal"
          aria-label={`${label} budget in lakh`}
          value={draft ?? String(lakh)}
          onFocus={(e) => {
            setDraft(String(lakh));
            e.target.select();
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-12 bg-transparent text-right text-sm font-semibold text-ink outline-none"
        />
        <span className="text-sm text-ink-soft">{suffix}</span>
      </span>
    </label>
  );
}
