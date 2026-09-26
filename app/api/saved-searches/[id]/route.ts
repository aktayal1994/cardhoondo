import { NextRequest } from "next/server";
import {
  badOriginResponse,
  ensureAuthEnabled,
  getAuthedUser,
  jsonNoStore,
  sameOriginOk,
  unauthorizedResponse,
} from "../../../../lib/auth/session";
import { SAVED_ITEM_COLUMNS, UUID_RE, type SavedSearchItem } from "../../../../lib/saved/items";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/saved-searches/[id]  { custom_name?: string | null, archived?: boolean }
 * Rename ("" or null clears the name) or archive/restore. Uses the user's own
 * client; the database column grants allow only these two fields to change,
 * and row-level security limits it to their own rows (others look like 404).
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const disabled = ensureAuthEnabled();
  if (disabled) return disabled;
  if (!sameOriginOk(req)) return badOriginResponse();

  const { id } = await params;
  const ctx = await getAuthedUser(req);
  if (!ctx.user) return unauthorizedResponse(ctx);
  if (!UUID_RE.test(id)) return jsonNoStore({ error: "Not found", code: "not_found" }, 404, ctx);

  let body: { custom_name?: string | null; archived?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonNoStore({ error: "Invalid JSON body", code: "bad_request" }, 400, ctx);
  }

  const patch: { custom_name?: string | null; archived?: boolean; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if ("custom_name" in body) {
    if (body.custom_name === null || body.custom_name === "") {
      patch.custom_name = null;
    } else if (typeof body.custom_name === "string") {
      const cleaned = body.custom_name.replace(/[\u0000-\u001f\u007f]/g, "").trim();
      if (cleaned.length < 1 || cleaned.length > 60) {
        return jsonNoStore({ error: "Names can be 1 to 60 characters.", code: "invalid_name" }, 400, ctx);
      }
      patch.custom_name = cleaned;
    } else {
      return jsonNoStore({ error: "Invalid name", code: "invalid_name" }, 400, ctx);
    }
  }
  if ("archived" in body) {
    if (typeof body.archived !== "boolean") return jsonNoStore({ error: "Invalid value", code: "bad_request" }, 400, ctx);
    patch.archived = body.archived;
  }

  const { data, error } = await ctx.supabase
    .from("saved_searches")
    .update(patch)
    .eq("id", id)
    .select(SAVED_ITEM_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("saved_searches update failed:", error.message);
    return jsonNoStore({ error: "Couldn't update your search", code: "server_error" }, 500, ctx);
  }
  if (!data) return jsonNoStore({ error: "This saved search no longer exists.", code: "not_found" }, 404, ctx);
  return jsonNoStore({ saved_search: data as SavedSearchItem }, 200, ctx);
}

/** DELETE /api/saved-searches/[id] -- removes the saved search (the underlying answers are erased with the account). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const disabled = ensureAuthEnabled();
  if (disabled) return disabled;
  if (!sameOriginOk(req)) return badOriginResponse();

  const { id } = await params;
  const ctx = await getAuthedUser(req);
  if (!ctx.user) return unauthorizedResponse(ctx);
  if (!UUID_RE.test(id)) return jsonNoStore({ error: "Not found", code: "not_found" }, 404, ctx);

  const { data, error } = await ctx.supabase.from("saved_searches").delete().eq("id", id).select("id");
  if (error) {
    console.error("saved_searches delete failed:", error.message);
    return jsonNoStore({ error: "Couldn't delete your search", code: "server_error" }, 500, ctx);
  }
  if (!data || data.length === 0) {
    return jsonNoStore({ error: "This saved search no longer exists.", code: "not_found" }, 404, ctx);
  }
  return jsonNoStore({ ok: true }, 200, ctx);
}
