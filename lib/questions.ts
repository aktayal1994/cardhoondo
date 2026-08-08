/**
 * The 13-question flow, sourced from docs/questionnaire.md. Question ids and
 * option label strings are load-bearing: they must match
 * lib/scoring/questionnaireWeights.ts's WEIGHT_RULES and
 * lib/scoring/recommend.ts's passesStructuralFilters verbatim (case-sensitive)
 * or an answer silently stops affecting the score/filter.
 *
 * Array order here is the actual chat-flow order: grouped by section (per
 * CLAUDE.md's "3 labeled sections, not a flat Q-of-13 counter" decision),
 * not raw Q1..Q13 numeric order -- Q10 (parking) flow-appears inside "Who
 * it's for" alongside Q5/Q6, ahead of Q7-9/11-13's "What matters" section.
 * Scoring doesn't care about answer order, only presentation does.
 */
import {
  Car,
  Route,
  Fuel,
  Wallet,
  Users,
  Baby,
  SlidersHorizontal,
  Scale,
  Frown,
  ParkingSquare,
  Sparkles,
  Wrench,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";

export type QuestionType = "single" | "multi2";
export type SectionId = "your_drives" | "who_its_for" | "what_matters";

export interface QuestionOption {
  value: string;
  label: string;
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
}

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "your_drives", label: "Your drives" },
  { id: "who_its_for", label: "Who it's for" },
  { id: "what_matters", label: "What matters" },
];

export const QUESTIONS: QuestionDef[] = [
  // -- Your drives --------------------------------------------------------
  {
    id: "q1_usage",
    section: "your_drives",
    prompt: "What's your primary usage for the car?",
    explainer: "We'll weigh reviews toward how the car actually rides and handles for your kind of driving.",
    icon: Car,
    type: "single",
    required: true,
    options: [
      { value: "City Driving", label: "City Driving", microcopy: "Noted — tight streets and stop-start traffic just became a bigger factor." },
      { value: "Highway Driving", label: "Highway Driving", microcopy: "Got it — highway stability and overtaking power just moved up." },
      { value: "Mixed", label: "Mixed", microcopy: "Noted — we'll balance city and highway evidence evenly." },
      { value: "Rural/Bad Roads", label: "Rural / Bad Roads", microcopy: "Got it — ride quality over rough roads just became a priority." },
    ],
  },
  {
    id: "q2_trip_pattern",
    section: "your_drives",
    prompt: "How do you mostly drive — short trips or long ones?",
    explainer: "Short hops and long hauls wear a car differently — this tells us which mileage and reliability reviews to trust most for you.",
    icon: Route,
    type: "single",
    required: true,
    options: [
      { value: "Mostly short city hops", label: "Mostly short city hops", microcopy: "Noted — real-world city mileage claims just got more weight." },
      { value: "Regular long drives", label: "Regular long drives", microcopy: "Got it — highway mileage and long-haul comfort just moved up." },
      { value: "Both equally", label: "Both equally", microcopy: "Noted — we'll weigh city and highway mileage evenly." },
    ],
  },
  {
    id: "q3_fuel",
    section: "your_drives",
    prompt: "What fuel type are you open to considering?",
    explainer: "We'll only ever show cars in the fuel type you're open to — or all of them, your call.",
    icon: Fuel,
    type: "single",
    required: false,
    options: [
      { value: "Petrol", label: "Petrol", microcopy: "Noted — sticking to petrol." },
      { value: "Diesel", label: "Diesel", microcopy: "Got it — diesel it is." },
      { value: "EV", label: "EV", microcopy: "Noted — electric only." },
      { value: "No preference", label: "No preference", microcopy: "Got it — we'll consider every fuel type." },
    ],
  },
  {
    id: "q4_budget",
    section: "your_drives",
    prompt: "What is your budget range?",
    explainer: "We'll only ever show cars whose on-road price fits this range.",
    icon: Wallet,
    type: "single",
    required: true,
    options: [
      { value: "<5L", label: "Under ₹5 lakh", microcopy: "Noted — under ₹5 lakh on-road." },
      { value: "5-10L", label: "₹5–10 lakh", microcopy: "Got it — ₹5–10 lakh on-road." },
      { value: "10-15L", label: "₹10–15 lakh", microcopy: "Noted — ₹10–15 lakh on-road." },
      { value: "15-20L", label: "₹15–20 lakh", microcopy: "Got it — ₹15–20 lakh on-road." },
      { value: "20-25L", label: "₹20–25 lakh", microcopy: "Noted — ₹20–25 lakh on-road." },
      { value: ">25L", label: "Above ₹25 lakh", microcopy: "Got it — above ₹25 lakh on-road." },
    ],
  },

  // -- Who it's for --------------------------------------------------------
  {
    id: "q5_seating",
    section: "who_its_for",
    prompt: "What seating capacity do you need?",
    explainer: "We'll filter out anything that can't seat your household.",
    icon: Users,
    type: "single",
    required: true,
    options: [
      { value: "4/5 seater", label: "4/5 seater", microcopy: "Noted — a 4 or 5 seater." },
      { value: "7 seater", label: "7 seater", microcopy: "Got it — needs a proper third row." },
      { value: "Either works", label: "Either works", microcopy: "Noted — seating's flexible, we won't filter on it." },
    ],
  },
  {
    id: "q6_who_rides",
    section: "who_its_for",
    prompt: "Who's usually in the car with you?",
    explainer: "Comfort and safety priorities shift depending on who's usually riding with you.",
    icon: Baby,
    type: "single",
    required: true,
    options: [
      { value: "Mostly just me", label: "Mostly just me", microcopy: "Noted — mostly solo drives." },
      { value: "Partner", label: "Partner", microcopy: "Got it — comfort for two just moved up." },
      { value: "Young kids", label: "Young kids", microcopy: "Noted — safety and rear legroom just became a bigger priority." },
      { value: "Elderly parents", label: "Elderly parents", microcopy: "Got it — easy entry, rear comfort and safety just moved up." },
      { value: "Mixed group", label: "Mixed group", microcopy: "Noted — we'll weigh space and safety for a full car." },
    ],
  },
  {
    id: "q10_parking",
    section: "who_its_for",
    prompt: "Where do you usually park?",
    explainer: "Tight parking rewards a smaller turning radius and narrower width — we'll weigh that in.",
    icon: ParkingSquare,
    type: "single",
    required: true,
    options: [
      { value: "Open street parking", label: "Open street parking", microcopy: "Noted — open street parking." },
      { value: "Tight covered or basement parking", label: "Tight covered or basement parking", microcopy: "Got it — turning radius and tight-space handling just moved up." },
      { value: "Dedicated open space", label: "Dedicated open space", microcopy: "Noted — you've got room to spare." },
      { value: "No fixed parking", label: "No fixed parking", microcopy: "Got it — easy maneuvering just became more useful." },
    ],
  },

  // -- What matters --------------------------------------------------------
  {
    id: "q7_top2_priorities",
    section: "what_matters",
    prompt: "Which 2 of these matter most to you?",
    explainer: "Pick exactly two — we'll weigh review evidence toward what matters most to you, and give the rest a fair but lighter weight.",
    icon: SlidersHorizontal,
    type: "multi2",
    required: true,
    options: [
      { value: "Ride quality and handling", label: "Ride quality and handling", microcopy: "Ride quality and handling — locked in as a top priority." },
      { value: "Safety and build quality", label: "Safety and build quality", microcopy: "Safety and build quality — locked in as a top priority." },
      { value: "Fuel efficiency", label: "Fuel efficiency", microcopy: "Fuel efficiency — locked in as a top priority." },
      { value: "Power and acceleration", label: "Power and acceleration", microcopy: "Power and acceleration — locked in as a top priority." },
      { value: "Features and tech", label: "Features and tech", microcopy: "Features and tech — locked in as a top priority." },
    ],
  },
  {
    id: "q8_compromise",
    section: "what_matters",
    prompt: "What are you most okay to compromise on?",
    explainer: "Tell us what you're okay giving up a little on, so we don't over-weight it in your score.",
    icon: Scale,
    type: "single",
    required: true,
    options: [
      { value: "Ride comfort", label: "Ride comfort", microcopy: "Noted — ride comfort is negotiable for you." },
      { value: "Features", label: "Features", microcopy: "Got it — features are the first thing you'd trade off." },
      { value: "After-sales support", label: "After-sales support", microcopy: "Noted — after-sales isn't your top concern." },
      { value: "Cabin space", label: "Cabin space", microcopy: "Got it — cabin space is negotiable." },
      { value: "Performance", label: "Performance", microcopy: "Noted — performance is the first thing you'd trade off." },
      { value: "Safety", label: "Safety", microcopy: "Got it — noted, though we'll still surface any real safety concerns." },
    ],
  },
  {
    id: "q9_frustration",
    section: "what_matters",
    prompt: "In your day-to-day driving, what frustrates you the most?",
    explainer: "Your biggest everyday annoyance points us toward the reviews that matter most.",
    icon: Frown,
    type: "single",
    required: true,
    options: [
      { value: "Frequent refuelling", label: "Frequent refuelling", microcopy: "Noted — fuel efficiency just moved up." },
      { value: "Jerky or bumpy rides", label: "Jerky or bumpy rides", microcopy: "Got it — ride comfort over bumps just moved up." },
      { value: "Slow overtakes", label: "Slow overtakes", microcopy: "Noted — overtaking power just moved up." },
      { value: "Poor visibility or comfort", label: "Poor visibility or comfort", microcopy: "Got it — visibility and ergonomics just moved up." },
      { value: "Lack of modern tech", label: "Lack of modern tech", microcopy: "Noted — features and tech just moved up." },
      { value: "Parking difficulty", label: "Parking difficulty", microcopy: "Got it — maneuverability just moved up." },
    ],
  },
  {
    id: "q11_exciting_feature",
    section: "what_matters",
    prompt: "Pick one feature that excites you the most",
    explainer: "The one feature that'd make you say yes in a showroom — we'll check if the shortlist actually has it.",
    icon: Sparkles,
    type: "single",
    required: true,
    options: [
      { value: "Panoramic sunroof", label: "Panoramic sunroof", microcopy: "Noted — sunroof quality just moved up." },
      { value: "ADAS and safety tech", label: "ADAS and safety tech", microcopy: "Got it — ADAS reliability just moved up." },
      { value: "Big touchscreen", label: "Big touchscreen", microcopy: "Noted — touchscreen responsiveness just moved up." },
      { value: "Turbo engine", label: "Turbo engine", microcopy: "Got it — turbo performance just moved up." },
    ],
  },
  {
    id: "q12_service_cost_priority",
    section: "what_matters",
    prompt: "Would you prefer a car with lower service/maintenance cost even if it compromises on features or fun?",
    explainer: "Some cars are cheap to buy but expensive to maintain — tell us how much that trade-off matters.",
    icon: Wrench,
    type: "single",
    required: true,
    options: [
      { value: "Yes", label: "Yes", microcopy: "Noted — low running costs just became a bigger priority." },
      { value: "No", label: "No", microcopy: "Got it — you're fine trading running cost for other things." },
    ],
  },
  {
    id: "q13_ownership_duration",
    section: "what_matters",
    prompt: "How long do you expect to keep the car?",
    explainer: "How long you'll keep it changes whether long-term reliability or resale value matters more.",
    icon: CalendarClock,
    type: "single",
    required: true,
    options: [
      { value: "<3 years", label: "Under 3 years", microcopy: "Noted — resale value just moved up." },
      { value: "3-5 years", label: "3–5 years", microcopy: "Got it — a balance of resale and reliability." },
      { value: "5-7 years", label: "5–7 years", microcopy: "Noted — long-term reliability just moved up." },
      { value: "7+ years", label: "7+ years", microcopy: "Got it — long-term reliability just became the priority, resale matters less." },
    ],
  },
];

export function questionIndex(id: string): number {
  return QUESTIONS.findIndex((q) => q.id === id);
}

export function sectionOf(id: string): SectionId | undefined {
  return QUESTIONS.find((q) => q.id === id)?.section;
}

/** Whether an in-progress value counts as a finished answer for this
 * question -- single-select is complete the moment it has a value;
 * multi2 needs exactly 2 picks. Drives auto-advance in the chat flow and
 * auto-close-on-complete in edit-in-place. */
export function isAnswerComplete(question: QuestionDef, value: string | string[] | undefined): boolean {
  if (question.type === "multi2") return Array.isArray(value) && value.length === 2;
  return typeof value === "string" && value.length > 0;
}
