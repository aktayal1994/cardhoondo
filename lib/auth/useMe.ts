"use client";

import { useSyncExternalStore } from "react";
import { AUTH_ENABLED, HINT_COOKIE } from "./config";
import type { SavedSearchItem } from "../saved/items";

/**
 * Client-side view of "who am I". One module-level store shared by every
 * component, one in-flight request, no Supabase in the browser: identity comes
 * from GET /api/me (httpOnly session cookie, checked on the server).
 *
 * Anonymous visitors make ZERO extra requests: /api/me is only called when the
 * non-httpOnly `ch_hint` cookie says this browser recently had a session.
 */

export interface MeUser {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  provider: string;
}

export interface MeState {
  status: "unknown" | "anonymous" | "authed";
  user: MeUser | null;
  searches: SavedSearchItem[];
  archivedCount: number;
}

const INITIAL: MeState = { status: "unknown", user: null, searches: [], archivedCount: 0 };
const ANONYMOUS: MeState = { status: "anonymous", user: null, searches: [], archivedCount: 0 };

let state: MeState = INITIAL;
let inFlight: Promise<void> | null = null;
let started = false;
const listeners = new Set<() => void>();

function set(next: MeState) {
  state = next;
  // Keep the pre-hydration space reservation (see .welcome-slot) truthful: it
  // must disappear the moment we learn there is no session.
  try {
    if (next.status === "anonymous") document.documentElement.removeAttribute("data-auth");
    else if (next.status === "authed") document.documentElement.setAttribute("data-auth", "1");
  } catch {
    /* not in a browser */
  }
  listeners.forEach((l) => l());
}

function hasHint(): boolean {
  try {
    return document.cookie.split(";").some((c) => c.trim().startsWith(`${HINT_COOKIE}=1`));
  } catch {
    return false;
  }
}

async function load(): Promise<void> {
  try {
    const res = await fetch("/api/me", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) throw new Error("me failed");
    const json = await res.json();
    if (json.authenticated) {
      set({
        status: "authed",
        user: json.user,
        searches: json.saved_searches ?? [],
        archivedCount: json.archived_count ?? 0,
      });
    } else {
      set(ANONYMOUS);
    }
  } catch {
    // Offline or server trouble: treat as anonymous for now. The hint cookie
    // stays, so the next refresh() gets another chance.
    set(ANONYMOUS);
  }
}

/** Re-checks the session (and saved searches) from the server. Safe to call often. */
export function refreshMe(): Promise<void> {
  if (!AUTH_ENABLED) {
    if (state.status !== "anonymous") set(ANONYMOUS);
    return Promise.resolve();
  }
  if (!inFlight) {
    inFlight = load().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (!AUTH_ENABLED || !hasHint()) {
    set(ANONYMOUS);
    return;
  }
  void refreshMe();
}

/** Optimistic local edits so the UI feels instant; the server call follows. */
export function patchSearchLocal(id: string, patch: Partial<SavedSearchItem>) {
  set({ ...state, searches: state.searches.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
}

export function removeSearchLocal(id: string) {
  set({ ...state, searches: state.searches.filter((s) => s.id !== id) });
}

export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/signout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  } finally {
    set(ANONYMOUS);
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  start();
  return () => {
    listeners.delete(cb);
  };
}

export function useMe(): MeState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
}
