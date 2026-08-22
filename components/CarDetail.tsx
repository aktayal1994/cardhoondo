"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { ScoreResult, ScoreBreakdownItem } from "../lib/scoring/types";
import { verdictPhrase, confidenceSentence } from "../lib/verdict";
import { formatINR, humanize } from "../lib/format";

interface CarDetailData {
  car_id: string;
  brand: string;
  car_model: string;
  variant_id: string;
  price_on_road: number | null;
  score: ScoreResult;
}

interface CarDetailProps {
  recommendationResultId: string;
  carId: string;
  fallbackLabel: string;
  onBack: () => void;
}

export default function CarDetail({ recommendationResultId, carId, fallbackLabel, onBack }: CarDetailProps) {
  const [data, setData] = useState<CarDetailData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(false);
    fetch("/api/car-detail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendation_result_id: recommendationResultId, car_id: carId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("request failed");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [recommendationResultId, carId]);

  const byTheme = new Map<string, ScoreBreakdownItem[]>();
  for (const item of data?.score.breakdown ?? []) {
    const list = byTheme.get(item.theme) ?? [];
    list.push(item);
    byTheme.set(item.theme, list);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Back to shortlist
      </button>

      <h1 className="mt-4 font-display text-2xl font-bold text-ink">{data ? `${data.brand} ${data.car_model}` : fallbackLabel}</h1>
      {data && (
        <p className="text-sm text-ink-faint">
          {data.variant_id} · {formatINR(data.price_on_road)} ·{" "}
          <span className="font-mono">
            {data.score.facets_with_data} of {data.score.facets_with_data + data.score.facets_missing}
          </span>{" "}
          review factors covered
        </p>
      )}

      {error && (
        <p className="mt-8 text-sm text-negative">
          Couldn't load the full evidence for this car right now. Try going back and reopening it.
        </p>
      )}

      {!data && !error && (
        <div className="mt-8 space-y-4" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-navy-50" />
          ))}
        </div>
      )}

      {data && (
        <div className="mt-8 space-y-8">
          {Array.from(byTheme.entries()).map(([theme, items]) => (
            <section key={theme}>
              <h2 className="font-display text-xs font-semibold uppercase tracking-wide text-ink-faint">{humanize(theme)}</h2>
              <div className="mt-3 space-y-4">
                {items.map((item) => (
                  <FacetDetail key={item.facet} item={item} />
                ))}
              </div>
            </section>
          ))}
          {byTheme.size === 0 && (
            <p className="text-sm text-ink-soft">No review evidence available for this car yet.</p>
          )}
        </div>
      )}
    </main>
  );
}

function FacetDetail({ item }: { item: ScoreBreakdownItem }) {
  const verdict = verdictPhrase(item.score);
  const dotClass = item.score >= 0.2 ? "bg-positive" : item.score > -0.2 ? "bg-neutral-verdict" : "bg-negative";

  return (
    <div className="rounded-xl border border-border bg-paper-raised p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-ink capitalize">{humanize(item.facet)}</p>
        <span className="flex items-center gap-1.5 text-sm text-ink-soft">
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          {verdict}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-faint">{confidenceSentence(item.claim_count)}</p>

      {item.sample_evidence.length > 0 && (
        <ul className="mt-3 space-y-2">
          {item.sample_evidence.slice(0, 2).map((quote, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-soft">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  quote.sentiment === "positive" ? "bg-positive" : quote.sentiment === "negative" ? "bg-negative" : "bg-neutral-verdict"
                }`}
              />
              <span className="italic">&ldquo;{quote.quote}&rdquo;</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
