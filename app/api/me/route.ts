import { NextRequest } from "next/server";
import { AUTH_ENABLED } from "../../../lib/auth/config";
import { clearHintCookie, getAuthedUser, jsonNoStore, setHintCookie } from "../../../lib/auth/session";
import { SAVED_ITEM_COLUMNS, type SavedSearchItem } from "../../../lib/saved/items";

/**
 * GET /api/me -- who is this browser? One call gives the landing page
 * everything it needs: the user and their saved-search cards.
 *
 * Saved searches are read with the user's own client, so the database's
 * row-level security (user_id = auth.uid()) is what limits the result to
 * their own rows, not just this code.
 */
export async function GET(req: NextRequest) {
  if (!AUTH_ENABLED) return jsonNoStore({ authenticated: false, enabled: false });

  const ctx = await getAuthedUser(req);
  const { user, supabase } = ctx;

  if (!user) return clearHintCookie(jsonNoStore({ authenticated: false, enabled: true }, 200, ctx));

  const [list, archived] = await Promise.all([
    supabase
      .from("saved_searches")
      .select(SAVED_ITEM_COLUMNS)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("saved_searches").select("id", { count: "exact", head: true }).eq("archived", true),
  ]);

  if (list.error) {
    console.error("/api/me saved_searches read failed:", list.error.message);
    return jsonNoStore({ error: "Couldn't load your searches", code: "server_error" }, 500, ctx);
  }

  const meta = user.user_metadata ?? {};
  return setHintCookie(
    jsonNoStore(
      {
        authenticated: true,
        enabled: true,
        user: {
          id: user.id,
          email: user.email ?? null,
          name: (meta.full_name as string) ?? (meta.name as string) ?? null,
          avatar_url: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
          provider: (user.app_metadata?.provider as string) ?? "google",
        },
        saved_searches: (list.data ?? []) as SavedSearchItem[],
        archived_count: archived.count ?? 0,
      },
      200,
      ctx,
    ),
  );
}
