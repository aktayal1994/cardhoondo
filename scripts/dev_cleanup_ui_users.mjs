/**
 * Deletes the throwaway users created by /api/dev/session (dev-ui-*@cardhoondo-test.invalid)
 * and everything tied to them. Dev tool: run after UI testing.
 *   node scripts/dev_cleanup_ui_users.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data, error } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
if (error) throw error;
const targets = data.users.filter((u) => /^dev-ui-.*@cardhoondo-test\.invalid$/.test(u.email ?? ""));
for (const u of targets) {
  const purged = await svc.rpc("purge_user_data", { p_user_id: u.id });
  await svc.auth.admin.deleteUser(u.id);
  console.log("deleted", u.email, JSON.stringify(purged.data));
}
// Test respondents made by the UI tests (phone numbers reserved for tests).
for (const phone of ["9000000006", "9000000007"]) {
  const { data: rs } = await svc.from("respondents").select("id").eq("phone_number", phone);
  for (const p of rs ?? []) {
    await svc.from("questionnaire_responses").delete().eq("respondent_id", p.id);
    await svc.from("respondents").delete().eq("id", p.id);
    console.log("deleted test respondent", phone);
  }
}
console.log(`cleanup done (${targets.length} users)`);
