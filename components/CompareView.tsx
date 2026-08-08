"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { RecommendOutput } from "../lib/scoring/recommend";
import type { ScoreResult } from "../lib/scoring/types";
import { confidenceLabel, verdictPhrase } from "../lib/verdict";
import { formatINR, humanize } from "../lib/format";

interface CompareViewProps {
  recommendationResultId: string;
  recommendOutput: RecommendOutput;
  onBack: () => void;
}

const MAX_ROWS = 14;

export default function CompareView({ recommendationResultId, recommendOutput, onBack }: CompareViewProps) {
  const { shortlist, cars_skipped_no_review_data } = recommendOutput;
  const [scores, setScores] = useState<Record<string, ScoreResult>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      shortlist.map((c) =>
        fetch("/api/car-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recommendation_result_id: recommendationResultId, car_id: c.car_id }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => [c.car_id, json?.score as ScoreResult | undefined] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, ScoreResult> = {};
      for (const [carId, score] of entries) if (score) next[carId] = score;
      setScores(next);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendationResultId]);

  // Union of facets across all shortlisted cars, ranked by how many cars
  // have data for it (most-shared first) then total claim volume -- keeps
  // the table to facets that actually help someone compare, rather than
  // every facet any single car happens to have.
  const facetStats = new Map<string, { theme: string; carsWithData: number; totalClaims: number }>();
  for (const result of Object.values(scores)) {
    for (const item of result.breakdown) {
      const stat = facetStats.get(item.facet) ?? { theme: item.theme, carsWithData: 0, totalClaims: 0 };
      stat.carsWithData += 1;
      stat.totalClaims += item.claim_count;
      facetStats.set(item.facet, stat);
    }
  }
  const rows = Array.from(facetStats.entries())
    .sort((a, b) => b[1].carsWithData - a[1].carsWithData || b[1].totalClaims - a[1].totalClaims)
    .slice(0, MAX_ROWS)
    .map(([facet]) => facet);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Back to shortlist
      </button>
      <h1 className="mt-4 text-2xl font-semibold text-ink">Compare</h1>
      <p className="mt-1 text-sm text-ink-faint sm:hidden">Swipe sideways to compare →</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-paper-raised px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Factor
              </th>
              {shortlist.map((c) => (
                <th key={c.car_id} className="min-w-[180px] border-l border-border bg-paper-raised px-4 py-3 text-left align-top">
                  <p className="font-semibold text-ink">
                    {c.brand} {c.car_model}
                  </p>
                  <p className="mt-0.5 text-xs font-normal text-ink-faint">{formatINR(c.price_on_road)}</p>
                  <p className="mt-1 inline-block rounded-full bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-800">
                    {confidenceLabel(c.coverage_ratio)}
                  </p>
                </th>
              ))}
              {cars_skipped_no_review_data.map((carId) => (
                <th key={carId} className="min-w-[180px] border-l border-border bg-paper px-4 py-3 text-left align-top opacity-70">
                  <p className="font-semibold text-ink">{humanize(carId)}</p>
                  <p className="mt-1 inline-block rounded-full bg-neutral-verdict-bg px-2 py-0.5 text-xs font-medium text-neutral-verdict">
                    Not enough data yet
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loaded && (
              <tr>
                <td colSpan={1 + shortlist.length + cars_skipped_no_review_data.length} className="px-4 py-6 text-ink-faint">
                  Loading evidence for each car…
                </td>
              </tr>
            )}
            {loaded &&
              rows.map((facet) => (
                <tr key={facet} className="border-t border-border">
                  <td className="sticky left-0 z-10 bg-paper-raised px-4 py-3 font-medium text-ink capitalize">
                    {humanize(facet)}
                  </td>
                  {shortlist.map((c) => {
                    const item = scores[c.car_id]?.breakdown.find((b) => b.facet === facet);
                    return (
                      <td key={c.car_id} className="border-l border-border px-4 py-3 text-ink-soft">
                        {item ? (
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                item.score >= 0.2 ? "bg-positive" : item.score > -0.2 ? "bg-neutral-verdict" : "bg-negative"
                              }`}
                            />
                            {verdictPhrase(item.score)}
                          </span>
                        ) : (
                          <span className="text-ink-faint">No data</span>
                        )}
                      </td>
                    );
                  })}
                  {cars_skipped_no_review_data.map((carId) => (
                    <td key={carId} className="border-l border-border px-4 py-3 text-ink-faint opacity-70">
                      No data
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {cars_skipped_no_review_data.length > 0 && (
        <p className="mt-4 text-sm text-ink-faint">
          {cars_skipped_no_review_data.length === 1 ? "The car above is" : "The cars above are"} shown honestly locked rather than
          filled in with guesses — they matched your filters but don't have enough review data yet.
        </p>
      )}
    </main>
  );
}
