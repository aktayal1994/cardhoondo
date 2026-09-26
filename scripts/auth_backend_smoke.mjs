/**
 * End-to-end smoke test for the saved-searches / account backend, against a
 * RUNNING dev server (npm run dev) with NEXT_PUBLIC_AUTH_ENABLED=1 in .env.local.
 *
 * It creates two throwaway users in Supabase Auth (service role), signs them in
 * with a password (bypassing Google, which can't be automated), runs every
 * route including the attack cases, then deletes everything it created.
 *
 *   node scripts/auth_backend_smoke.mjs [http://localhost:3000]
 *
 * Dev tool only: never point it at production.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3000";
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error("Refusing to run against a non-local URL: " + BASE);

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const svc = createClient(URL_, SERVICE, { auth: { persistSession: false } });

const stamp = Date.now();
const created = { users: [], phones: [] };

async function makeUser(label) {
  const email = `smoke-${label}-${stamp}@cardhoondo-test.invalid`;
  const password = `Sm0ke-${stamp}-${label}!`;
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error);
  created.users.push(data.user.id);
  return { id: data.user.id, email, password };
}

/** Sign in with a password through the SSR client and return the Cookie header a browser would send. */
async function cookieHeaderFor(user) {
  const jar = new Map();
  const client = createServerClient(URL_, ANON, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach((c) => jar.set(c.name, c.value)) },
  });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  assert.ifError(error);
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

const ORIGIN = new URL(BASE).origin;
async function call(method, path, { cookie, body, origin = ORIGIN } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  if (origin) headers.Origin = origin;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json, headers: res.headers };
}

const ANSWERS = {
  q_budget: ["10-15L", "15-20L"], q_fuel: ["Petrol"], q_seating: "4/5 seater", q_transmission: "Automatic",
  q_drive_type: "City, short trips", q_daily_commute: "20-50km", q_parking_tightness: "Somewhat tight",
  q_who_rides: ["Partner", "Young kids"], q_top2_priorities: ["Safety and build quality", "Fuel efficiency"],
  q_frustration: "Jerky or bumpy rides", q_brand_avoid: [],
};

let step = 0;
const ok = (msg) => console.log(`  ok ${String(++step).padStart(2, "0")}  ${msg}`);

async function main() {
  console.log(`Smoke test against ${BASE}`);
  const alice = await makeUser("alice");
  const bob = await makeUser("bob");
  const aCookie = await cookieHeaderFor(alice);
  const bCookie = await cookieHeaderFor(bob);

  // --- anonymous submission issues a claim token and a persona
  const phone = "9000000004";
  created.phones.push(phone);
  const rec = await call("POST", "/api/recommend", {
    body: { answers: ANSWERS, name: "Smoke Test", pincode: "122001", phone_number: phone, consent_notice_version: "2026-09-26.v2" },
  });
  assert.equal(rec.status, 200, JSON.stringify(rec.json));
  assert.match(rec.json.claim_token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(rec.json.persona.title, "The Safety-first City Family");
  ok("anonymous /api/recommend returns claim_token + persona");
  const { questionnaire_response_id: responseId, claim_token: token } = rec.json;

  // --- who am I
  let r = await call("GET", "/api/me");
  assert.equal(r.json.authenticated, false);
  ok("/api/me anonymous -> authenticated:false");
  r = await call("GET", "/api/me", { cookie: aCookie });
  assert.equal(r.json.authenticated, true);
  assert.equal(r.json.user.email, alice.email);
  assert.deepEqual(r.json.saved_searches, []);
  ok("/api/me signed in -> user + empty list");

  // --- claim: every way it should fail
  r = await call("POST", "/api/saved-searches/claim", { body: { response_id: responseId, claim_token: token } });
  assert.equal(r.status, 401);
  ok("claim without session -> 401");
  r = await call("POST", "/api/saved-searches/claim", { cookie: aCookie, origin: null, body: { response_id: responseId, claim_token: token } });
  assert.equal(r.status, 403);
  ok("claim with no Origin header -> 403 bad_origin");
  r = await call("POST", "/api/saved-searches/claim", { cookie: aCookie, origin: "https://evil.example", body: { response_id: responseId, claim_token: token } });
  assert.equal(r.status, 403);
  ok("claim from a foreign Origin -> 403");
  r = await call("POST", "/api/saved-searches/claim", { cookie: aCookie, body: { response_id: responseId, claim_token: "A".repeat(43) } });
  assert.equal(r.status, 400);
  assert.equal(r.json.code, "invalid_claim");
  ok("claim with the response id but a wrong token -> 400 invalid_claim");
  r = await call("POST", "/api/saved-searches/claim", { cookie: aCookie, body: { response_id: responseId } });
  assert.equal(r.status, 400);
  ok("claim with no token -> 400");

  // --- claim: success, idempotent, and not stealable
  r = await call("POST", "/api/saved-searches/claim", { cookie: aCookie, body: { response_id: responseId, claim_token: token, name: "Family car" } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.created, true);
  assert.equal(r.json.saved_search.custom_name, "Family car");
  assert.equal(r.json.saved_search.persona.title, "The Safety-first City Family");
  assert.ok(Array.isArray(r.json.saved_search.top_cars));
  const savedId = r.json.saved_search.id;
  ok(`claim with the real token -> saved (${r.json.saved_search.top_cars.length} top cars snapshotted)`);
  r = await call("POST", "/api/saved-searches/claim", { cookie: aCookie, body: { response_id: responseId, claim_token: token } });
  assert.equal(r.status, 200);
  assert.equal(r.json.created, false);
  assert.equal(r.json.saved_search.id, savedId);
  ok("claiming again is idempotent (same saved search, created:false)");
  r = await call("POST", "/api/saved-searches/claim", { cookie: bCookie, body: { response_id: responseId, claim_token: token } });
  assert.equal(r.status, 409);
  assert.equal(r.json.code, "already_claimed");
  ok("a second account presenting the same valid token -> 409 already_claimed");

  // --- listing and isolation
  r = await call("GET", "/api/me", { cookie: aCookie });
  assert.equal(r.json.saved_searches.length, 1);
  ok("/api/me lists the saved search");
  r = await call("GET", "/api/me", { cookie: bCookie });
  assert.equal(r.json.saved_searches.length, 0);
  ok("the other user's list is empty (row-level security)");
  r = await call("PATCH", `/api/saved-searches/${savedId}`, { cookie: bCookie, body: { custom_name: "hacked" } });
  assert.equal(r.status, 404);
  ok("another user renaming it -> 404");
  r = await call("POST", `/api/saved-searches/${savedId}/open`, { cookie: bCookie, body: {} });
  assert.equal(r.status, 404);
  ok("another user opening it -> 404");
  r = await call("DELETE", `/api/saved-searches/${savedId}`, { cookie: bCookie });
  assert.equal(r.status, 404);
  ok("another user deleting it -> 404");

  // --- rename / archive validation
  r = await call("PATCH", `/api/saved-searches/${savedId}`, { cookie: aCookie, body: { custom_name: "  Weekend SUV  " } });
  assert.equal(r.status, 200);
  assert.equal(r.json.saved_search.custom_name, "Weekend SUV");
  ok("rename trims whitespace");
  r = await call("PATCH", `/api/saved-searches/${savedId}`, { cookie: aCookie, body: { custom_name: "x".repeat(61) } });
  assert.equal(r.status, 400);
  ok("rename over 60 characters -> 400");
  r = await call("PATCH", `/api/saved-searches/${savedId}`, { cookie: aCookie, body: { custom_name: "" } });
  assert.equal(r.json.saved_search.custom_name, null);
  ok("empty name clears the label");

  // --- open re-runs the recommender; a second open reuses the stored result
  r = await call("POST", `/api/saved-searches/${savedId}/open`, { cookie: aCookie, body: {} });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.ok(Array.isArray(r.json.shortlist));
  assert.equal(r.json.diff.changed, false);
  const firstResult = r.json.recommendation_result_id;
  ok(`open re-runs the recommender (${r.json.shortlist.length} cars, diff.changed=false)`);
  r = await call("POST", `/api/saved-searches/${savedId}/open`, { cookie: aCookie, body: {} });
  assert.equal(r.json.recommendation_result_id, firstResult);
  ok("opening again reuses the stored result row (no new Gemini-eligible row)");

  // --- delete
  r = await call("DELETE", `/api/saved-searches/${savedId}`, { cookie: aCookie });
  assert.equal(r.status, 200);
  r = await call("DELETE", `/api/saved-searches/${savedId}`, { cookie: aCookie });
  assert.equal(r.status, 404);
  ok("delete works once, then 404");

  // --- account deletion erases the user and their data
  const rec2 = await call("POST", "/api/recommend", {
    body: { answers: ANSWERS, name: "Smoke Two", pincode: "122001", phone_number: "9000000005", consent_notice_version: "2026-09-26.v2" },
  });
  created.phones.push("9000000005");
  await call("POST", "/api/saved-searches/claim", { cookie: aCookie, body: { response_id: rec2.json.questionnaire_response_id, claim_token: rec2.json.claim_token } });
  r = await call("POST", "/api/account/delete", { cookie: aCookie, body: { confirm: "nope" } });
  assert.equal(r.status, 400);
  ok("account delete without typing DELETE -> 400");
  r = await call("POST", "/api/account/delete", { cookie: aCookie, body: { confirm: "DELETE" } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.deleted.saved_searches, 1);
  // Two claimed answer sets: the first (its saved search was deleted earlier, but the
  // answers stay until the account is erased) and the second.
  assert.equal(r.json.deleted.responses, 2);
  ok(`account delete -> ${JSON.stringify(r.json.deleted)}`);
  const { data: gone } = await svc.auth.admin.getUserById(alice.id);
  assert.equal(gone?.user ?? null, null);
  const { data: left } = await svc.from("questionnaire_responses").select("id").in("id", [responseId, rec2.json.questionnaire_response_id]);
  assert.equal(left.length, 0);
  const { data: person } = await svc.from("respondents").select("id").eq("phone_number", "9000000005");
  assert.equal(person.length, 0);
  ok("user, answers and phone record are really gone");

  console.log(`\nAll ${step} checks passed.`);
}

async function cleanup() {
  for (const phone of created.phones) {
    const { data: rs } = await svc.from("respondents").select("id").eq("phone_number", phone);
    for (const p of rs ?? []) {
      await svc.from("questionnaire_responses").delete().eq("respondent_id", p.id);
      await svc.from("respondents").delete().eq("id", p.id);
    }
  }
  for (const id of created.users) await svc.auth.admin.deleteUser(id).catch(() => {});
}

main()
  .catch((e) => { console.error("\nFAILED:", e.message ?? e); process.exitCode = 1; })
  .finally(cleanup);
