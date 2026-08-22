# CarDhoondo Real Frontend — Build Log

*Working log for the real Next.js questionnaire → results build (Aug 8 2026 onward). Updated after every block so a future session (or a context reset mid-session) can resume without re-deriving decisions. This is a build-tracking scratch doc, not a design source of truth — CLAUDE.md's "Frontend — Questionnaire & Results Prototype" section is still the reference for *why* each UX decision was made; this file tracks *what's been coded* against that reference.*

## Status at a glance

| Block | Status | Files |
|---|---|---|
| 0. Tailwind v4 + design tokens | ✅ done | `postcss.config.mjs`, `app/globals.css` |
| 1. Questions config + verdict helpers | ✅ done | `lib/questions.ts`, `lib/verdict.ts` |
| 2. Landing screen | ✅ done | `components/LandingScreen.tsx` |
| 3. Question card / chip UI | ✅ done | `components/QuestionCard.tsx`, `lib/questions.ts` (+`isAnswerComplete`) |
| 4. Questionnaire flow orchestration | ✅ done | `components/QuestionnaireFlow.tsx` |
| 5. Thinking bridge | ✅ done | `components/ThinkingBridge.tsx` |
| 6. Results screen | ✅ done | `components/ResultsScreen.tsx`, `lib/format.ts` |
| 7. Evidence drill-down | ✅ done | `components/CarDetail.tsx`, `app/api/car-detail/route.ts`, `lib/format.ts` (+`humanize`) |
| 8. Compare view | ✅ done | `components/CompareView.tsx` |
| 9. Top-level state machine | ✅ done | `app/page.tsx`, `app/layout.tsx` |
| 10. Browser verification | ✅ done | — |

**If resuming cold**: read this file top to bottom, then check the "Status at a glance" table for the first non-✅ row — that's where to pick up. Each block's section below has the exact decisions made so you don't need to re-derive them.

---

## Backend context (already done, don't redo)

- `/api/recommend` and `/api/writeup` are live and verified against real Supabase data (see CLAUDE.md's "Backend" section). `/api/recommend` needs no LLM key; `/api/writeup` needs `GEMINI_API_KEY` in `web/.env.local` (present but was hitting a `limit: 0` free-tier quota error as of Aug 8 — may or may not be resolved by the time frontend wiring reaches Block 9/10; if it's still failing, results screen must still degrade gracefully — see Block 6 notes).
- Exact request/response shapes are in `web/lib/scoring/recommend.ts` (`RecommendOutput`/`RecommendCandidate`), `web/lib/scoring/types.ts` (`ScoreResult`/`ScoreBreakdownItem`), `web/lib/llm/writeup.ts` (`WriteupOutput`/`WriteupCarOutput`/`WriteupFacetEntry`).
- `QuestionnaireAnswers` type (`web/lib/scoring/questionnaireWeights.ts`) is `Record<string, string | string[]>` — question ids are the literal keys used in `WEIGHT_RULES` and `recommend.ts`'s `passesStructuralFilters` (`q1_usage`, `q2_trip_pattern`, `q3_fuel`, `q4_budget`, `q5_seating`, `q6_who_rides`, `q7_top2_priorities` (array, exactly 2), `q8_compromise`, `q9_frustration`, `q10_parking`, `q11_exciting_feature`, `q12_service_cost_priority`, `q13_ownership_duration`). **These exact string keys and option strings must match `WEIGHT_RULES`/`passesStructuralFilters` verbatim** (case-sensitive) or scoring silently no-ops for that answer.

## Block 0 — Tailwind v4 + design tokens (done)

- Installed `tailwindcss@4.3.3`, `@tailwindcss/postcss`, `postcss`, `lucide-react` under `web/`.
- Tailwind v4 uses CSS-first config, not a JS config file — `app/globals.css` uses `@import "tailwindcss";` + `@theme { ... }` for custom tokens (no `tailwind.config.ts`).
- Design tokens chosen (light theme only — dark mode not a stated requirement for this product, skipped deliberately rather than left half-done):
  - Brand: `--color-navy-*` (950→50), used for primary actions/headers.
  - Background: `--color-paper` (warm off-white `#faf8f4`), `--color-paper-raised` (white, for cards).
  - Text: `--color-ink`, `--color-ink-soft`, `--color-ink-faint`.
  - Verdict semantics (kept deliberately separate from navy brand color per CLAUDE.md's evidence-legibility precedent): `--color-positive`/`-bg` (green), `--color-negative`/`-bg` (terracotta), `--color-neutral-verdict`/`-bg` (gray).
  - `--color-accent-gold` reserved for small emphasis (e.g. "confident match" pill), not yet used anywhere.
- Utility classes added: `.animate-fade-up` (question/card entrance), `.animate-pulse-dot` (thinking bridge), both no-op under `prefers-reduced-motion: reduce`.

## Block 1 — Questions config + verdict helpers (done)

- `web/lib/questions.ts`: `QUESTIONS` array (13 entries) in actual flow order (grouped by section, not raw Q-number order), each with `id` (must match `QuestionnaireAnswers` keys exactly), `section`, `prompt`, `explainer` (plain-language, no facet/weight jargon), `icon` (lucide-react component reference), `type` (`"single" | "multi2"`), `required`, and `options[]` (each with `value` -- **must match `WEIGHT_RULES`/`passesStructuralFilters` strings verbatim** -- `label` for display, and `microcopy` adaptive reaction line). Also exports `SECTIONS` (3 entries, ordered) and helpers `questionIndex(id)`/`sectionOf(id)`.
- Section grouping decided (not specified verbatim in CLAUDE.md, chosen to balance section sizes and keep parking with the household-context questions):
  - **Your drives** (4): Q1 usage, Q2 trip pattern, Q3 fuel, Q4 budget
  - **Who it's for** (3): Q5 seating, Q6 who rides, Q10 parking
  - **What matters** (6): Q7 top-2 priorities, Q8 compromise, Q9 frustration, Q11 exciting feature, Q12 service cost, Q13 ownership duration
- Budget option **display labels** use ₹ formatting ("Under ₹5 lakh") but `value` stays the raw `<5L`/`5-10L`/etc strings `BUDGET_RANGES` in `recommend.ts` expects -- label/value deliberately decoupled here, nowhere else in the config.
- `web/lib/verdict.ts`: client-safe `verdictPhrase`, `verdictTone` (new helper, not in the backend file -- maps score to `"positive"|"negative"|"neutral"` for picking the dot color), `confidenceLabel`, `claimCountConfidence`, `confidenceSentence`. Thresholds copy `lib/llm/writeup.ts` exactly.

## Block 2 — Landing screen (done)

- `web/components/LandingScreen.tsx` -- client component, takes `onStart: () => void` prop (called by the top-level state machine in Block 9 to advance to the questionnaire).
- **Deliberately used accurate copy**, not the stale prototype's verbatim "10 questions / one clear car recommendation" text CLAUDE.md flagged as a known inconsistency needing a fix "whenever the real questionnaire ships" -- this build is that trigger, so copy here says "13 quick questions" / "2-3 cars" from the start.
- Hero headline reuses Creative A's pain hook verbatim ("Asked chacha. Asked colleagues. Watched 15 YouTube videos. Still confused which car to buy?") since it's the project's own tested ad copy, not fabricated -- ties the landing page to the same message the Instagram fake-door test is already running.
- Three trust points (no dealer commissions / no sponsored results / evidence not opinion) directly encode the project's strongest positioning lever per the market research doc.
- Plain presentational component rendered by the Block 9 state machine, not a Next.js route/page itself.

## Block 3 — Question card / chip UI (done)

- `web/components/QuestionCard.tsx` -- renders one question: icon + prompt + plain-language explainer, chip options, adaptive microcopy reaction line after a pick.
- Props: `question: QuestionDef`, `value: string | string[] | undefined`, `onChange: (value) => void` (fires on every pick with the new full/partial value), `compact?: boolean` (smaller text for edit-in-place reopen vs. the full chat card).
- **Important interface decision**: `onChange` carries no "done" signal by itself -- it fires on every tap, including the 1st tap of a multi2 question (partial state, `["Ride quality and handling"]`). Completeness is decided by the new `isAnswerComplete(question, value)` helper added to `lib/questions.ts` (single: non-empty string; multi2: array of exactly 2), which the Block 4 flow orchestrator calls after every `onChange` to decide whether to auto-advance / auto-close-edit. This split (dumb chip component + a pure completeness predicate) keeps QuestionCard reusable identically in both the main flow and edit-in-place contexts without it needing to know which mode it's in.
- multi2 caps at 2 selections; tapping a 3rd option drops the oldest ("noted" reaction still fires per tap, including deselects -- deselecting doesn't show a reaction line since there's no `option.microcopy` for "unpick").
- Not yet wired to anything -- Block 4 is the orchestrator that actually sequences questions, owns the answers map, and calls this component.

## Block 4 — Questionnaire flow orchestration (done)

- `web/components/QuestionnaireFlow.tsx` -- owns all state: `answers` (the `QuestionnaireAnswers` map), `skipped` (Set of optional question ids explicitly skipped, currently only ever `q3_fuel`), `progressIndex` (how far linearly through `QUESTIONS` the user has gotten -- no branching, matches CLAUDE.md's "questions aren't modeled as dependent on each other" decision), `editingId` (which settled question, if any, is reopened inline), `profileOpen` (mobile drawer toggle).
- **Auto-advance timing**: `commitActive`/`commitEdit` both wait 550ms after `isAnswerComplete()` goes true before actually advancing/closing -- long enough for the user to read the microcopy reaction line QuestionCard just showed, short enough not to feel laggy. Picked by feel, not from a spec; revisit if it feels off in browser testing (Block 10).
- **Edit-in-place**: settled questions render as a collapsed one-line summary (prompt + chosen label, "Edit" affordance fades in on hover) via `summarize()`. Clicking it sets `editingId`, which swaps that row for a full (compact-styled) `QuestionCard` inline -- `progressIndex` never changes during an edit, so nothing after it resets, matching the "no cascading resets" decision.
- **Header back-arrow** (`jumpToLastEdit`) opens edit mode on `QUESTIONS[progressIndex - 1]` -- the most recently settled question -- as the documented "fast undo." Disabled (opacity-0) at `progressIndex === 0`.
- **Skip affordance**: only rendered when `!question.required` (currently only Q3 fuel) -- advances `progressIndex` without writing an answer, tracked in `skipped`. If the user later edits a skipped question and actually answers it, `commitEdit` removes it from `skipped` again.
- **Sections**: `SectionDivider` renders once per section transition, computed via a `lastRenderedSection` mutable variable during the settled-questions `.map()` (reset per render, not stored in state -- fine since it's a pure derivation of `settled`, not something that needs to persist).
- **Profile sidebar vs. drawer -- avoided the prototype's exact known bug** (CLAUDE.md: sidebar wasn't hidden on mobile, duplicating the drawer): sidebar uses `hidden lg:block`, the drawer trigger button and the drawer overlay itself both use `lg:hidden`, so the two are mutually exclusive purely via Tailwind breakpoint classes regardless of `profileOpen` state -- there's no code path where both could be visible at once, even accidentally.
- `ProfilePanel` is a local sub-component (not split into its own file -- small, only used here, no reuse case yet).
- Submit button ("Show my recommendations") only renders once `progressIndex >= QUESTIONS.length`; calls `onSubmit(answers)` -- wired up by Block 9.
- **Known gap, deliberately deferred**: doesn't yet validate that Q7 (`multi2`) truly has 2 entries before allowing submit -- `isAnswerComplete` already prevents `progressIndex` from advancing past Q7 until 2 are picked, so by the time `allDone` is reachable this is structurally guaranteed; no extra guard added since it'd be dead code.

## Block 5 — Thinking bridge (done)

- `web/components/ThinkingBridge.tsx` -- props `ready: boolean` (true once the real `/api/recommend` response has actually arrived) and `onDone: () => void`.
- Cycles through 5 stage strings every 1100ms (pulsing 3-dot indicator, `.animate-pulse-dot`/`.animate-fade-up` from Block 0's globals.css), stopping at the last stage if it runs out before `ready`.
- **Doesn't call `onDone` purely on a timer** -- it waits for `ready`, then enforces a `MIN_VISIBLE_MS` (1800ms) floor from mount so a fast API response still feels like real work happened, but a slow one never gets cut off early.
- **`prefers-reduced-motion: reduce` skips the stage-cycling entirely** (checked once via `matchMedia` in a mount-only effect) and calls `onDone` as soon as `ready` flips true, no animation, no artificial minimum delay -- matches CLAUDE.md's "respects prefers-reduced-motion by skipping straight through" requirement literally.
- Purely presentational + timing -- doesn't call any API itself. Block 9's state machine is expected to kick off the `/api/recommend` fetch when this screen mounts and flip a `ready` prop once the response lands.

## Block 6 — Results screen (done)

- `web/lib/format.ts`: `formatINR(amount)` -- `en-IN` locale grouping (₹13,74,788 style), `"Price unavailable"` for null.
- `web/components/ResultsScreen.tsx`: props `recommendOutput: RecommendOutput` (always present once results screen mounts), `writeup: WriteupOutput | null` (null while pending or on failure), `writeupError: boolean` (distinguishes "still loading" from "gave up"), `onSelectCar`, `onCompare`, `onRestart`.
- **Total facet count is never hardcoded** -- imports `ALL_FACETS` from `lib/scoring/questionnaireWeights.ts` and uses `ALL_FACETS.length` (currently 46, not the "47" figure CLAUDE.md's older notes use -- the two drifted apart at some point in the TS port; using the live import means the frontend can never go stale against it, unlike a hardcoded number would). Also fixed `ThinkingBridge`'s stage copy to say "review factors" without a specific count, for the same reason.
- **Progressive enhancement / graceful Gemini-quota degradation, built specifically because we're live-blocked on that quota as of Aug 8**: each card can render in three states --
  1. `writeupCar` present → real LLM headline/narrative + `reasons_to_like`/`watch_outs` from the write-up.
  2. `writeupPending` (writeup is null, no error yet) → skeleton shimmer placeholder under a "reasons to like" list already populated from `candidate.top_contributors` (positive/negative split by `contribution` sign) via a new `fallbackEntries()` helper -- so the card is fully useful even before the write-up arrives, not just after.
  3. `writeupError` true → same deterministic fallback as (2), permanently, plus a one-line "written summary isn't available right now" note instead of an infinite skeleton. This is the actual current runtime state given the `limit: 0` Gemini quota block -- verified by construction, not yet in a live browser (that's Block 10).
  - `FacetList` renders either shape (`WriteupFacetEntry` has `verdict`/`source_mix` strings; `ScoreBreakdownItem` fallback computes `verdict` via `verdictPhrase(entry.score)` from `lib/verdict.ts`) through one component via a `"verdict" in entry` type guard, so the two data sources render identically to the user.
- Coverage bar per card: literal `facets_with_data / ALL_FACETS.length` percentage bar + "X of 46 review factors covered" caption -- the CLAUDE.md-specified "real coverage bar," not a cosmetic one.
- Confidence pill text: prefers `writeupCar.confidence_label` (server-computed) but falls back to the client-side `confidenceLabel()` (`lib/verdict.ts`) from `coverage_ratio` alone before the write-up lands -- same thresholds either way, so the pill text never visibly changes when the write-up finishes loading.
- `cars_skipped_no_review_data` (cars with literally zero facet-score rows, not just excluded-by-filter variants) surfaces as an honest one-line footer note, matching the prototype's "we'd rather tell you that than guess" precedent -- reused as-is by Block 8's compare view for its locked columns.
- Empty-shortlist state (all candidates excluded/filtered) is a distinct, deliberately calm screen -- not an error state -- with a "try different answers" path back, since an empty shortlist can be a legitimate honest outcome (over-tight filters, or a real data gap) rather than a bug.
- Not yet wired -- Block 9 owns fetching `/api/recommend`/`/api/writeup` and passing their results down as these props.

## Block 7 — Evidence drill-down (done)

- **New API route added, not just frontend**: `web/app/api/car-detail/route.ts` (`POST`, body `{recommendation_result_id, car_id}`). Necessary because neither existing route exposes the *full* per-facet breakdown -- `/api/recommend`'s `top_contributors` is capped to 5, `/api/writeup`'s `reasons_to_like`/`watch_outs` capped to 4/3. This route re-runs the exact same `scoreCar()` call `/api/writeup` already makes per shortlisted car (same weight derivation, same facet/brand data fetch), so the drill-down's numbers can never drift from what the results card shows -- it's the same computation, just unfiltered. Returns `{car_id, brand, car_model, variant_id, price_on_road, score: ScoreResult}` where `score.breakdown` is the complete array (all facets with any data, not top-N).
- `web/lib/format.ts` gained `humanize(slug)` (`"fit_finish_quality"` → `"Fit Finish Quality"`) for facet/theme display names.
- `web/components/CarDetail.tsx`: props `recommendationResultId`, `carId`, `fallbackLabel` (shown as the header while the detail fetch is in flight), `onBack`. Self-fetches from `/api/car-detail` in a `useEffect` keyed on `[recommendationResultId, carId]` (refetches cleanly if the user drills into a different car).
- Breakdown grouped by `theme` (via a `Map`, insertion-ordered by whatever order `scoreCar()`'s breakdown array already has -- currently sorted by `|contribution|` descending, so themes appear in a somewhat shuffled order rather than the taxonomy's canonical theme order; **known cosmetic gap, not fixed** -- would need either a fixed theme-order constant or a second sort pass, deferred since it doesn't affect correctness).
- Each facet renders as a card: humanized facet name, a colored verdict dot (green/gray/terracotta by the same ≥0.2/>-0.2/else thresholds as `verdictTone`) + `verdictPhrase()` text, a full confidence sentence via `confidenceSentence(claim_count)` (`"High confidence · based on 11 independent reviews"`), and up to 2 real quotes from `sample_evidence`, each with its own sentiment-colored dot (not the filled-box/dashed-outline styling CLAUDE.md notes was hard to read in the original prototype -- reused the same dot convention as the verdict badge instead, one visual language across the whole product).
- Loading/error states: 3 pulsing skeleton blocks while fetching, a plain-language error line if the fetch fails (doesn't auto-retry -- user can back out and reopen).
- Not yet wired into the top-level flow -- Block 9 needs to pass a real `recommendationResultId` (from the `/api/recommend` response) through to whichever component renders this.

## Block 8 — Compare view (done)

- `web/components/CompareView.tsx` -- props `recommendationResultId`, `recommendOutput: RecommendOutput`, `onBack`.
- **Design decision beyond what CLAUDE.md's prototype notes specify**: rather than a column-per-car "reasons/watch-outs" layout (which can't align rows across cars since each car's top contributors are different facets), this builds a genuine **shared-facet comparison table**: on mount it calls `/api/car-detail` (Block 7's new route) once per shortlisted car in parallel, computes the union of facets that have data for at least one car, ranks facets by `(carsWithData desc, totalClaims desc)`, and shows the top `MAX_ROWS = 14` as table rows -- so the rows shown are the facets most cars actually have real evidence for, not an arbitrary/fixed list. Cells without data for a given car/facet pair read "No data" rather than being blank or fabricated.
- `cars_skipped_no_review_data` render as additional table columns, visually deemphasized (`opacity-70`, gray "Not enough data yet" pill, every cell "No data") -- same honestly-locked-column precedent from CLAUDE.md's prototype notes, extended to fit a real shared-row table instead of the prototype's simpler card-only layout.
- Car names for the locked columns come from `humanize(car_id)` (e.g. `maruti_grand_vitara` → "Maruti Grand Vitara") since `cars_skipped_no_review_data` is just a list of car-id strings, not full records with brand/model.
- Sticky first column (`sticky left-0`) so the factor name stays visible while horizontally scrolling through car columns on narrow screens; a "Swipe sideways to compare →" hint shows only below `sm:`.
- N parallel `/api/car-detail` calls (one per shortlisted car, typically 2-3) -- acceptable for a compare view opened on demand, not on every results-screen load.

---

## Remaining blocks (9-10) -- not yet started as of this log entry

## Block 9 — Top-level state machine (done)

- `web/app/page.tsx` -- client component, `Step = "landing" | "questionnaire" | "thinking" | "results" | "detail" | "compare" | "error"`.
- `handleSubmit(answers)`: sets step to `"thinking"`, POSTs `/api/recommend` (`{answers, top_n: 3}`). Response type is `RecommendOutput & {questionnaire_response_id, recommendation_result_id}` (matches the exact shape confirmed by the live curl test against `/api/recommend` earlier in this session -- the two ids are spread at the top level alongside the `RecommendOutput` fields, not nested). On success: stores `recommendOutput`/`recommendationResultId`, flips `recommendReady` (drives `ThinkingBridge`'s `ready` prop), then **fires `/api/writeup` without awaiting it** -- `ThinkingBridge` transitions to results as soon as `/api/recommend` is ready, and the write-up fills in progressively per Block 6's design (or degrades to `writeupError` if it fails, e.g. the current Gemini quota block).
- **New `"error"` step, not in the original block plan**: if `/api/recommend` itself throws (network failure, 500, etc. -- distinct from a write-up failure, which is recoverable/degradable), shows a plain apology screen with a restart button rather than leaving the thinking bridge spinning forever or crashing on a null `recommendOutput`.
- `restart()` resets every piece of state and bumps `flowKey`, which is passed as `key={flowKey}` to `<QuestionnaireFlow>` -- forces a full remount so its internal answers/progress state doesn't leak into a fresh attempt (`QuestionnaireFlow` owns all its own state per Block 4, so unmount/remount is the only way to reset it from outside).
- A `!recommendOutput || !recommendationResultId` guard before the `results`/`detail`/`compare` branches returns `null` instead of using non-null assertions -- unreachable in practice (those steps are only ever entered after a successful `/api/recommend` response) but keeps the type-checker satisfied without `!` assertions.
- `web/app/layout.tsx` updated to `import "./globals.css"` (was previously unstyled -- Tailwind was configured in Block 0 but never actually loaded into the app until now).
- **`npm run typecheck` passed clean on the first run** across all 9 blocks -- real signal the data contracts (`QuestionnaireAnswers`, `RecommendOutput`, `WriteupOutput`, `ScoreResult`) were followed correctly throughout, not just written to compile.

---

## Block 10 — Browser verification (done)

Ran the full flow live via the Claude Browser tool against `npm run dev` (real Supabase data, real Gemini quota state -- nothing mocked). All of the following confirmed working, not just inspected in code:

- **Landing → questionnaire**: correct copy, no console errors.
- **Auto-advance**: single-select questions advance ~550ms after pick; sidebar ("What we know about you") live-updates with the correct summarized answer after each one.
- **Skip**: Q3 (fuel, optional) skip button works, shows "Skipped" in the settled-question row, correctly omitted from the sidebar.
- **Section transitions**: header label and in-flow dividers correctly switch "Your drives" → "Who it's for" → "What matters" at the right question boundaries.
- **multi2 (Q7)**: first pick registers without advancing; second pick completes the pair (`aria-pressed` confirmed correct on both chips after React commit) and advances -- verified the earlier "not registering" read was a synchronous-read timing artifact of the test script (reading DOM before React's commit), not a real bug, once re-checked with a delay.
- **Full 13-question run** (12 answered + 1 skipped) reaching the "Show my recommendations" submit button, with every settled answer correctly reflected in both the collapsed rows and the sidebar.
- **`/api/recommend` live call**: submit → thinking bridge (real cycling stage text, no console errors) → results screen with a real 3-car shortlist (Toyota Urban Cruiser Hyryder #1, Hyundai Venue #2, Hyundai Verna #3) -- consistent with the standing test-persona ranking verified earlier via curl, confirming the full browser→API→Supabase path works end to end, not just the API in isolation.
- **Graceful Gemini-quota degradation, confirmed live, not just by code inspection**: `/api/writeup` returned a real 502 (console showed it) because the Gemini free-tier quota is still `limit: 0` as of this test -- the results screen correctly fell back to the deterministic `top_contributors`-based reasons list and showed the "written summary isn't available right now" note, exactly as designed in Block 6. This is the actual current production-equivalent behavior, not a hypothetical.
- **Evidence drill-down** (`/api/car-detail`, the new Block 7 route): real per-facet breakdown rendered -- humanized facet names, correct verdict phrases, full confidence sentences (e.g. "High confidence · based on 11 independent reviews"), and genuine mixed-sentiment quotes shown together (e.g. Fit Finish Quality, Braking Performance both showed a positive and a critical quote side by side) -- matches the "preserve both sides of the evidence" precedent from the pipeline's own aggregation design.
- **Compare view**: real shared-facet table across the 3 shortlisted cars (14 rows, ranked by data coverage as designed), 6 locked "Not enough data yet" columns for `cars_skipped_no_review_data`, all populated from parallel live `/api/car-detail` calls.
- **Mobile (375px)**: sidebar confirmed `display: none`, drawer trigger confirmed visible; opened the drawer and confirmed exactly one "What we know about you" panel renders (the collapsed-question summary text is separately visible in the main flow, which is expected and not a duplicate) -- the specific sidebar/drawer duplication bug the original HTML prototype had (per CLAUDE.md) does **not** reproduce here.
- **Tablet (768px)**: same sidebar-hidden/drawer-visible split as mobile (correct -- design intent was "sidebar on desktop only").
- **No horizontal overflow** at 768px (`scrollWidth === clientWidth`).
- **Tooling note for future sessions**: the Claude Browser tool's `read_page`/`find` accessibility-tree cache went stale partway through this test (showed only 6 buttons on a page that actually had 12, confirmed via direct `document.querySelectorAll('button')`) -- not an app bug. When `read_page`/`find` seem to be missing visible elements, cross-check with `javascript_tool` DOM queries before assuming the app is broken. Also: reading DOM state in the *same* synchronous `javascript_tool` call as a `.click()` can read pre-commit React state -- wrap the read in `setTimeout`/`Promise` with a short delay when verifying a click's effect.
- **Not exercised in this pass** (reasonable to defer, not required for "does it work"): edit-in-place after the initial 13-question run (only tested edit affordance existing, not actually reopening and changing a settled answer); the header back-arrow's jump-to-edit; empty-shortlist state (would need answers that structurally exclude everything); the `"error"` step (would need a forced `/api/recommend` failure). None of these are new code paths beyond what's already been exercised elsewhere in this pass, so risk is low, but they're honestly unverified.

**Build complete.** All 11 blocks done. The real Next.js frontend is live-verified against real Supabase data and the actual current Gemini-quota-blocked backend state, and degrades exactly as designed rather than breaking.

## Post-build fix — Gemini write-up unblocked (Aug 8, same day)

User set up billing on the AI Studio "Car Dhoondo" project. Retrying `/api/writeup` cleared the `limit: 0` quota error but hit a new, unrelated one: `gemini-2.0-flash` returned a real 404, `"This model ... is no longer available"`. Checked the live `ListModels` API response directly (`curl .../v1beta/models?key=...`) rather than guessing a replacement -- confirmed `gemini-2.5-flash`/`gemini-2.5-flash-lite` are also blocked ("no longer available to new users", i.e. gated to older projects only), but `gemini-flash-latest` (an alias, not a pinned version) works.

- `web/lib/llm/writeup.ts`'s `DEFAULT_MODEL` changed from `"gemini-2.0-flash"` to `"gemini-flash-latest"` -- deliberately an alias rather than pinning e.g. `gemini-3.5-flash`, specifically so this doesn't go stale the same way again as Google's model lineup moves on.
- **Verified twice, not once**: first via a raw curl to `/api/writeup` (real 200, full JSON with grounded headline/narrative/quotes for all 5 ranked cars), then live in the browser via a fresh full 13-question run through the Claude Browser tool -- confirmed the real LLM prose (not the fallback) actually renders on the results screen. A stale 502 console log from the *previous* (pre-fix) browser session lingered in the console history after navigation; the rendered page content -- real narrative prose, not the fallback note -- is the actual ground truth that the fix works, not the console.
- This closes the last open item from both this log and CLAUDE.md's "Real Frontend Build" section -- `/api/writeup` now works end to end with no known blockers.

## Rate limiting added — no anti-abuse controls existed until now (Aug 9)

A live-site security check found the deployed API routes had zero rate limiting: `/api/writeup` calls Gemini per request (real cost per call), and `/api/recommend`/`/api/car-detail` were open to unlimited scripted enumeration, all with no auth or bot protection in front of them.

- Added `middleware.ts` -- a per-IP, per-route request cap over a 10-minute window (`/api/writeup`: 8, `/api/recommend`: 15, `/api/car-detail`: 40). In-memory `Map`-based rather than a Redis-backed one (no new external service needed at current traffic levels).
- **Known limitation, intentional**: resets on cold start and isn't shared across concurrent serverless instances, so this is a best-effort deterrent against casual scripted abuse, not a hard global guarantee. If traffic ever justifies it, swap the `Map` for `@upstash/ratelimit` or Vercel's Firewall rate limiting instead -- same limits, enforced globally.
- Verified against a real local `next dev` server first (8 requests through, 9th/10th got `429` with correct `Retry-After`/`X-RateLimit-*` headers), then re-verified the same way directly against the live production domain after deploying -- both matched.
- No keys/secrets were found exposed in this audit (client bundles scanned for key-shaped strings; came back clean) -- this was purely an availability/cost-abuse gap, not a data-exposure one.

## "Signal" design system redesign + real logo + SEO pass, deployed to production (Aug 22)

Applied the `cardhoondo-design-system` skill (District/CRED/Spotify-benchmarked palette, type, shape, motion spec) to the live site for the first time. Full narrative lives in the internal project's `CLAUDE.md` (not part of this public repo) -- summary here since this file tracks what's actually deployed:

- New fonts (Plus Jakarta Sans display / Be Vietnam Pro body / JetBrains Mono data, via `next/font/google`, self-hosted -- General Sans from the original skill spec isn't on Google Fonts so a close cousin was substituted), the previously-unused `--color-accent-gold` wired to CTAs, and a new charcoal "stage" dark-section token set.
- Landing page rebuilt from a single hero into a full multi-section marketing page: nav, hero, trust bar, How It Works, Why CarDhoondo, FAQ (with FAQPage JSON-LD), Contact, footer.
- Design language extended to the questionnaire flow (pill chips with tactile snap, display-font headings, gold primary CTA, brand icon in the sticky header) and the thinking-bridge screen (dark stage treatment, live-computed "Weighing N review factors" instead of static copy) so the product doesn't visually seam between screens.
- Real CarDhoondo logo recovered from this repo's own git history (`git show` on the pre-migration `logo.png`, deleted when this repo was replaced by the Next.js app -- see the "Replace static waitlist page" commit) and wired into the nav, hero, footer, browser favicon/apple-touch-icon, and Open Graph/Twitter card image, plus a `logo` field on the `Organization` JSON-LD.
- **Two real bugs found and fixed post-first-look**: (1) `.stage-glow`'s CSS used the `background` shorthand, which resets `background-color` on anything it's combined with -- silently made every dark "stage" section render as the pale body background instead, caught from a user screenshot. Fixed by switching to `background-image`. (2) A hand-authored hero SVG illustration (scattered chat-bubble/play-button icons converging on a cartoon car) read as "childish" per direct user feedback -- replaced with an abstract instrument-panel/radar visualization (scattered noise points and gauge ticks resolving into the real brand mark at the center) instead of literal cartoon icons.
- Verified live on `cardhoondo.com` post-deploy: dark section backgrounds, illustration, and logo all confirmed via computed-style checks against the actual production domain, not just the local build.
