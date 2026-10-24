"use client";

import { useRef, useState } from "react";
import { Share2, Check, Link2 } from "lucide-react";
import { trackEvent } from "../lib/analytics";

/**
 * "Share" on the results page: freezes the shortlist as it is now into a
 * public link (/api/share -> /r/<token>) and hands it to the phone's share
 * sheet (WhatsApp etc.). Where there is no share sheet (most desktops) the
 * link is copied and a WhatsApp link is offered. A new link is made only
 * when the shortlist has changed since the last one.
 */
export default function ShareResultsButton({
  recommendationResultId,
  shortlistKey,
  ready,
}: {
  recommendationResultId: string;
  /** Changes whenever the cars on the list change (e.g. after "Show next best"). */
  shortlistKey: string;
  /** False while the written summary is still loading, so the link carries it. */
  ready: boolean;
}) {
  const [state, setState] = useState<"idle" | "busy" | "copied" | "error">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const made = useRef<{ key: string; url: string } | null>(null);

  async function getLink(): Promise<string> {
    if (made.current?.key === shortlistKey) return made.current.url;
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendation_result_id: recommendationResultId }),
    });
    if (!res.ok) throw new Error("share failed");
    const { path } = (await res.json()) as { path: string };
    const link = `${window.location.origin}${path}`;
    made.current = { key: shortlistKey, url: link };
    return link;
  }

  async function onShare() {
    if (state === "busy") return;
    setState("busy");
    try {
      const link = await getLink();
      setUrl(link);
      const text = "Here's my car shortlist from CarDhoondo. Ranked from real owner reviews, no dealer influence.";
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "My car shortlist", text, url: link });
          trackEvent("results_shared", { method: "share_sheet" });
          setState("idle");
          return;
        } catch (e) {
          // Closing the share sheet is not an error; fall through to copying only if sharing itself failed.
          if ((e as Error).name === "AbortError") {
            setState("idle");
            return;
          }
        }
      }
      await navigator.clipboard.writeText(link).catch(() => {});
      trackEvent("results_shared", { method: "copy" });
      setState("copied");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={onShare}
        disabled={!ready || state === "busy"}
        title={ready ? "Share this shortlist" : "Waiting for the summary to finish"}
        className="flex items-center gap-1.5 rounded-full border border-accent-rust/60 px-4 py-2 text-sm font-medium text-ink transition hover:border-accent-rust hover:bg-accent-rust/10 disabled:cursor-wait disabled:opacity-50"
      >
        <Share2 className="h-4 w-4 text-accent-rust" strokeWidth={2} />
        {state === "busy" ? "Making link…" : "Share"}
      </button>
      {state === "copied" && url && (
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-1 text-positive">
            <Check className="h-3.5 w-3.5" /> Link copied
          </span>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Here's my car shortlist from CarDhoondo: ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("results_shared", { method: "whatsapp" })}
            className="font-medium text-accent-rust-soft underline decoration-dotted underline-offset-4"
          >
            Send on WhatsApp
          </a>
        </div>
      )}
      {state === "error" && (
        <span className="flex items-center gap-1 text-xs text-negative">
          <Link2 className="h-3.5 w-3.5" /> Couldn&apos;t make the link. Try again.
        </span>
      )}
    </div>
  );
}
