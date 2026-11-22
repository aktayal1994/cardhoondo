/**
 * The v3 questionnaire (11 questions across 3 categories, plus a Name/
 * Pincode/Phone intro step handled separately -- see IntroStep.tsx). Sourced
 * from docs/questionnaire.md. Question ids and option value strings are
 * load-bearing: they must match lib/scoring/questionnaireWeights.ts's
 * WEIGHT_RULES and lib/scoring/recommend.ts's passesStructuralFilters
 * verbatim (case-sensitive) or an answer silently stops affecting the
 * score/filter.
 *
 * Array order here is the actual chat-flow order, grouped by category per
 * docs/questionnaire.md's "Core requirements / Your everyday driving / What
 * matters to you" structure. Scoring doesn't care about answer order, only
 * presentation does.
 */
import {
  Wallet,
  Fuel,
  Users,
  Settings2,
  Car,
  Gauge,
  ParkingSquare,
  Baby,
  SlidersHorizontal,
  Frown,
  Ban,
  IndianRupee,
  Wind,
  Zap,
  Sparkles,
  Bus,
  Shuffle,
  Hand,
  Cog,
  Building2,
  Route,
  Mountain,
  TreeDeciduous,
  MapPin,
  Navigation,
  Compass,
  Ruler,
  ParkingCircle,
  User,
  Heart,
  UserRound,
  UsersRound,
  ShieldCheck,
  Leaf,
  Rocket,
  Cpu,
  PiggyBank,
  BatteryCharging,
  Eye,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { QuestionnaireAnswers } from "./scoring/questionnaireWeights";
import { BRAND_LIST, BUDGET_SLIDER_TOP } from "./scoring/recommend";
import { CARE_ONLY_ADULTS, PRIORITY_BALANCED } from "./scoring/questionnaireWeights";

export type QuestionType = "single" | "multi2" | "multiAny" | "range";
export type SectionId = "core_requirements" | "everyday_driving" | "what_matters";

export interface QuestionOption {
  value: string;
  label: string;
  /** Small second line under the bold label (v4 parking answers). */
  sublabel?: string;
  /** Overrides `label` when it returns a string. */
  conditionalLabel?: (answers: QuestionnaireAnswers) => string | undefined;
  /** Icon for summaries. Chips show a tick box or a radio circle instead
   * (v4); brand chips show their logo. */
  icon?: LucideIcon;
  conditionalIcon?: (answers: QuestionnaireAnswers) => LucideIcon | undefined;
  /** Short reaction line shown once this option is picked. No em dashes. */
  microcopy: string;
}

export interface QuestionDef {
  id: string;
  section: SectionId;
  prompt: string;
  explainer: string;
  icon: LucideIcon;
  type: QuestionType;
  required: boolean;
  options: QuestionOption[];
  /** Multi-select cap for "multiAny" -- undefined means no cap. */
  maxSelect?: number;
  /** The "neither/none" option. It sits below an "or" divider and locks
   * against the others: picking it greys out the rest, and picking anything
   * else greys it out (v4). */
  exclusiveValue?: string;
  /** Paragraphs shown when the user taps the info icon next to the prompt. */
  info?: string[];
  /** Brand questions: logo chips, best-known brands first. "avoid" only
   * lists brands with a car matching the answers so far. */
  brandMode?: "love" | "avoid";
  shouldShow?: (answers: QuestionnaireAnswers) => boolean;
}

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "core_requirements", label: "Core requirements" },
  { id: "everyday_driving", label: "Your everyday driving" },
  { id: "what_matters", label: "What matters to you" },
];

/** Best-known brands first (roughly Indian sales order, Nov 2026), not A to Z. */
export const BRANDS_BY_POPULARITY: string[] = [
  "Maruti", "Hyundai", "Tata", "Mahindra", "Toyota", "Kia", "Honda", "Skoda",
  "MG", "Volkswagen", "Renault", "Nissan", "Citroen", "Jeep", "BYD", "Force", "VinFast",
];
const ORDERED_BRANDS = [
  ...BRANDS_BY_POPULARITY.filter((b) => BRAND_LIST.includes(b)),
  ...BRAND_LIST.filter((b) => !BRANDS_BY_POPULARITY.includes(b)),
];
/** How many brands show before "Show all brands". */
export const BRANDS_SHOWN_FIRST = 8;

function fuelPicked(answers: QuestionnaireAnswers): string[] {
  const fuel = answers["q_fuel"];
  return Array.isArray(fuel) ? fuel : fuel ? [fuel] : [];
}

export const QUESTIONS: QuestionDef[] = [
  // -- Category 1: Core requirements --------------------------------------
  {
    id: "q_budget_range",
    section: "core_requirements",
    prompt: "What is your budget?",
    explainer: "Drag both ends. We'll only show cars whose on-road price sits in this range.",
    icon: Wallet,
    type: "range",
    required: true,
    options: [],
  },
  {
    id: "q_fuel",
    section: "core_requirements",
    prompt: "What fuel type are you open to considering?",
    explainer: "Hybrids run on petrol, so they show up under Petrol. Not sure? We'll use your daily driving to suggest one.",
    icon: Fuel,
    type: "multiAny",
    required: false,
    exclusiveValue: "No preference",
    options: [
      { value: "Petrol", label: "Petrol (includes hybrid)", icon: Fuel, microcopy: "Noted. Petrol's in the mix, hybrids included." },
      { value: "Diesel", label: "Diesel", icon: Fuel, microcopy: "Got it. Diesel's in the mix." },
      { value: "CNG", label: "CNG", icon: Wind, microcopy: "Noted. CNG's in the mix." },
      { value: "Electric", label: "Electric", icon: Zap, microcopy: "Noted. Electric's in the mix." },
      { value: "No preference", label: "No preference, recommend one for me", icon: Sparkles, microcopy: "Got it. We'll suggest a fuel from your daily driving." },
    ],
  },
  {
    id: "q_transmission",
    section: "core_requirements",
    prompt: "Manual or automatic?",
    explainer: "We'll only show cars in the transmission you're open to.",
    icon: Settings2,
    type: "single",
    required: true,
    shouldShow: (answers) => {
      const selected = fuelPicked(answers);
      return !(selected.length === 1 && selected[0] === "Electric");
    },
    options: [
      { value: "Manual", label: "Manual", icon: Hand, microcopy: "Noted. Manual it is." },
      { value: "Automatic", label: "Automatic", icon: Cog, microcopy: "Got it. Automatic it is." },
      { value: "No preference", label: "No preference", icon: Shuffle, microcopy: "Noted. Either works for you." },
    ],
  },
  {
    id: "q_seating",
    section: "core_requirements",
    prompt: "How many people usually travel in the car, including you?",
    explainer: "So everyone fits, including the back seat.",
    icon: Users,
    type: "single",
    required: true,
    options: [
      { value: "1-2 people", label: "1 or 2", icon: User, microcopy: "Noted. Back seat room won't weigh much." },
      { value: "3-4 people", label: "3 or 4", icon: Car, microcopy: "Got it. Two in the back." },
      { value: "5 people", label: "5, three in the back", icon: Users, microcopy: "Got it. We'll look hard at back seat room for three." },
      { value: "6-7 people", label: "6 or 7", icon: Bus, microcopy: "Got it. Needs a proper third row." },
    ],
  },
  {
    id: "q_extra_care",
    section: "core_requirements",
    prompt: "Anyone among them who needs extra care?",
    explainer: "Kids make safety count for more. Older parents need a car that's easy to get in and out of.",
    icon: Baby,
    type: "multiAny",
    required: true,
    exclusiveValue: CARE_ONLY_ADULTS,
    options: [
      { value: "Young kids", label: "Young kids", icon: Baby, microcopy: "Noted. Safety and child crash ratings just moved up." },
      { value: "Elderly parents", label: "Elderly parents", icon: UserRound, microcopy: "Got it. Easy entry and a comfy back seat just moved up." },
      { value: CARE_ONLY_ADULTS, label: "No (only adults)", icon: UsersRound, microcopy: "Noted. Grown-ups in the back need real legroom." },
    ],
  },

  // -- Category 2: Your everyday driving -----------------------------------
  {
    id: "q_drive_type",
    section: "everyday_driving",
    prompt: "How do you mostly drive?",
    explainer: "We'll weigh reviews toward how the car actually rides and handles for your kind of driving.",
    icon: Car,
    type: "single",
    required: true,
    options: [
      { value: "City, short trips", label: "City, short trips", icon: Building2, microcopy: "Noted. Tight streets and stop-start traffic just became a bigger factor." },
      { value: "Highway, longer distances", label: "Highway, longer distances", icon: Route, microcopy: "Got it. Highway stability and overtaking power just moved up." },
      { value: "Hilly or ghat roads", label: "Hill roads", icon: Mountain, microcopy: "Noted. Braking on slopes and cornering through bends just moved up." },
      { value: "Rural or broken roads", label: "Rural or broken roads", icon: TreeDeciduous, microcopy: "Got it. Ride quality over rough roads just became a priority." },
      { value: "Mixed", label: "Mix of city and highway", icon: Shuffle, microcopy: "Noted. We'll balance city and highway evidence evenly." },
    ],
  },
  {
    id: "q_daily_commute",
    section: "everyday_driving",
    prompt: "About how far do you drive in a typical day?",
    explainer: "Helps us judge comfort on long days, real range for electric cars, and which fuel suits you if you're open.",
    icon: Gauge,
    type: "single",
    required: true,
    options: [
      { value: "Under 20km", label: "Under 20km", icon: MapPin, microcopy: "Noted. Short daily distance." },
      { value: "20-50km", label: "20 to 50km", icon: Route, microcopy: "Got it. A moderate daily commute." },
      { value: "50-100km", label: "50 to 100km", icon: Navigation, microcopy: "Noted. Comfort on long drives just moved up." },
      { value: "100km+ or highly variable", label: "100km+ or highly variable", icon: Compass, microcopy: "Got it. Long-drive comfort and real range matter a lot for you." },
    ],
  },
  {
    id: "q_parking_tightness",
    section: "everyday_driving",
    prompt: "How tight is your parking situation?",
    explainer: "We'll check this against each car's real length and width, not just reviews.",
    icon: ParkingSquare,
    type: "single",
    required: true,
    options: [
      { value: "Very tight", label: "Very tight", sublabel: "Narrow lanes, basement, every inch counts", icon: Ruler, microcopy: "Noted. We'll steer clear of anything long or wide." },
      { value: "Somewhat tight", label: "Somewhat tight", sublabel: "Manageable, but nothing too big", icon: ParkingSquare, microcopy: "Got it. Nothing too large." },
      { value: "Not tight", label: "Plenty of room", icon: ParkingCircle, microcopy: "Noted. Size isn't a constraint for you." },
    ],
  },

  // -- Category 3: What matters to you -------------------------------------
  {
    id: "q_priorities",
    section: "what_matters",
    prompt: "What would you hate to compromise on?",
    explainer: "Everything still counts. Your picks just get extra weight.",
    icon: SlidersHorizontal,
    type: "multiAny",
    required: true,
    maxSelect: 3,
    exclusiveValue: PRIORITY_BALANCED,
    info: [
      "Every car on our list does the basics well. Some are simply better at certain things than others.",
      "It's the same with you. You need every part of a car to work, but a couple of things matter a bit more to you.",
      "Pick those, and we'll give them extra weight. Everything else still counts.",
      "Can't choose? Pick \"Balanced\" and we'll weigh everything equally.",
    ],
    options: [
      { value: "Comfortable ride", label: "Comfortable ride", icon: Waves, microcopy: "Comfortable ride, locked in." },
      { value: "Safety and solid build", label: "Safety and solid build", icon: ShieldCheck, microcopy: "Safety and solid build, locked in." },
      { value: "Good mileage", label: "Good mileage", icon: Leaf, microcopy: "Good mileage, locked in." },
      { value: "Strong performance", label: "Strong performance", icon: Rocket, microcopy: "Strong performance, locked in." },
      { value: "Features and tech", label: "Features and tech", icon: Cpu, microcopy: "Features and tech, locked in." },
      { value: "Trouble-free, cheap to own", label: "Trouble-free, cheap to own", icon: PiggyBank, microcopy: "Trouble-free ownership, locked in." },
      { value: "Space for people and luggage", label: "Space for people and luggage", icon: Users, microcopy: "Space for people and luggage, locked in." },
      { value: PRIORITY_BALANCED, label: "Balanced, no strong focus", icon: Shuffle, microcopy: "Got it. We'll weigh everything equally." },
    ],
  },
  {
    id: "q_brand_love",
    section: "what_matters",
    prompt: "Any brands you love?",
    explainer: "We'll learn what you like about them and look for it in cars that fit your needs, whatever the badge.",
    icon: Heart,
    type: "multiAny",
    required: false,
    maxSelect: 3,
    brandMode: "love",
    options: ORDERED_BRANDS.map((brand) => ({
      value: brand,
      label: brand,
      microcopy: `Noted. We'll look for what you like about ${brand}.`,
    })),
  },
  {
    id: "q_brand_avoid",
    section: "what_matters",
    prompt: "Any brands you'd rather skip?",
    explainer: "We'll leave these off your shortlist entirely. Only brands with a car that fits you are shown.",
    icon: Ban,
    type: "multiAny",
    required: false,
    brandMode: "avoid",
    options: ORDERED_BRANDS.map((brand) => ({
      value: brand,
      label: brand,
      microcopy: `Noted. We won't show any ${brand}.`,
    })),
  },
];

/** v3 question ids that v4 no longer asks. Old saved answers carrying them
 * still score as before; summaries use these prompts. */
export const RETIRED_QUESTIONS: Record<string, string> = {
  q_budget: "What is your budget range?",
  q_who_rides: "Who's usually in the car with you?",
  q_top2_priorities: "Which 2 of these matter most to you?",
  q_frustration: "In your day-to-day driving, what frustrates you the most?",
};

/** "₹8 lakh to ₹15 lakh" for a v4 slider answer. */
export function formatBudgetRange(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value : [];
  if (v.length !== 2) return "";
  const fmt = (n: string) => `₹${n.replace(/\.0$/, "")} lakh`;
  const hi = parseFloat(v[1]) >= BUDGET_SLIDER_TOP ? `${fmt(v[1])}+` : fmt(v[1]);
  return `${fmt(v[0])} to ${hi}`;
}

export function questionIndex(id: string): number {
  return QUESTIONS.findIndex((q) => q.id === id);
}

/** All questions belonging to one of the 4 step-form routes (see
 * app/questionnaire/*), in flow order. Used to scope the one-at-a-time chat
 * UI to a single step instead of the whole 11-question flow. */
export function questionsInSection(section: SectionId): QuestionDef[] {
  return QUESTIONS.filter((q) => q.section === section);
}

/** Whether every required, currently-visible question in a section already
 * has a complete answer -- used both to gate direct navigation to a later
 * step (see each app/questionnaire/*\/page.tsx's guard) and to decide
 * whether a revisited step should re-enter at its first unanswered question
 * or just show everything as settled. */
export function isSectionComplete(section: SectionId, answers: QuestionnaireAnswers): boolean {
  return questionsInSection(section).every((q) => {
    if (!isQuestionVisible(q, answers)) return true;
    if (!q.required) return true;
    return isAnswerComplete(q, answers[q.id]);
  });
}

/** Plain-language rendering of an answer for the "what we know about you"
 * sidebar and the settled-question summary row -- resolves each picked
 * option's conditionalLabel (if any) rather than just joining raw values. */
export function summarizeAnswer(question: QuestionDef, value: string | string[], answers: QuestionnaireAnswers): string {
  if (question.type === "range") return formatBudgetRange(value);
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((v) => {
      const option = question.options.find((o) => o.value === v);
      return option?.conditionalLabel?.(answers) ?? option?.label ?? v;
    })
    .join(" + ");
}

/** Prompt/value rows for every already-answered, non-skipped question in a
 * section -- used to build the sidebar's "prior steps" summary on a later
 * step-form page. */
export function profileEntriesForSection(
  section: SectionId,
  answers: QuestionnaireAnswers,
  skipped: string[],
): { prompt: string; value: string }[] {
  return questionsInSection(section)
    .filter((q) => !skipped.includes(q.id) && answers[q.id] !== undefined && isQuestionVisible(q, answers))
    .map((q) => ({ prompt: q.prompt, value: summarizeAnswer(q, answers[q.id], answers) }));
}

/** Questions that wait for a Continue button instead of moving on at the
 * first tap: multiple choice and the budget slider. */
export function needsConfirm(question: QuestionDef): boolean {
  return question.type === "multiAny" || question.type === "range";
}

export function sectionOf(id: string): SectionId | undefined {
  return QUESTIONS.find((q) => q.id === id)?.section;
}

export function isQuestionVisible(question: QuestionDef, answers: QuestionnaireAnswers): boolean {
  return !question.shouldShow || question.shouldShow(answers);
}

/** Next index >= fromIndex whose question is visible given answers so far,
 * or QUESTIONS.length if none remain. Used to walk past conditionally
 * hidden questions (e.g. q_transmission on an EV-only fuel pick) without
 * rendering them or counting them toward progress. */
export function nextVisibleIndex(fromIndex: number, answers: QuestionnaireAnswers): number {
  let i = fromIndex;
  while (i < QUESTIONS.length && !isQuestionVisible(QUESTIONS[i], answers)) i++;
  return i;
}

/** Whether an in-progress value counts as a finished answer for this
 * question -- single-select is complete the moment it has a value; multi2
 * needs exactly 2 picks; multiAny is complete once it has >=1 pick if
 * required, or always complete if optional (0 picks is a valid "no
 * preference"/"no exclusions" answer). Drives auto-advance in the chat flow
 * and auto-close-on-complete in edit-in-place. */
export function isAnswerComplete(question: QuestionDef, value: string | string[] | undefined): boolean {
  if (question.type === "range") return Array.isArray(value) && value.length === 2;
  if (question.type === "multi2") return Array.isArray(value) && value.length === 2;
  if (question.type === "multiAny") {
    if (!question.required) return true;
    return Array.isArray(value) && value.length >= 1;
  }
  return typeof value === "string" && value.length > 0;
}
