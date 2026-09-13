"use client";

import { useState } from "react";
import { trackEvent } from "../lib/analytics";

type Reaction = "makes_sense" | "not_quite" | "not_expected";

const REACTIONS: { value: Reaction; label: string }[] = [
  { value: "makes_sense", label: "This makes sense" },
  { value: "not_quite", label: "Not quite right" },
  { value: "not_expected", label: "Not what I expected" },
];

interface FeedbackPromptProps {
  recommendationResultId: string;
  /** Set when this prompt is asking about one specific car's evidence
   * (the drill-down) rather than the whole shortlist -- stored alongside
   * the reaction so the two contexts can be told apart in the data later. */
  carId?: string;
  /** Swaps the headline copy for the evidence-drilldown context. */
  variant?: "shortlist" | "evidence";
}

/**
 * The one signal missing from everything else on this page: whether the
 * recommendation itself felt right, not just whether someone clicked
 * through to see it.
 *
 * Reaction fires the instant it's tapped -- no separate "Send" step in the
 * way of the one-bit signal that matters most. A prior version required an
 * explicit Send click even for a bare reaction with no comment, which is
 * exactly the kind of extra tap that suppresses response rate on an
 * optional prompt. The comment box is a genuinely optional follow-up now:
 * typing one and clicking "Add note" patches it onto the row the reaction
 * already created (see app/api/feedback/route.ts), it never blocks the
 * reaction itself from being recorded.
 */
export default function FeedbackPrompt({ recommendationResultId, carId, variant = "shortlist" }: FeedbackPromptProps) {
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [rowId, setRowId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [reactionStatus, setReactionStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [commentStatus, setCommentStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function pickReaction(value: Reaction) {
    if (reactionStatus === "sending") return;
    setReaction(value);
    setReactionStatus("sending");
    trackEvent("feedback_reaction", { reaction: value, context: variant, car_id: carId });
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendation_result_id: recommendationResultId,
          reaction: value,
          car_id: carId,
        }),
      });
      if (!res.ok) throw new Error("feedback failed");
      const json: { id: string } = await res.json();
      setRowId(json.id);
      setReactionStatus("sent");
    } catch {
      setReactionStatus("error");
    }
  }

  async function addComment() {
    if (!rowId || !comment.trim() || commentStatus === "sending") return;
    setCommentStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId, comment: comment.trim() }),
      });
      if (!res.ok) throw new Error("comment failed");
      trackEvent("feedback_comment_added", { context: variant, car_id: carId });
      setCommentStatus("sent");
    } catch {
      setCommentStatus("error");
    }
  }

  const headline = variant === "evidence" ? "Does this evidence feel trustworthy?" : "Does this shortlist feel right for you?";

  return (
    <div className="mt-6 rounded-[20px] border border-border bg-paper-raised p-5 shadow-card sm:p-6">
      <p className="text-sm font-medium text-ink">{headline}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {REACTIONS.map((r) => {
          const isSelected = reaction === r.value;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => pickReaction(r.value)}
              aria-pressed={isSelected}
              disabled={reactionStatus === "sending" && !isSelected}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium transition active:scale-95 ${
                isSelected
                  ? "border-accent-rust bg-accent-rust text-charcoal-950 shadow-glow-sm"
                  : "border-border bg-paper text-ink hover:border-accent-rust/50 hover:bg-charcoal-800/60"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {reactionStatus === "error" && <p className="mt-2 text-sm text-negative">Couldn&apos;t send that — mind trying again?</p>}

      {reaction && reactionStatus !== "error" && (
        <div className="animate-fade-up mt-4">
          {reactionStatus === "sent" && commentStatus === "idle" && (
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-faint">
              <span className="h-1 w-1 rounded-full bg-accent-rust" />
              Got it — thanks. Anything specific? (optional)
            </p>
          )}
          {commentStatus !== "sent" && reactionStatus === "sent" && (
            <>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                rows={2}
                placeholder="e.g. wanted more diesel options, didn't expect this brand..."
                className="w-full resize-none rounded-xl border border-border bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint transition focus:border-accent-rust/70 focus:shadow-glow-sm focus:outline-none"
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={addComment}
                  disabled={!comment.trim() || commentStatus === "sending"}
                  className="rounded-full bg-accent-rust px-6 py-2.5 text-sm font-semibold text-charcoal-950 shadow-glow-sm transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {commentStatus === "sending" ? "Sending…" : "Add note"}
                </button>
                {commentStatus === "error" && <p className="text-sm text-negative">Couldn&apos;t send — try again?</p>}
              </div>
            </>
          )}
          {commentStatus === "sent" && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <span className="h-1 w-1 rounded-full bg-accent-rust" />
              Thanks — this helps us get better.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
