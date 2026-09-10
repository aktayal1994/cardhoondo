"use client";

import { useState } from "react";

type Reaction = "makes_sense" | "not_quite" | "not_expected";

const REACTIONS: { value: Reaction; label: string }[] = [
  { value: "makes_sense", label: "This makes sense" },
  { value: "not_quite", label: "Not quite right" },
  { value: "not_expected", label: "Not what I expected" },
];

/**
 * The one signal missing from everything else on this page: whether the
 * recommendation itself felt right, not just whether someone clicked
 * through to see it. Tap a reaction, optionally add a line on what's off,
 * one send. Single insert (no anon update policy on
 * recommendation_feedback -- see supabase/schema.sql), so the comment box
 * is collected before sending rather than patched in after.
 */
export default function FeedbackPrompt({ recommendationResultId }: { recommendationResultId: string }) {
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    if (!reaction || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendation_result_id: recommendationResultId,
          reaction,
          comment: comment.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("feedback failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="animate-fade-up mt-6 rounded-[20px] border border-border bg-paper-raised p-5 text-center sm:p-6">
        <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink">
          <span className="h-1 w-1 rounded-full bg-accent-gold" />
          Thanks — this helps us get better.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-[20px] border border-border bg-paper-raised p-5 sm:p-6">
      <p className="text-sm font-medium text-ink">Does this shortlist feel right for you?</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {REACTIONS.map((r) => {
          const isSelected = reaction === r.value;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => setReaction(r.value)}
              aria-pressed={isSelected}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium transition active:scale-95 ${
                isSelected
                  ? "border-navy-900 bg-navy-900 text-white shadow-sm"
                  : "border-border bg-paper text-ink hover:border-navy-500 hover:bg-navy-50"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {reaction && (
        <div className="animate-fade-up mt-4">
          <label htmlFor="feedback-comment" className="text-xs font-medium text-ink-faint">
            Anything specific? (optional)
          </label>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="e.g. wanted more diesel options, didn't expect this brand..."
            className="mt-1.5 w-full resize-none rounded-xl border border-border bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-navy-500 focus:outline-none"
          />

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={status === "sending"}
              className="rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-950 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "sending" ? "Sending…" : "Send"}
            </button>
            {status === "error" && <p className="text-sm text-negative">Couldn't send — try again?</p>}
          </div>
        </div>
      )}
    </div>
  );
}
