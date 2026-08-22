"use client";

import { CheckCircle2, MinusCircle, Scale as ScaleIcon } from "lucide-react";
import { ALL_FACETS } from "../lib/scoring/questionnaireWeights";
import type { RecommendOutput, RecommendCandidate } from "../lib/scoring/recommend";
import type { WriteupOutput, WriteupCarOutput, WriteupFacetEntry } from "../lib/llm/writeup";
import type { ScoreBreakdownItem } from "../lib/scoring/types";
import { confidenceLabel, verdictPhrase } from "../lib/verdict";
import { formatINR } from "../lib/format";

interface ResultsScreenProps {
  recommendOutput: RecommendOutput;
  writeup: WriteupOutput | null;
  writeupError: boolean;
  onSelectCar: (carId: string) => void;
  onCompare: () => void;
  onRestart: () => void;
}

const TOTAL_FACETS = ALL_FACETS.length;

function carModelLabel(c: RecommendCandidate) {
  return `${c.brand} ${c.car_model}`;
}

/** Deterministic fallback reasons built straight from top_contributors --
 * used before the write-up arrives, and permanently if it fails (e.g. the
 * Gemini free-tier quota gate we hit on Aug 8). No LLM prose, just the same
 * underlying facts the write-up would have narrated. */
function fallbackEntries(breakdown: ScoreBreakdownItem[]): { positive: ScoreBreakdownItem[]; negative: ScoreBreakdownItem[] } {
  return {
    positive: breakdown.filter((b) => b.contribution > 0),
    negative: breakdown.filter((b) => b.contribution < 0),
  };
}

export default function ResultsScreen({
  recommendOutput,
  writeup,
  writeupError,
  onSelectCar,
  onCompare,
  onRestart,
}: ResultsScreenProps) {
  const { shortlist, cars_skipped_no_review_data } = recommendOutput;
  const writeupByCarId = new Map((writeup?.recommendations ?? []).map((w) => [w.car_id, w]));

  if (shortlist.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-lg font-medium text-ink">
          Nothing cleared the bar for a confident recommendation with these answers.
        </p>
        <p className="mt-2 text-ink-soft">
          That's an honest result, not a bug — either nothing in the catalog matched your budget/fuel/seating, or
          the cars that did don't have enough review data yet.
        </p>
        <button
          onClick={onRestart}
          className="mt-6 rounded-full border border-navy-800 px-6 py-3 text-sm font-medium text-navy-800 hover:bg-navy-50"
        >
          Try different answers
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Your shortlist</h1>
        <button onClick={onRestart} className="text-sm text-ink-faint underline decoration-dotted underline-offset-4 hover:text-ink-soft">
          Start over
        </button>
      </div>
      <p className="mt-1 text-ink-soft">
        {shortlist.length === 1 ? "One car" : `${shortlist.length} cars`} matched your answers with enough evidence
        to rank confidently.
      </p>

      <div className="mt-8 space-y-6">
        {shortlist.map((candidate, idx) => (
          <ResultCard
            key={candidate.car_id}
            rank={idx + 1}
            candidate={candidate}
            writeupCar={writeupByCarId.get(candidate.car_id) ?? null}
            writeupPending={!writeup && !writeupError}
            writeupError={writeupError}
            onSelect={() => onSelectCar(candidate.car_id)}
          />
        ))}
      </div>

      {shortlist.length > 1 && (
        <button
          onClick={onCompare}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-paper-raised py-3 text-sm font-medium text-ink hover:border-navy-500"
        >
          <ScaleIcon className="h-4 w-4" strokeWidth={1.75} />
          Compare these cars side by side
        </button>
      )}

      {writeup?.closing_note && (
        <p className="mt-6 rounded-xl bg-navy-50 p-4 text-sm text-navy-800">{writeup.closing_note}</p>
      )}

      {cars_skipped_no_review_data.length > 0 && (
        <p className="mt-6 text-sm text-ink-faint">
          {cars_skipped_no_review_data.length === 1 ? "One other car" : `${cars_skipped_no_review_data.length} other cars`} matched
          your budget and filters but don't have enough review data yet to rank confidently, so we left {cars_skipped_no_review_data.length === 1 ? "it" : "them"} out
          rather than guess.
        </p>
      )}
    </main>
  );
}

function ResultCard({
  rank,
  candidate,
  writeupCar,
  writeupPending,
  writeupError,
  onSelect,
}: {
  rank: number;
  candidate: RecommendCandidate;
  writeupCar: WriteupCarOutput | null;
  writeupPending: boolean;
  writeupError: boolean;
  onSelect: () => void;
}) {
  const coveragePct = Math.round((candidate.facets_with_data / TOTAL_FACETS) * 100);
  const confidence = writeupCar?.confidence_label ?? confidenceLabel(candidate.coverage_ratio);
  const { positive, negative } = fallbackEntries(candidate.top_contributors);

  return (
    <article className="animate-fade-up rounded-[20px] border border-border bg-paper-raised p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 font-mono text-xs font-medium text-white">
          {rank}
        </span>
        <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-800">{confidence}</span>
      </div>

      <h2 className="mt-3 font-display text-xl font-semibold text-ink">{carModelLabel(candidate)}</h2>
      <p className="text-sm text-ink-faint">
        {candidate.variant_id} · {formatINR(candidate.price_on_road)}
      </p>

      <div className="mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
          <div className="h-full rounded-full bg-navy-700" style={{ width: `${coveragePct}%` }} />
        </div>
        <p className="mt-1.5 font-mono text-xs text-ink-faint">
          {candidate.facets_with_data} of {TOTAL_FACETS} review factors covered
        </p>
      </div>

      {writeupCar ? (
        <>
          <p className="mt-4 font-medium text-ink">{writeupCar.headline}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{writeupCar.narrative}</p>
        </>
      ) : writeupPending ? (
        <div className="mt-4 space-y-2" aria-hidden>
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-navy-50" />
          <div className="h-3.5 w-full animate-pulse rounded bg-navy-50" />
          <div className="h-3.5 w-3/5 animate-pulse rounded bg-navy-50" />
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">
          Here's what the review evidence itself shows for this car (the written summary isn't available right now):
        </p>
      )}

      <FacetList label="Reasons to like" tone="positive" entries={writeupCar?.reasons_to_like ?? positive} />
      <FacetList label="Watch-outs" tone="negative" entries={writeupCar?.watch_outs ?? negative} />

      <button
        onClick={onSelect}
        className="mt-5 text-sm font-medium text-navy-700 underline decoration-dotted underline-offset-4 hover:text-navy-900"
      >
        See full evidence for this car →
      </button>
    </article>
  );
}

function FacetList({
  label,
  tone,
  entries,
}: {
  label: string;
  tone: "positive" | "negative";
  entries: (WriteupFacetEntry | ScoreBreakdownItem)[];
}) {
  if (entries.length === 0) return null;
  const Icon = tone === "positive" ? CheckCircle2 : MinusCircle;
  const colorClass = tone === "positive" ? "text-positive" : "text-negative";

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <ul className="mt-2 space-y-2">
        {entries.map((entry) => {
          const isWriteupEntry = "verdict" in entry;
          const facetLabel = entry.facet.replace(/_/g, " ");
          const verdict = isWriteupEntry ? entry.verdict : verdictPhrase(entry.score);
          const claimCount = entry.claim_count;
          return (
            <li key={entry.facet} className="flex gap-2 text-sm">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${colorClass}`} strokeWidth={1.75} />
              <span className="text-ink-soft">
                <span className="font-medium text-ink capitalize">{facetLabel}</span> — {verdict.toLowerCase()} ({claimCount}{" "}
                {claimCount === 1 ? "review" : "reviews"})
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
