"use client";

import { useState } from "react";
import { BookmarkCheck } from "lucide-react";
import type { SavedSearchItem, ShortlistDiff } from "../lib/saved/items";

/**
 * Shown above the results when a saved search is reopened: which search it is,
 * and what changed since the shortlist was last looked at (review data grows
 * weekly, so rankings can move).
 */
export default function SavedSearchBanner({
  saved,
  diff,
}: {
  saved: SavedSearchItem | null;
  diff: ShortlistDiff | null;
}) {
  const [dismissed, setDismissed] = useState(false);
  const name = saved?.custom_name ?? saved?.persona.title ?? "Saved search";

  return (
    <div className="mt-6 space-y-3">
      <p className="inline-flex items-center gap-2 rounded-full border border-border bg-paper-raised px-4 py-1.5 text-sm text-ink-soft">
        <BookmarkCheck className="h-4 w-4 text-accent-rust-soft" strokeWidth={1.75} />
        Saved search · <span className="font-medium text-ink">{name}</span>
      </p>

      {diff && diff.changed && !dismissed && (
        <div className="rounded-[20px] border border-border bg-paper-raised p-4 sm:p-5">
          <p className="font-display text-base font-semibold text-ink">Since you last looked</p>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {diff.added.map((c) => (
              <li key={`a-${c.car_id}`}>
                <span className="mr-2 font-mono text-positive">+</span>
                {c.brand} {c.car_model} entered your top 3
              </li>
            ))}
            {diff.removed.map((c) => (
              <li key={`r-${c.car_id}`}>
                <span className="mr-2 font-mono text-negative">−</span>
                {c.brand} {c.car_model} dropped out
              </li>
            ))}
            {diff.moved.map((c) => (
              <li key={`m-${c.car_id}`}>
                <span className="mr-2 font-mono text-ink-faint">↕</span>
                {c.brand} {c.car_model} moved #{c.from} → #{c.to}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-faint">New review data can change rankings.</p>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-sm text-ink-soft underline decoration-dotted underline-offset-4 hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {diff && !diff.changed && <p className="text-xs text-ink-faint">Same shortlist as last time.</p>}
    </div>
  );
}
