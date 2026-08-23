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
import { BRAND_LIST } from "./scoring/recommend";

export type QuestionType = "single" | "multi2" | "multiAny";
export type SectionId = "core_requirements" | "everyday_driving" | "what_matters";

export interface QuestionOption {
  value: string;
  label: string;
  /** Overrides `label` when it returns a string -- used for the one
   * fuel-conditional case (frustration's refuelling/charging swap). The
   * underlying `value` never changes, so WEIGHT_RULES only needs one entry. */
  conditionalLabel?: (answers: QuestionnaireAnswers) => string | undefined;
  /** Leading icon shown on the option chip. Omitted only for q_brand_avoid,
   * whose options render a real brand logo image instead (see
   * BrandChip in QuestionCard.tsx). */
  icon?: LucideIcon;
  /** Overrides `icon` when it returns a value -- mirrors conditionalLabel for
   * the same refuelling/charging swap case. */
  conditionalIcon?: (answers: QuestionnaireAnswers) => LucideIcon | undefined;
  /** Short reaction line shown once this option is picked -- reinforces that
   * the flow is listening, not a static form. */
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
  /** If present and returns false given the answers so far, this question is
   * skipped entirely (not shown, not counted in progress, no "Skipped" entry
   * in the profile panel). Only q_transmission uses this today (EV-only fuel
   * selection). Known limitation: editing an earlier answer to make a
   * previously-hidden question visible again mid-session doesn't retroactively
   * re-insert it -- the flow only evaluates this walking forward. */
  shouldShow?: (answers: QuestionnaireAnswers) => boolean;
}

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "core_requirements", label: "Core requirements" },
  { id: "everyday_driving", label: "Your everyday driving" },
  { id: "what_matters", label: "What matters to you" },
];

export const QUESTIONS: QuestionDef[] = [
  // -- Category 1: Core requirements --------------------------------------
  {
    id: "q_budget",
    section: "core_requirements",
    prompt: "What is your budget range?",
    explainer: "We'll only ever show cars whose on-road price fits your selected range(s). Pick more than one if you're flexible.",
    icon: Wallet,
    type: "multiAny",
    required: true,
    options: [
      { value: "<5L", label: "Under ₹5 lakh", icon: IndianRupee, microcopy: "Noted — under ₹5 lakh on-road." },
      { value: "5-10L", label: "₹5–10 lakh", icon: IndianRupee, microcopy: "Got it — ₹5–10 lakh on-road." },
      { value: "10-15L", label: "₹10–15 lakh", icon: IndianRupee, microcopy: "Noted — ₹10–15 lakh on-road." },
      { value: "15-20L", label: "₹15–20 lakh", icon: IndianRupee, microcopy: "Got it — ₹15–20 lakh on-road." },
      { value: "20-25L", label: "₹20–25 lakh", icon: IndianRupee, microcopy: "Noted — ₹20–25 lakh on-road." },
      { value: ">25L", label: "Above ₹25 lakh", icon: IndianRupee, microcopy: "Got it — above ₹25 lakh on-road." },
    ],
  },
  {
    id: "q_fuel",
    section: "core_requirements",
    prompt: "What fuel type are you open to considering?",
    explainer: "Pick as many as you're open to. Leave it open (or pick \"No preference\") and we'll use your daily commute to recommend the fuel that actually makes sense for you.",
    icon: Fuel,
    type: "multiAny",
    required: false,
    options: [
      { value: "Petrol", label: "Petrol", icon: Fuel, microcopy: "Noted — petrol's in the mix." },
      { value: "Diesel", label: "Diesel", icon: Fuel, microcopy: "Got it — diesel's in the mix." },
      { value: "CNG", label: "CNG", icon: Wind, microcopy: "Noted — CNG's in the mix." },
      { value: "Electric", label: "Electric", icon: Zap, microcopy: "Noted — electric's in the mix." },
      { value: "No preference", label: "No preference — recommend one for me", icon: Sparkles, microcopy: "Got it — we'll recommend a fuel type based on your daily driving." },
    ],
  },
  {
    id: "q_seating",
    section: "core_requirements",
    prompt: "What seating capacity do you need?",
    explainer: "We'll filter out anything that can't seat your household.",
    icon: Users,
    type: "single",
    required: true,
    options: [
      { value: "4/5 seater", label: "4/5 seater", icon: Car, microcopy: "Noted — a 4 or 5 seater." },
      { value: "7 seater", label: "7 seater", icon: Bus, microcopy: "Got it — needs a proper third row." },
      { value: "Either works", label: "Either works", icon: Shuffle, microcopy: "Noted — seating's flexible, we won't filter on it." },
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
      const fuel = answers["q_fuel"];
      const selected = Array.isArray(fuel) ? fuel : fuel ? [fuel] : [];
      // Skipped entirely for an EV-only selection -- manual/automatic
      // doesn't apply to EVs.
      return !(selected.length === 1 && selected[0] === "Electric");
    },
    options: [
      { value: "Manual", label: "Manual", icon: Hand, microcopy: "Noted — manual transmission." },
      { value: "Automatic", label: "Automatic", icon: Cog, microcopy: "Got it — automatic transmission." },
      { value: "No preference", label: "No preference", icon: Shuffle, microcopy: "Noted — either transmission works." },
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
      { value: "City, short trips", label: "City, short trips", icon: Building2, microcopy: "Noted — tight streets and stop-start traffic just became a bigger factor." },
      { value: "Highway, longer distances", label: "Highway, longer distances", icon: Route, microcopy: "Got it — highway stability and overtaking power just moved up." },
      { value: "Hilly or ghat roads", label: "Hilly or ghat roads", icon: Mountain, microcopy: "Noted — braking on descents and cornering through hairpins just moved up." },
      { value: "Rural or broken roads", label: "Rural or broken roads", icon: TreeDeciduous, microcopy: "Got it — ride quality over rough roads just became a priority." },
      { value: "Mixed", label: "Mixed", icon: Shuffle, microcopy: "Noted — we'll balance city and highway evidence evenly." },
    ],
  },
  {
    id: "q_daily_commute",
    section: "everyday_driving",
    prompt: "About how far do you drive in a typical day?",
    explainer: "Helps us recommend the right fuel type if you've left that open, and weighs mileage evidence to match.",
    icon: Gauge,
    type: "single",
    required: true,
    options: [
      { value: "Under 20km", label: "Under 20km", icon: MapPin, microcopy: "Noted — short daily distance." },
      { value: "20-50km", label: "20–50km", icon: Route, microcopy: "Got it — a moderate daily commute." },
      { value: "50-100km", label: "50–100km", icon: Navigation, microcopy: "Noted — a longer daily commute." },
      { value: "100km+ or highly variable", label: "100km+ or highly variable", icon: Compass, microcopy: "Got it — high daily distance." },
    ],
  },
  {
    id: "q_parking_tightness",
    section: "everyday_driving",
    prompt: "How tight is your parking situation?",
    explainer: "A physically bigger car is a real hassle in a tight spot — we'll weigh this against each car's actual length, not just reviews.",
    icon: ParkingSquare,
    type: "single",
    required: true,
    options: [
      { value: "Very tight", label: "Very tight — narrow lanes, basement, every inch counts", icon: Ruler, microcopy: "Noted — we'll steer clear of anything oversized." },
      { value: "Somewhat tight", label: "Somewhat tight — manageable, but nothing oversized", icon: ParkingSquare, microcopy: "Got it — nothing too large." },
      { value: "Not tight", label: "Not tight — plenty of room", icon: ParkingCircle, microcopy: "Noted — size isn't a constraint for you." },
    ],
  },
  {
    id: "q_who_rides",
    section: "everyday_driving",
    prompt: "Who's usually in the car with you?",
    explainer: "Pick everyone who's regularly with you — comfort and safety priorities shift depending on who's usually riding along.",
    icon: Baby,
    type: "multiAny",
    required: true,
    options: [
      { value: "Just me", label: "Just me", icon: User, microcopy: "Noted — mostly solo drives." },
      { value: "Partner", label: "Partner", icon: Heart, microcopy: "Got it — comfort for two just moved up." },
      { value: "Young kids", label: "Young kids", icon: Baby, microcopy: "Noted — safety and rear legroom just became a bigger priority." },
      { value: "Elderly parents", label: "Elderly parents", icon: UserRound, microcopy: "Got it — easy entry, rear comfort and safety just moved up." },
      { value: "Other adults or friends", label: "Other adults or friends", icon: UsersRound, microcopy: "Noted — extra space for guests just moved up." },
    ],
  },

  // -- Category 3: What matters to you -------------------------------------
  {
    id: "q_top2_priorities",
    section: "what_matters",
    prompt: "Which 2 of these matter most to you?",
    explainer: "Pick exactly two — we'll weigh review evidence toward what matters most to you, and give the rest a fair but lighter weight.",
    icon: SlidersHorizontal,
    type: "multi2",
    required: true,
    options: [
      { value: "Ride quality and handling", label: "Ride quality and handling", icon: Waves, microcopy: "Ride quality and handling — locked in as a top priority." },
      { value: "Safety and build quality", label: "Safety and build quality", icon: ShieldCheck, microcopy: "Safety and build quality — locked in as a top priority." },
      { value: "Fuel efficiency", label: "Fuel efficiency", icon: Leaf, microcopy: "Fuel efficiency — locked in as a top priority." },
      { value: "Power and acceleration", label: "Power and acceleration", icon: Rocket, microcopy: "Power and acceleration — locked in as a top priority." },
      { value: "Features and tech", label: "Features and tech", icon: Cpu, microcopy: "Features and tech — locked in as a top priority." },
      { value: "Low running costs", label: "Low running costs", icon: PiggyBank, microcopy: "Low running costs — locked in as a top priority." },
    ],
  },
  {
    id: "q_frustration",
    section: "what_matters",
    prompt: "In your day-to-day driving, what frustrates you the most?",
    explainer: "Your biggest everyday annoyance points us toward the reviews that matter most.",
    icon: Frown,
    type: "single",
    required: true,
    options: [
      {
        value: "Frequent refuelling",
        label: "Frequent refuelling",
        conditionalLabel: (answers) => {
          const fuel = answers["q_fuel"];
          const selected = Array.isArray(fuel) ? fuel : fuel ? [fuel] : [];
          return selected.length === 1 && selected[0] === "Electric" ? "Frequent charging stops" : undefined;
        },
        icon: Fuel,
        conditionalIcon: (answers) => {
          const fuel = answers["q_fuel"];
          const selected = Array.isArray(fuel) ? fuel : fuel ? [fuel] : [];
          return selected.length === 1 && selected[0] === "Electric" ? BatteryCharging : undefined;
        },
        microcopy: "Noted — fuel efficiency just moved up.",
      },
      { value: "Jerky or bumpy rides", label: "Jerky or bumpy rides", icon: Waves, microcopy: "Got it — ride comfort over bumps just moved up." },
      { value: "Slow overtakes", label: "Slow overtakes", icon: Gauge, microcopy: "Noted — overtaking power just moved up." },
      { value: "Poor visibility or comfort", label: "Poor visibility or comfort", icon: Eye, microcopy: "Got it — visibility and ergonomics just moved up." },
      { value: "Lack of modern tech", label: "Lack of modern tech", icon: Cpu, microcopy: "Noted — features and tech just moved up." },
    ],
  },
  {
    id: "q_brand_avoid",
    section: "what_matters",
    prompt: "Any brands you'd rather skip?",
    explainer: "We'll leave these off your shortlist entirely, no matter the budget.",
    icon: Ban,
    type: "multiAny",
    required: false,
    options: BRAND_LIST.map((brand) => ({
      value: brand,
      label: brand,
      microcopy: `Noted — we won't show any ${brand}.`,
    })),
  },
];

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
  if (question.type === "multi2") return Array.isArray(value) && value.length === 2;
  if (question.type === "multiAny") {
    if (!question.required) return true;
    return Array.isArray(value) && value.length >= 1;
  }
  return typeof value === "string" && value.length > 0;
}
