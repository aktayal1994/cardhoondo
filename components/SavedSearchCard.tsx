"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { patchSearchLocal, refreshMe, removeSearchLocal } from "../lib/auth/useMe";
import { topPicksLine } from "../lib/persona/derivePersona";
import type { SavedSearchItem } from "../lib/saved/items";
import { trackEvent } from "../lib/analytics";

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function openedAgo(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "opened today";
  if (days === 1) return "opened yesterday";
  return `opened ${days} days ago`;
}

/**
 * One saved search, shown as its persona ("The Safety-first City Family")
 * with four chips and the top picks -- not a list of the 11 questions it came
 * from. Whole card opens the results; a small menu renames or deletes.
 */
export default function SavedSearchCard({
  item,
  suffix,
  onDeleted,
}: {
  item: SavedSearchItem;
  /** Distinguisher when two searches share a title (computed by the parent). */
  suffix: string | null;
  onDeleted?: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(item.custom_name ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = item.custom_name ?? item.persona.title;
  const opened = openedAgo(item.last_opened_at);

  async function saveName() {
    const next = draft.trim();
    const previous = item.custom_name;
    setRenaming(false);
    setMenu(false);
    if ((next || null) === (previous ?? null)) return;
    patchSearchLocal(item.id, { custom_name: next || null });
    try {
      const res = await fetch(`/api/saved-searches/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_name: next || null }),
      });
      if (!res.ok) throw new Error("rename failed");
    } catch {
      patchSearchLocal(item.id, { custom_name: previous });
      setError("Couldn't rename. Please try again.");
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/saved-searches/${item.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error("delete failed");
      trackEvent("saved_search_delete");
      removeSearchLocal(item.id);
      onDeleted?.();
    } catch {
      setError("Couldn't delete. Please try again.");
      setBusy(false);
      setConfirmDelete(false);
      void refreshMe();
    }
  }

  return (
    <article className="flex h-full flex-col rounded-[20px] border border-border bg-paper-raised p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {renaming ? (
            <input
              autoFocus
              maxLength={60}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveName();
                if (e.key === "Escape") setRenaming(false);
              }}
              onBlur={() => void saveName()}
              aria-label="Name this search"
              placeholder={item.persona.title}
              className="w-full rounded-xl border border-border bg-paper px-3 py-1.5 font-display text-lg text-ink focus:border-accent-rust/70 focus:outline-none"
            />
          ) : (
            <h3 className="font-display text-lg font-semibold leading-snug text-ink">{title}</h3>
          )}
          {item.custom_name && !renaming && <p className="mt-0.5 text-xs text-ink-faint">{item.persona.title}</p>}
          {suffix && !item.custom_name && <p className="mt-0.5 text-xs text-ink-faint">{suffix}</p>}
        </div>

        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-label="More actions"
          aria-expanded={menu}
          className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:text-ink"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {menu && !confirmDelete && (
        <div className="mt-1 flex gap-4 text-sm">
          <button
            type="button"
            onClick={() => {
              setDraft(item.custom_name ?? "");
              setRenaming(true);
              setMenu(false);
            }}
            className="text-ink-soft underline decoration-dotted underline-offset-4 hover:text-ink"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-negative underline decoration-dotted underline-offset-4 hover:brightness-110"
          >
            Delete
          </button>
        </div>
      )}

      {confirmDelete && (
        <div className="mt-2 rounded-xl border border-negative/40 bg-negative-bg p-3 text-sm">
          <p className="text-ink">Delete this saved search?</p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={doDelete}
              className="rounded-full border border-negative/50 px-4 py-1.5 font-medium text-negative disabled:opacity-60"
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmDelete(false);
                setMenu(false);
              }}
              className="rounded-full px-4 py-1.5 text-ink-soft hover:text-ink"
            >
              Keep it
            </button>
          </div>
        </div>
      )}

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {item.persona.chips.map((chip) => (
          <li key={chip} className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-soft">
            {chip}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{topPicksLine(item.top_cars)}</p>

      <p className="mt-2 font-mono text-xs text-ink-faint">
        Saved {shortDate(item.created_at)}
        {opened ? ` · ${opened}` : ""}
      </p>

      {error && (
        <p className="mt-2 text-sm text-negative" role="alert">
          {error}
        </p>
      )}

      <Link
        href={`/saved/${item.id}`}
        className="mt-4 inline-flex h-12 items-center justify-center rounded-full bg-accent-rust px-6 text-[15px] font-semibold text-charcoal-950 shadow-glow-sm transition hover:brightness-110 active:scale-[0.98]"
      >
        Open results
      </Link>
    </article>
  );
}
