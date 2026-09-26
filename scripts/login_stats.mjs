/**
 * Private report: how many people signed in and saved searches, and the key
 * ratio, the SAVE RATE (of searches that could be saved, how many were).
 *
 * Reads the real database (service role), so it is accurate even for visitors
 * who declined analytics cookies. Prints counts only, never names or emails.
 *
 *   node scripts/login_stats.mjs                       (since the launch time below)
 *   node scripts/login_stats.mjs --since 2026-10-01    (or any date/time)
 *
 * Run from web/ (reads .env.local). Test accounts (@cardhoondo-test.invalid)
 * are excluded.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// When sign-in went live for real visitors (UTC). Override with --since.
const DEFAULT_SINCE = "2026-09-26T11:20:00Z";

const argIdx = process.argv.indexOf("--since");
const since = new Date(argIdx > -1 ? process.argv[argIdx + 1] : DEFAULT_SINCE);
if (Number.isNaN(since.getTime())) throw new Error("Could not read the --since date");
const sinceIso = since.toISOString();
const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function count(q) {
  const { count: n, error } = await q;
  if (error) throw error;
  return n ?? 0;
}

// --- accounts (Supabase Auth), minus test accounts
const users = [];
for (let page = 1; ; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  users.push(...data.users);
  if (data.users.length < 200) break;
}
const real = users.filter((u) => !(u.email ?? "").endsWith("@cardhoondo-test.invalid"));
const accountsSince = real.filter((u) => u.created_at >= sinceIso).length;
const accountsWeek = real.filter((u) => u.created_at >= weekAgo).length;
const realIds = new Set(real.map((u) => u.id));

// --- saved searches (real accounts only)
const { data: saved, error: savedErr } = await db.from("saved_searches").select("user_id, created_at, archived");
if (savedErr) throw savedErr;
const realSaved = saved.filter((s) => realIds.has(s.user_id));
const savesSince = realSaved.filter((s) => s.created_at >= sinceIso).length;
const savesWeek = realSaved.filter((s) => s.created_at >= weekAgo).length;
const savers = new Set(realSaved.map((s) => s.user_id)).size;
const repeatSavers = Object.values(
  realSaved.reduce((acc, s) => ((acc[s.user_id] = (acc[s.user_id] ?? 0) + 1), acc), {}),
).filter((n) => n >= 2).length;

// --- save rate: searches submitted since launch that carried a claim token, and how many were claimed
const submitted = await count(
  db.from("questionnaire_responses").select("id", { count: "exact", head: true }).gte("submitted_at", sinceIso).not("claim_token_hash", "is", null),
);
const claimed = await count(
  db.from("questionnaire_responses").select("id", { count: "exact", head: true }).gte("submitted_at", sinceIso).not("claimed_by", "is", null),
);
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : "n/a");

const line = (label, value) => console.log(`  ${label.padEnd(46)} ${value}`);
console.log(`\nLogin & saved-searches report  (since ${sinceIso.slice(0, 16).replace("T", " ")} UTC)\n`);
console.log("Sign-ins");
line("Accounts, all time", real.length);
line("New accounts since launch", accountsSince);
line("New accounts in the last 7 days", accountsWeek);
console.log("\nSaved searches");
line("Saved searches since launch", savesSince);
line("Saved searches in the last 7 days", savesWeek);
line("People who have saved at least one", `${savers}  (of ${real.length} accounts = ${pct(savers, real.length)})`);
line("People who saved 2 or more (came back to save again)", repeatSavers);
console.log("\nThe key ratio");
line("Searches submitted since launch", submitted);
line("...of which were saved to an account", claimed);
line("SAVE RATE", pct(claimed, submitted));
console.log(
  "\nHow to read it: the save rate is the share of all searches that ended up saved. Sign-ups and saves\n" +
    "come from real database rows, so they include people who declined analytics cookies.\n",
);
