import type { QuestionnaireAnswers } from "../scoring/questionnaireWeights";

/**
 * Deterministic "persona" for a search: a plain-language title + four chips
 * built from the 11 answers, so a returning user sees "The Safety-first City
 * Family" instead of a list of questions. Pure -- no LLM, no server-only
 * imports, so it runs on the server (stored when a search is saved) and in
 * the browser (previews). Rules and worked examples: docs/login_flow_design.md
 * section C.9. Bump PERSONA_VERSION if the rules change.
 */

export const PERSONA_VERSION = 1 as const;

export interface PersonaAttrs {
  budget: string;
  fuelTrans: string;
  seating: string;
  priorities: string;
  parking: string | null;
  commute: string | null;
  who: string;
  drive: string | null;
  brandAvoid: number;
}

export interface Persona {
  version: 1;
  title: string;
  chips: [string, string, string, string];
  attrs: PersonaAttrs;
}

export interface TopCarSnapshot {
  car_id: string;
  brand: string;
  car_model: string;
  variant_id: string;
  price_on_road: number | null;
  rank: number;
}

function asArray(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v;
  return v ? [v] : [];
}

// ---------------------------------------------------------------------------
// Budget chip
// ---------------------------------------------------------------------------

const BUDGET_ORDER = ["<5L", "5-10L", "10-15L", "15-20L", "20-25L", ">25L"];
const BUDGET_BOUNDS: Record<string, [number, number]> = {
  "<5L": [0, 5],
  "5-10L": [5, 10],
  "10-15L": [10, 15],
  "15-20L": [15, 20],
  "20-25L": [20, 25],
  ">25L": [25, Infinity],
};

function budgetChip(selected: string[]): string {
  const idxs = BUDGET_ORDER.map((b, i) => (selected.includes(b) ? i : -1)).filter((i) => i >= 0);
  if (idxs.length === 0) return "Any budget";

  const runs: number[][] = [];
  for (const i of idxs) {
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === i - 1) last.push(i);
    else runs.push([i]);
  }

  const fmt = (run: number[]): string => {
    const lo = BUDGET_BOUNDS[BUDGET_ORDER[run[0]]][0];
    const hi = BUDGET_BOUNDS[BUDGET_ORDER[run[run.length - 1]]][1];
    if (lo === 0 && hi === Infinity) return "Any budget";
    if (lo === 0) return `Under ₹${hi}L`;
    if (hi === Infinity) return `₹${lo}L+`;
    return `₹${lo}–${hi}L`;
  };

  if (runs.length <= 2) return runs.map(fmt).join(" · ");
  return `${fmt(runs[0])} +${runs.length - 1} more`;
}

// ---------------------------------------------------------------------------
// Fuel / gearbox chip
// ---------------------------------------------------------------------------

const FUEL_ORDER = ["Petrol", "Diesel", "CNG", "Electric"];

function fuelList(answers: QuestionnaireAnswers): string[] {
  const picked = asArray(answers["q_fuel"]).filter((f) => f !== "No preference");
  return FUEL_ORDER.filter((f) => picked.includes(f));
}

function isEvOnly(answers: QuestionnaireAnswers): boolean {
  const f = asArray(answers["q_fuel"]);
  return f.length === 1 && f[0] === "Electric";
}

function fuelTransChip(answers: QuestionnaireAnswers): string {
  const fuels = fuelList(answers);
  const anyFuel = fuels.length === 0 || fuels.length === FUEL_ORDER.length;
  const fuelText = anyFuel ? "Any fuel" : fuels.join("/");

  if (isEvOnly(answers)) return fuelText;

  const t = answers["q_transmission"];
  const trans = typeof t === "string" ? t : null;
  if (trans === "Manual" || trans === "Automatic") return `${fuelText} · ${trans}`;
  if (anyFuel && trans === "No preference") return "Open to any fuel & gearbox";
  return fuelText;
}

// ---------------------------------------------------------------------------
// Seating and priorities
// ---------------------------------------------------------------------------

function seatingChip(answers: QuestionnaireAnswers): string {
  const s = answers["q_seating"];
  if (s === "4/5 seater") return "4–5 seats";
  if (s === "7 seater") return "7 seats";
  return "Any seating";
}

// Chip order (matches the worked examples) and short labels.
const PRIORITY_CHIP_ORDER: [string, string][] = [
  ["Safety and build quality", "Safety"],
  ["Ride quality and handling", "Ride"],
  ["Fuel efficiency", "Mileage"],
  ["Low running costs", "Running costs"],
  ["Features and tech", "Tech"],
  ["Power and acceleration", "Power"],
];

function prioritiesChip(picked: string[]): string {
  const labels = PRIORITY_CHIP_ORDER.filter(([v]) => picked.includes(v)).map(([, label]) => label);
  return labels.length ? labels.join(" + ") : "Priorities not set";
}

// Title adjective precedence (a tie-break for the title only; the chip shows both).
const ADJECTIVE_PRECEDENCE: [string, string][] = [
  ["Safety and build quality", "Safety-first"],
  ["Ride quality and handling", "Comfort-first"],
  ["Low running costs", "Cost-smart"],
  ["Fuel efficiency", "Mileage-minded"],
  ["Features and tech", "Tech-forward"],
  ["Power and acceleration", "Performance-minded"],
];

function adjective(picked: string[]): string {
  if (picked.includes("Fuel efficiency") && picked.includes("Low running costs")) return "Value-first";
  for (const [v, adj] of ADJECTIVE_PRECEDENCE) if (picked.includes(v)) return adj;
  return "Balanced";
}

function setting(answers: QuestionnaireAnswers): string {
  const drive = answers["q_drive_type"];
  if (drive === "City, short trips") return "City";
  if (drive === "Highway, longer distances") return "Highway";
  if (drive === "Hilly or ghat roads") return "Hill-road";
  if (drive === "Rural or broken roads") return "Rough-road";
  if (drive === "Mixed") {
    const commute = answers["q_daily_commute"];
    if (commute === "100km+ or highly variable") return "High-mileage";
    if (commute === "Under 20km") return "Short-hop";
  }
  return "";
}

function noun(answers: QuestionnaireAnswers): string {
  const who = asArray(answers["q_who_rides"]);
  let n: string;
  if (who.includes("Young kids") && who.includes("Elderly parents")) n = "Joint Family";
  else if (who.includes("Young kids") || who.includes("Elderly parents")) n = "Family";
  else if (who.includes("Other adults or friends")) n = "Crew";
  else if (who.includes("Partner")) n = "Couple";
  else if (who.includes("Just me")) n = "Solo Driver";
  else n = "Driver";
  return isEvOnly(answers) ? `EV ${n}` : n;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function derivePersona(answers: QuestionnaireAnswers): Persona {
  const picked = asArray(answers["q_top2_priorities"]);
  const title = ["The", adjective(picked), setting(answers), noun(answers)].filter(Boolean).join(" ");

  const attrs: PersonaAttrs = {
    budget: budgetChip(asArray(answers["q_budget"])),
    fuelTrans: fuelTransChip(answers),
    seating: seatingChip(answers),
    priorities: prioritiesChip(picked),
    parking: typeof answers["q_parking_tightness"] === "string" ? (answers["q_parking_tightness"] as string) : null,
    commute: typeof answers["q_daily_commute"] === "string" ? (answers["q_daily_commute"] as string) : null,
    who: asArray(answers["q_who_rides"]).join(", "),
    drive: typeof answers["q_drive_type"] === "string" ? (answers["q_drive_type"] as string) : null,
    brandAvoid: asArray(answers["q_brand_avoid"]).length,
  };

  return {
    version: PERSONA_VERSION,
    title,
    chips: [attrs.budget, attrs.fuelTrans, attrs.seating, attrs.priorities],
    attrs,
  };
}

/** "Top picks: A · B · C" -- brand+model only. */
export function topPicksLine(top: TopCarSnapshot[]): string {
  if (!top || top.length === 0) return "No confident match at save time — open to re-check.";
  const names = top.slice(0, 3).map((c) => `${c.brand} ${c.car_model}`);
  return `Top picks: ${names.join(" · ")}`;
}

const DISAMBIGUATION_ORDER: (keyof PersonaAttrs)[] = [
  "budget",
  "fuelTrans",
  "seating",
  "priorities",
  "commute",
  "parking",
  "who",
  "drive",
];

/**
 * For a set of saved searches, returns a per-id suffix (null when the title is
 * already unique). Computed at render time from the current set, never stored.
 * Searches that carry a user-chosen custom name should be excluded by the
 * caller -- they are already distinguishable.
 */
export function disambiguate(
  items: { id: string; created_at: string; persona: Persona }[],
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  const groups = new Map<string, typeof items>();
  for (const it of items) {
    out[it.id] = null;
    const g = groups.get(it.persona.title) ?? [];
    g.push(it);
    groups.set(it.persona.title, g);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const valueOf = (it: (typeof items)[number], key: keyof PersonaAttrs) => String(it.persona.attrs[key] ?? "");
    const unique = (key: keyof PersonaAttrs) => new Set(group.map((g) => valueOf(g, key))).size === group.length;

    const single = DISAMBIGUATION_ORDER.find(unique);
    if (single) {
      for (const it of group) out[it.id] = valueOf(it, single);
      continue;
    }

    // No single attribute separates them: join the first two attributes that differ at all.
    const differing = DISAMBIGUATION_ORDER.filter((k) => new Set(group.map((g) => valueOf(g, k))).size > 1).slice(0, 2);
    if (differing.length) {
      const combos = group.map((it) => differing.map((k) => valueOf(it, k)).join(" · "));
      if (new Set(combos).size === group.length) {
        group.forEach((it, i) => (out[it.id] = combos[i]));
        continue;
      }
    }

    // Still tied: number them by creation time.
    [...group]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach((it, i) => (out[it.id] = `#${i + 1}`));
  }
  return out;
}
