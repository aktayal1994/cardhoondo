"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Plus, Quote, Search, X } from "lucide-react";
import QuestionCard from "./QuestionCard";
import { QUESTIONS, type QuestionDef } from "../lib/questions";
import type { QuestionnaireAnswers } from "../lib/scoring/questionnaireWeights";
import { useCatalogOptions } from "../lib/useCatalogOptions";
import { carDisplayName } from "../lib/cars/featured";
import { fuelLabel } from "../lib/cars/format";
import { formatOnRoad } from "../lib/format";
import { trackEvent } from "../lib/analytics";
import { DECIDE_QUESTION_IDS, type DecideArea, type DecideCar, type DecideResult } from "../lib/decide/types";

const MIN_CARS = 2;
/** From this many cars on, a gentle pointer to Find my car (never a block). */
const MANY_CARS = 7;

interface PickableCar {
  car_id: string;
  brand: string;
  model: string;
  name: string;
  fuels: string[];
  minPrice: number | null;
}

/** Popular cross-shops offered as one-tap starts (only those we can rank). */
const QUICK_PAIRS: [string, string][] = [
  ["maruti_baleno", "maruti_swift"],
  ["hyundai_creta", "kia_seltos"],
  ["tata_nexon", "maruti_brezza"],
  ["tata_punch", "hyundai_exter"],
  ["honda_city", "hyundai_verna"],
  ["hyundai_venue", "kia_sonet"],
];

function lakh(n: number | null): string {
  if (n == null) return "";
  return `from ₹${(n / 100000).toFixed(1)} lakh`;
}

export default function DecideFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const rows = useCatalogOptions();

  const cars: PickableCar[] = useMemo(() => {
    const byId = new Map<string, PickableCar>();
    for (const r of rows ?? []) {
      const c = byId.get(r.car_id) ?? {
        car_id: r.car_id,
        brand: r.brand,
        model: r.model,
        name: carDisplayName(r.brand, r.model),
        fuels: [],
        minPrice: null,
      };
      const f = r.fuel ? fuelLabel(r.fuel) : "";
      if (f && !c.fuels.includes(f)) c.fuels.push(f);
      if (r.price != null && (c.minPrice == null || r.price < c.minPrice)) c.minPrice = r.price;
      byId.set(r.car_id, c);
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);
  const carById = useMemo(() => new Map(cars.map((c) => [c.car_id, c])), [cars]);

  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [stage, setStage] = useState<"pick" | "ask" | "result">("pick");
  const [result, setResult] = useState<DecideResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // ?cars=a,b from a comparison or car page starts with them picked.
  useEffect(() => {
    if (!rows) return;
    const fromUrl = (params.get("cars") ?? "")
      .split(",")
      .filter((id) => carById.has(id));
    if (fromUrl.length > 0) setPicked(Array.from(new Set(fromUrl)));
    if (fromUrl.length >= MIN_CARS) setStage("ask");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    setQuery("");
  }

  // The fuel question only offers fuels at least one picked car is sold in.
  const questions: QuestionDef[] = useMemo(() => {
    const fuels = new Set(picked.flatMap((id) => carById.get(id)?.fuels ?? []));
    return DECIDE_QUESTION_IDS.map((id) => QUESTIONS.find((q) => q.id === id)!)
      .filter(Boolean)
      .map((q) => {
        if (q.id !== "q_fuel") return q;
        const options = q.options.filter(
          (o) => o.value === "No preference" || fuels.has(o.value) || (o.value === "Petrol" && fuels.has("Hybrid")),
        );
        return { ...q, options, prompt: "Which fuel would you go for?" };
      })
      .filter((q) => !(q.id === "q_fuel" && q.options.length <= 2));
  }, [picked, carById]);

  const visible = questions.filter((q) => !q.shouldShow || q.shouldShow(answers));
  const missing = visible.filter((q) => {
    if (!q.required) return false;
    const v = answers[q.id];
    return v == null || (Array.isArray(v) && v.length === 0);
  });

  function setAnswer(id: string, v: string | string[]) {
    setAnswers((a) => {
      const next = { ...a, [id]: v };
      // Drop answers to questions that are now hidden (e.g. gearbox for EV-only).
      for (const q of questions) if (q.shouldShow && !q.shouldShow(next)) delete next[q.id];
      return next;
    });
  }

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ car_ids: picked, answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Something went wrong.");
      setResult(json as DecideResult);
      setStage("result");
      router.replace(`/decide?cars=${picked.join(",")}`, { scroll: false });
      trackEvent("decide_run", { cars: picked.length });
      scrollTop();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!rows) {
    return <p className="mt-8 text-sm text-ink-soft">Loading cars…</p>;
  }

  return (
    <div ref={topRef} className="scroll-mt-24">
      <PickedBar picked={picked} carById={carById} onRemove={stage === "pick" ? toggle : undefined} />

      {stage === "pick" && (
        <section className="mt-6">
          <h2 className="font-display text-xl font-bold text-ink">Which cars are you stuck between?</h2>
          <p className="mt-1 text-sm text-ink-soft">Add {MIN_CARS} or more. We&rsquo;ll rank only these, for how you drive.</p>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={picked.length === 0 ? "Type a car, e.g. Baleno" : "Add another car"}
              className="w-full rounded-xl border border-border bg-paper-raised py-3 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent-rust/70 focus:outline-none disabled:opacity-60"
              aria-label="Search cars"
            />
          </div>

          {query.trim().length > 0 && (
            <ul className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-border bg-paper-raised">
              {cars
                .filter((c) => `${c.name} ${c.model}`.toLowerCase().includes(query.trim().toLowerCase()))
                .slice(0, 12)
                .map((c) => (
                  <li key={c.car_id}>
                    <button
                      type="button"
                      onClick={() => toggle(c.car_id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-wash"
                    >
                      <span>
                        <span className="font-semibold text-ink">{c.name}</span>
                        <span className="block text-xs text-ink-faint">
                          {c.fuels.join(", ")} {c.minPrice ? `· ${lakh(c.minPrice)}` : ""}
                        </span>
                      </span>
                      {picked.includes(c.car_id) ? (
                        <Check className="h-4 w-4 text-accent-rust" />
                      ) : (
                        <Plus className="h-4 w-4 text-ink-faint" />
                      )}
                    </button>
                  </li>
                ))}
            </ul>
          )}

          {picked.length === 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Or start with a common one</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_PAIRS.filter(([a, b]) => carById.has(a) && carById.has(b)).map(([a, b]) => (
                  <button
                    key={`${a}-${b}`}
                    type="button"
                    onClick={() => setPicked([a, b])}
                    className="rounded-full border border-border bg-paper-raised px-4 py-2 text-sm font-medium text-ink transition hover:border-accent-rust/50"
                  >
                    {carById.get(a)!.model} vs {carById.get(b)!.model}
                  </button>
                ))}
              </div>
            </div>
          )}

          {picked.length >= MANY_CARS && (
            <p className="mt-6 rounded-[14px] bg-wash px-4 py-3 text-sm text-ink">
              That&rsquo;s a long list.{" "}
              <Link href="/questionnaire/core-requirements" className="font-semibold text-accent-rust underline underline-offset-2">
                Find my car
              </Link>{" "}
              can narrow it down for you, or carry on here.
            </p>
          )}

          <button
            type="button"
            disabled={picked.length < MIN_CARS}
            onClick={() => {
              setStage("ask");
              trackEvent("decide_cars_picked", { count: picked.length });
              scrollTop();
            }}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-rust px-5 py-3 text-sm font-semibold text-stage transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {picked.length < MIN_CARS ? `Pick ${MIN_CARS - picked.length} more` : "Next: how you drive"} <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {stage === "ask" && (
        <section className="mt-6">
          <button type="button" onClick={() => setStage("pick")} className="text-sm font-medium text-accent-rust underline underline-offset-2">
            Change cars
          </button>
          <div className="mt-6 space-y-10">
            {visible.map((q) => (
              <QuestionCard key={q.id} question={q} value={answers[q.id]} answers={answers} onChange={(v) => setAnswer(q.id, v)} compact />
            ))}
          </div>
          {error && <p className="mt-6 text-sm font-medium text-red-700">{error}</p>}
          <button
            type="button"
            disabled={missing.length > 0 || loading}
            onClick={run}
            className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-rust px-5 py-3 text-sm font-semibold text-stage transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {loading ? "Weighing them up…" : missing.length > 0 ? `${missing.length} more to answer` : "Which one suits me?"}
            {!loading && missing.length === 0 && <ArrowRight className="h-4 w-4" />}
          </button>
        </section>
      )}

      {stage === "result" && result && (
        <ResultView
          result={result}
          onEdit={() => {
            setStage("ask");
            scrollTop();
          }}
          onRestart={() => {
            setPicked([]);
            setAnswers({});
            setResult(null);
            setStage("pick");
            router.replace("/decide", { scroll: false });
          }}
        />
      )}
    </div>
  );
}

function PickedBar({
  picked,
  carById,
  onRemove,
}: {
  picked: string[];
  carById: Map<string, PickableCar>;
  onRemove?: (id: string) => void;
}) {
  if (picked.length === 0) return null;
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {picked.map((id, i) => (
        <span key={id} className="flex items-center gap-2">
          {i > 0 && <span className="text-xs font-semibold text-ink-faint">vs</span>}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-rust px-3.5 py-1.5 text-sm font-semibold text-stage">
            {carById.get(id)?.model ?? id}
            {onRemove && (
              <button type="button" onClick={() => onRemove(id)} aria-label={`Remove ${carById.get(id)?.model ?? id}`} className="-mr-1 rounded-full p-0.5 hover:bg-white/20">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        </span>
      ))}
    </div>
  );
}

type Strength = "clear" | "close" | "tie";

const STRENGTH_HEADLINE: Record<Strength, (w: string, r: string) => string> = {
  clear: (w, r) => `The ${w} suits you better than the ${r}.`,
  close: (w, r) => `The ${w} edges it, but the ${r} is close.`,
  tie: (w, r) => `For you, the ${w} and ${r} are too close to call.`,
};

const STRENGTH_LINE: Record<Strength, string> = {
  clear: "For the way you drive and what you care about, the reviews clearly lean one way.",
  close: "It comes down to a few areas. If the ones below matter most to you, go with the leader. If not, let the test drive and the price decide.",
  tie: "Reviews rate them about the same for what you need. Let the test drive, the variant you can afford and the dealer's price decide.",
};

/** One line per car in the ranked list, measured against #1. */
const RANK_LINE: Record<Strength, (w: string) => string> = {
  clear: (w) => `Clearly behind the ${w} for you`,
  close: (w) => `Close behind the ${w}`,
  tie: (w) => `Level with the ${w} for you`,
};

function ResultView({ result, onEdit, onRestart }: { result: DecideResult; onEdit: () => void; onRestart: () => void }) {
  const { cars, not_fit, verdict } = result;
  const byId = new Map(cars.map((c) => [c.car_id, c]));
  const winner = cars[0];
  const [otherId, setOtherId] = useState<string | undefined>(verdict?.runner_up_id);
  const other = otherId ? byId.get(otherId) : undefined;
  const matchup = verdict && otherId ? verdict.matchups[otherId] : undefined;
  const matchupRef = useRef<HTMLDivElement>(null);

  function showMatchup(id: string) {
    setOtherId(id);
    requestAnimationFrame(() => matchupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const runnerUp = verdict ? byId.get(verdict.runner_up_id) : undefined;
  const headlineMatchup = verdict ? verdict.matchups[verdict.runner_up_id] : undefined;

  return (
    <section className="mt-6">
      {runnerUp && headlineMatchup ? (
        <div className="rounded-[14px] bg-stage px-5 py-6 text-white sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Our verdict for you</p>
          <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
            {STRENGTH_HEADLINE[headlineMatchup.strength](winner.model, runnerUp.model)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/85">{STRENGTH_LINE[headlineMatchup.strength]}</p>
        </div>
      ) : winner ? (
        <div className="rounded-[14px] bg-stage px-5 py-6 text-white sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Our verdict for you</p>
          <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Only the {winner.model} fits what you need.</h2>
        </div>
      ) : (
        <div className="rounded-[14px] border border-border bg-paper-raised px-5 py-6">
          <h2 className="font-display text-xl font-bold text-ink">None of these fit what you told us.</h2>
          <p className="mt-1 text-sm text-ink-soft">See why below, or let Find my car suggest cars that do.</p>
        </div>
      )}

      {verdict && cars.length >= 3 && (
        <ol className="mt-6 divide-y divide-border rounded-[14px] border border-border bg-paper-raised">
          {cars.map((c) => {
            const m = verdict.matchups[c.car_id];
            return (
              <li key={c.car_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="font-display font-bold text-ink">
                    #{c.rank} {c.model}
                  </span>
                  <span className="block text-sm text-ink-soft">{m ? RANK_LINE[m.strength](winner.model) : "Best fit for what you told us"}</span>
                </span>
                {m && (
                  <button
                    type="button"
                    onClick={() => showMatchup(c.car_id)}
                    aria-pressed={otherId === c.car_id}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      otherId === c.car_id ? "border-accent-rust bg-accent-rust text-stage" : "border-border text-accent-rust hover:border-accent-rust/50"
                    }`}
                  >
                    {otherId === c.car_id ? "Shown below" : `vs ${winner.model}`}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {not_fit.length > 0 && (
        <div className="mt-4 rounded-[14px] border border-border bg-paper-raised p-4">
          {not_fit.map((n) => (
            <div key={n.car_id} className="mt-3 first:mt-0">
              <p className="text-sm font-semibold text-ink">Why the {n.model} is out</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-ink-soft">
                {n.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {matchup && other && (
        <div ref={matchupRef} className="scroll-mt-24">
          {cars.length >= 3 && (
            <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {winner.model} vs {other.model}
            </p>
          )}
          {matchup.ahead.length > 0 && (
            <AreaList title={`Where the ${winner.model} is ahead`} areas={matchup.ahead} lead={winner.model} other={other.model} leadIsWinner />
          )}
          {matchup.behind.length > 0 && (
            <AreaList title={`Where the ${other.model} is ahead`} areas={matchup.behind} lead={other.model} other={winner.model} leadIsWinner={false} />
          )}
          {matchup.ahead.length === 0 && matchup.behind.length === 0 && (
            <p className="mt-6 text-ink-soft">
              No single area separates the {winner.model} and {other.model} clearly in the reviews. The difference comes from many
              small ones and from the size and fuel checks below.
            </p>
          )}
        </div>
      )}

      <div className={`mt-8 grid gap-4 ${cars.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
        {cars.map((c) => (
          <CarCard key={c.car_id} car={c} slug={result.car_pages[c.car_id]} />
        ))}
      </div>

      {result.compare_links.length > 0 && (
        <p className="mt-6 text-sm text-ink-soft">
          Want the full head-to-head?{" "}
          {result.compare_links.map((l, i) => (
            <span key={l.slug}>
              {i > 0 && " · "}
              <Link href={`/compare/${l.slug}`} className="font-medium text-accent-rust underline underline-offset-2">
                {l.a} vs {l.b}
              </Link>
            </span>
          ))}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={onEdit} className="rounded-lg border border-border bg-paper-raised px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent-rust/50">
          Change my answers
        </button>
        <button type="button" onClick={onRestart} className="rounded-lg border border-border bg-paper-raised px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent-rust/50">
          Compare other cars
        </button>
        <Link
          href="/questionnaire/core-requirements"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-rust px-5 py-3 text-sm font-semibold text-stage transition hover:brightness-105"
        >
          Not sure about any of them? Find my car <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-ink-faint">
        Ranked with the same scoring as Find my car, using only owner and expert reviews. Prices are New Delhi on-road. No dealer or maker pays to change this.
      </p>
    </section>
  );
}

function AreaList({
  title,
  areas,
  lead,
  other,
  leadIsWinner,
}: {
  title: string;
  areas: DecideArea[];
  lead: string;
  other: string;
  leadIsWinner: boolean;
}) {
  return (
    <div className="mt-8">
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      <ul className="mt-3 space-y-3">
        {areas.map((a) => {
          const leadVerdict = leadIsWinner ? a.winner_verdict : a.other_verdict;
          const otherVerdict = leadIsWinner ? a.other_verdict : a.winner_verdict;
          return (
            <li key={a.facet} className="rounded-[14px] border border-border bg-paper-raised p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{a.label}</span>
                {a.matters_to_you && (
                  <span className="rounded bg-wash px-2 py-0.5 text-xs font-semibold text-accent-rust">Matters to you</span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {lead}: <span className="font-medium text-ink">{leadVerdict}</span> · {other}: {otherVerdict}
              </p>
              {a.quote && (
                <p className="mt-2 flex gap-2 text-sm italic text-ink-soft">
                  <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
                  <span>{a.quote}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CarCard({ car, slug }: { car: DecideCar; slug?: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-paper-raised p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">#{car.rank} for you</p>
      <h3 className="mt-1 font-display text-lg font-bold text-ink">{car.name}</h3>
      <p className="mt-0.5 text-xs text-ink-faint">
        Best version for you: {car.variant_id} · {car.fuel}
        {car.transmission ? ` ${car.transmission.toLowerCase()}` : ""}
      </p>
      <p className="mt-1 text-sm font-medium text-ink">{formatOnRoad(car.price_on_road, "New Delhi", "delhi")}</p>

      {car.strengths.length > 0 && (
        <>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Reviews praise</p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
            {car.strengths.map((s) => (
              <li key={s.facet}>
                {s.label}: <span className="text-ink">{s.verdict}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {car.weaknesses.length > 0 && (
        <>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Reviews complain about</p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
            {car.weaknesses.map((s) => (
              <li key={s.facet}>
                {s.label}: <span className="text-ink">{s.verdict}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {car.adjustments.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs leading-relaxed text-ink-soft">
          {car.adjustments.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      {slug && (
        <Link href={`/cars/${slug}`} className="mt-3 inline-block text-sm font-medium text-accent-rust underline underline-offset-2">
          Full {car.model} review
        </Link>
      )}
    </div>
  );
}
