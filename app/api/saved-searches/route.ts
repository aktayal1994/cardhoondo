import { NextRequest } from "next/server";
import { ensureAuthEnabled, getAuthedUser, jsonNoStore, unauthorizedResponse } from "../../../lib/auth/session";
import { SAVED_ITEM_COLUMNS, type SavedSearchItem } from "../../../lib/saved/items";

/** GET /api/saved-searches[?archived=1] -- the signed-in user's saved searches (RLS-scoped). */
export async function GET(req: NextRequest) {
  const disabled = ensureAuthEnabled();
  if (disabled) return disabled;

  const ctx = await getAuthedUser(req);
  if (!ctx.user) return unauthorizedResponse(ctx);

  const archived = req.nextUrl.searchParams.get("archived") === "1";
  const { data, error } = await ctx.supabase
    .from("saved_searches")
    .select(SAVED_ITEM_COLUMNS)
    .eq("archived", archived)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("/api/saved-searches list failed:", error.message);
    return jsonNoStore({ error: "Couldn't load your searches", code: "server_error" }, 500, ctx);
  }
  return jsonNoStore({ saved_searches: (data ?? []) as SavedSearchItem[] }, 200, ctx);
}
