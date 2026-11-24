import type { QuestionnaireAnswers } from "../scoring/questionnaireWeights";
import type { GuideBodyType } from "../cars/guideBodyTypes";

/**
 * "Best car for X" guides, written for the way people ask AI chats. Every
 * entry here becomes /guides/<slug> (app/guides/[slug]/page.tsx), a sitemap
 * URL and a card on /guides. The ranking is never hand-picked: it is the real
 * recommender run on `answers`, so a page can never disagree with what a
 * visitor giving those answers would be shown.
 *
 * Before adding one, check the profile returns 5 cars with public review
 * pages and does not mostly repeat an existing page's list. After deploying,
 * run `node scripts/indexnow_ping.mjs /guides/<slug>`.
 */
export interface RankedGuideCheck {
  facet: string;
  label: string;
}

export interface RankedGuideFaq {
  facet: string;
  /** Finishes "Which <which> ..." e.g. "has the most back seat room". */
  ask: string;
  /** Used in the answer: "owners rate the X best on <label>". */
  label: string;
}

export interface RankedGuide {
  slug: string;
  /** On-page headline. */
  title: string;
  /** Search title, 60 characters or fewer. */
  seoTitle: string;
  /** Search description, 155 characters or fewer. */
  description: string;
  eyebrow: string;
  /** Card on /guides. */
  indexTitle: string;
  indexDek: string;
  /** ISO date the page went live; "Updated" is never earlier than this. */
  published: string;
  /** ISO date the ranking rules or answers last changed (sitemap lastmod). */
  updated?: string;
  /** Only these body types (lib/cars/guideBodyTypes.ts) are listed, ranked by the same recommender. */
  bodies?: GuideBodyType[];
  /** Overrides on top of BASE_ANSWERS. */
  answers: Partial<QuestionnaireAnswers>;
  /** First FAQ, answered by the short answer. */
  bestQuestion: string;
  /** "Which <which> has ...", e.g. "car under ₹10 lakh". */
  which: string;
  /** Opens the short answer: "<lead>, the A, B and C come out best ...". */
  lead: string;
  /** Who the page is for, mid-sentence, e.g. "a family of four". */
  audience: string;
  /** "The 5 best <listHeading>". */
  listHeading: string;
  /** On-road budget mid-sentence, e.g. "up to ₹10 lakh". */
  budgetPhrase: string;
  /** What the short answer says the cars were judged on. */
  judgedOn: string;
  /** The answers in plain words, for "How we picked these". */
  profile: string;
  checks?: RankedGuideCheck[];
  faqs?: RankedGuideFaq[];
}

/** A typical young family; each guide overrides what makes it different.
 * Questionnaire v4 answers since 24 Nov 2026 (were v3), so the guides use the
 * same scoring a visitor gets today: spec scores and checked crash ratings
 * blended in, priority-led weights, the budget slider. */
export const BASE_ANSWERS: QuestionnaireAnswers = {
  q_budget_range: ["3", "10"],
  q_fuel: ["No preference"],
  q_seating: "3-4 people",
  q_transmission: "No preference",
  q_extra_care: ["Young kids"],
  q_drive_type: "Mixed",
  q_daily_commute: "20-50km",
  q_parking_tightness: "Somewhat tight",
  q_priorities: ["Safety and solid build", "Trouble-free, cheap to own"],
  q_brand_love: [],
  q_brand_avoid: [],
};

/** Date the guides moved to v4 answers. */
const RESCORED = "2026-11-24";

export const FAMILY_CHECKS: RankedGuideCheck[] = [
  { facet: "rear_legroom_kneeroom", label: "Back seat room" },
  { facet: "suspension_softness", label: "Ride comfort" },
  { facet: "boot_space_usable", label: "Boot space" },
  { facet: "crash_rating_perception", label: "Safety" },
  { facet: "fit_finish_quality", label: "Build quality" },
  { facet: "city_mileage_actual", label: "Real city mileage" },
];

export const FAMILY_FAQS: RankedGuideFaq[] = [
  { facet: "rear_legroom_kneeroom", ask: "has the most back seat room", label: "back seat room" },
  { facet: "suspension_softness", ask: "has the most comfortable ride", label: "ride comfort" },
];

const FAMILY_PROFILE =
  "any fuel, any gearbox, two adults and young kids, mixed city and highway driving, a 20 to 50 km daily commute, somewhat tight parking, and safety and trouble-free, cheap ownership as the top priorities";

const FAMILY_JUDGED_ON = "the things a family lives with, like back seat room, ride comfort and running costs";

const PUBLISHED = "2026-11-09";

export const RANKED_GUIDES: RankedGuide[] = [
  {
    slug: "best-car-under-10-lakh-family-of-4",
    title: "Best Car Under ₹10 Lakh for a Family of 4 (Based on Real Reviews)",
    seoTitle: "Best Car Under ₹10 Lakh for a Family of 4 | CarDhoondo",
    description:
      "The cars that owners and expert reviewers rate best for a family of four under ₹10 lakh on-road, with back seat room, ride, boot and safety verdicts.",
    eyebrow: "Family cars",
    indexTitle: "Best Car Under ₹10 Lakh for a Family of 4",
    indexDek: "Ranked on what owners and reviewers say about back seat room, ride, boot space and safety. Updated daily.",
    published: PUBLISHED,
    updated: RESCORED,
    answers: { q_budget_range: ["3", "10"] },
    bestQuestion: "What is the best car under ₹10 lakh for a family of 4?",
    which: "car under ₹10 lakh",
    lead: "For a family of four with up to ₹10 lakh to spend on-road",
    audience: "a family of four",
    listHeading: "family cars under ₹10 lakh",
    budgetPhrase: "up to ₹10 lakh",
    judgedOn: FAMILY_JUDGED_ON,
    profile: `up to ₹10 lakh on-road, ${FAMILY_PROFILE}`,
  },
  {
    slug: "best-car-under-15-lakh-family",
    title: "Best Car Under ₹15 Lakh for a Family (Based on Real Reviews)",
    seoTitle: "Best Car Under ₹15 Lakh for a Family | CarDhoondo",
    description:
      "The cars owners and expert reviewers rate best for a family between ₹10 and 15 lakh on-road, with back seat room, ride, boot and safety verdicts.",
    eyebrow: "Family cars",
    indexTitle: "Best Car Under ₹15 Lakh for a Family",
    indexDek: "The ₹10 to 15 lakh cars owners rate best for families, with honest verdicts where reviews are thin.",
    published: PUBLISHED,
    updated: RESCORED,
    answers: { q_budget_range: ["10", "15"] },
    bestQuestion: "What is the best car under ₹15 lakh for a family?",
    which: "car under ₹15 lakh",
    lead: "For a family of four with ₹10 to 15 lakh to spend on-road",
    audience: "a family of four",
    listHeading: "family cars under ₹15 lakh",
    budgetPhrase: "₹10 to 15 lakh",
    judgedOn: FAMILY_JUDGED_ON,
    profile: `₹10 to 15 lakh on-road, ${FAMILY_PROFILE}`,
  },
  {
    slug: "best-car-under-20-lakh-family",
    title: "Best Car Under ₹20 Lakh for a Family (Based on Real Reviews)",
    seoTitle: "Best Car Under ₹20 Lakh for a Family | CarDhoondo",
    description:
      "The cars owners and expert reviewers rate best for a family between ₹15 and 20 lakh on-road, with back seat room, ride, boot and safety verdicts.",
    eyebrow: "Family cars",
    indexTitle: "Best Car Under ₹20 Lakh for a Family",
    indexDek: "The ₹15 to 20 lakh cars owners rate best for families, from compact SUVs to electric.",
    published: PUBLISHED,
    updated: RESCORED,
    answers: { q_budget_range: ["15", "20"] },
    bestQuestion: "What is the best car under ₹20 lakh for a family?",
    which: "car under ₹20 lakh",
    lead: "For a family of four with ₹15 to 20 lakh to spend on-road",
    audience: "a family of four",
    listHeading: "family cars under ₹20 lakh",
    budgetPhrase: "₹15 to 20 lakh",
    judgedOn: FAMILY_JUDGED_ON,
    profile: `₹15 to 20 lakh on-road, ${FAMILY_PROFILE}`,
  },
  {
    slug: "best-7-seater-car-under-20-lakh",
    title: "Best 7 Seater Car Under ₹20 Lakh (Based on Real Reviews)",
    seoTitle: "Best 7 Seater Car Under ₹20 Lakh | CarDhoondo",
    description:
      "The 6 and 7 seaters owners and expert reviewers rate best under ₹20 lakh on-road, with third row, middle row, ride and safety verdicts.",
    eyebrow: "7 seaters",
    indexTitle: "Best 7 Seater Car Under ₹20 Lakh",
    indexDek: "Which 6 and 7 seaters have a third row people actually praise, ranked on owner reviews.",
    published: PUBLISHED,
    updated: RESCORED,
    answers: {
      q_budget_range: ["10", "20"],
      q_seating: "6-7 people",
      q_extra_care: ["Young kids", "Elderly parents"],
    },
    bestQuestion: "What is the best 7 seater car under ₹20 lakh?",
    which: "7 seater under ₹20 lakh",
    lead: "For a big family with ₹10 to 20 lakh to spend on-road",
    audience: "a family of six or seven",
    listHeading: "7 seaters under ₹20 lakh",
    budgetPhrase: "₹10 to 20 lakh",
    judgedOn: "what a big family lives with, like third row space, ride comfort and safety",
    profile:
      "₹10 to 20 lakh on-road, six or seven people with kids and elderly parents, any fuel, any gearbox, mixed driving, a 20 to 50 km daily commute, and safety and trouble-free, cheap ownership as the top priorities",
    checks: [
      { facet: "third_row_usability", label: "Third row" },
      { facet: "rear_legroom_kneeroom", label: "Middle row room" },
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "boot_space_usable", label: "Boot space" },
      { facet: "crash_rating_perception", label: "Safety" },
      { facet: "fit_finish_quality", label: "Build quality" },
    ],
    faqs: [
      { facet: "third_row_usability", ask: "has the most usable third row", label: "the third row" },
      { facet: "suspension_softness", ask: "has the most comfortable ride", label: "ride comfort" },
    ],
  },
  {
    slug: "best-cng-car-under-10-lakh",
    title: "Best CNG Car Under ₹10 Lakh (Based on Real Reviews)",
    seoTitle: "Best CNG Car Under ₹10 Lakh | CarDhoondo",
    description:
      "The factory CNG cars owners and expert reviewers rate best under ₹10 lakh on-road, with boot space, mileage, ride and safety verdicts.",
    eyebrow: "CNG cars",
    indexTitle: "Best CNG Car Under ₹10 Lakh",
    indexDek: "Factory CNG cars ranked on what owners say, including how much boot the cylinder really eats.",
    published: PUBLISHED,
    updated: RESCORED,
    answers: { q_budget_range: ["3", "10"], q_fuel: ["CNG"] },
    bestQuestion: "What is the best CNG car under ₹10 lakh?",
    which: "CNG car under ₹10 lakh",
    lead: "For a family that wants low running costs with up to ₹10 lakh to spend on-road",
    audience: "a family running a CNG car",
    listHeading: "CNG cars under ₹10 lakh",
    budgetPhrase: "up to ₹10 lakh",
    judgedOn: "what CNG owners live with, like real mileage, boot space and back seat room",
    profile: `up to ₹10 lakh on-road, factory CNG only, ${FAMILY_PROFILE.replace("any fuel, ", "")}`,
    checks: [
      { facet: "city_mileage_actual", label: "Real city mileage" },
      { facet: "boot_space_usable", label: "Boot space" },
      { facet: "rear_legroom_kneeroom", label: "Back seat room" },
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "crash_rating_perception", label: "Safety" },
      { facet: "routine_service_cost", label: "Service cost" },
    ],
  },
  {
    slug: "best-automatic-car-under-10-lakh",
    title: "Best Automatic Car Under ₹10 Lakh (Based on Real Reviews)",
    seoTitle: "Best Automatic Car Under ₹10 Lakh | CarDhoondo",
    description:
      "The automatic cars owners and expert reviewers rate best under ₹10 lakh on-road, with city driving, ride, space and safety verdicts.",
    eyebrow: "Automatics",
    indexTitle: "Best Automatic Car Under ₹10 Lakh",
    indexDek: "AMT, CVT and torque converter cars under ₹10 lakh, ranked on what owners say about city driving.",
    published: PUBLISHED,
    updated: RESCORED,
    answers: { q_budget_range: ["3", "10"], q_transmission: "Automatic" },
    bestQuestion: "What is the best automatic car under ₹10 lakh?",
    which: "automatic car under ₹10 lakh",
    lead: "For a family that wants an automatic with up to ₹10 lakh to spend on-road",
    audience: "a family that wants an automatic",
    listHeading: "automatic cars under ₹10 lakh",
    budgetPhrase: "up to ₹10 lakh",
    judgedOn: "what matters day to day, like how easy they are in city traffic, back seat room and ride comfort",
    profile: `up to ₹10 lakh on-road, automatic only, ${FAMILY_PROFILE.replace("any gearbox, ", "")}`,
    checks: [
      { facet: "city_drivability", label: "Easy in city traffic" },
      { facet: "rear_legroom_kneeroom", label: "Back seat room" },
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "crash_rating_perception", label: "Safety" },
      { facet: "city_mileage_actual", label: "Real city mileage" },
      { facet: "fit_finish_quality", label: "Build quality" },
    ],
    faqs: [
      { facet: "city_drivability", ask: "is easiest to drive in city traffic", label: "city driving" },
      { facet: "suspension_softness", ask: "has the most comfortable ride", label: "ride comfort" },
    ],
  },
  {
    slug: "best-electric-car-under-20-lakh",
    title: "Best Electric Car Under ₹20 Lakh for a Family (Based on Real Reviews)",
    seoTitle: "Best Electric Car Under ₹20 Lakh | CarDhoondo",
    description:
      "The electric cars owners and expert reviewers rate best for a family under ₹20 lakh on-road, with space, ride, safety and service verdicts.",
    eyebrow: "Electric cars",
    indexTitle: "Best Electric Car Under ₹20 Lakh for a Family",
    indexDek: "The EVs owners rate best for family use under ₹20 lakh, with honest gaps where reviews are thin.",
    published: PUBLISHED,
    updated: RESCORED,
    answers: { q_budget_range: ["10", "20"], q_fuel: ["Electric"] },
    bestQuestion: "What is the best electric car under ₹20 lakh for a family?",
    which: "electric car under ₹20 lakh",
    lead: "For a family going electric with ₹10 to 20 lakh to spend on-road",
    audience: "a family going electric",
    listHeading: "electric cars under ₹20 lakh",
    budgetPhrase: "₹10 to 20 lakh",
    judgedOn: "what a family lives with, like back seat room, ride comfort, safety and service",
    profile: `₹10 to 20 lakh on-road, electric only, ${FAMILY_PROFILE.replace("any fuel, ", "")}`,
    checks: [
      { facet: "rear_legroom_kneeroom", label: "Back seat room" },
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "boot_space_usable", label: "Boot space" },
      { facet: "crash_rating_perception", label: "Safety" },
      { facet: "fit_finish_quality", label: "Build quality" },
      { facet: "service_center_availability", label: "Service network" },
    ],
  },
  {
    slug: "best-first-car-for-city-driving",
    title: "Best First Car for City Driving Under ₹10 Lakh (Based on Real Reviews)",
    seoTitle: "Best First Car for City Driving Under ₹10 Lakh",
    description:
      "The cars owners and expert reviewers rate best as a first car for city driving under ₹10 lakh, with ease of driving, parking and mileage verdicts.",
    eyebrow: "First car",
    indexTitle: "Best First Car for City Driving Under ₹10 Lakh",
    indexDek: "Easy to drive, easy to park, cheap to run: what owners say about first cars for the city.",
    published: PUBLISHED,
    updated: RESCORED,
    answers: {
      q_budget_range: ["3", "10"],
      q_seating: "1-2 people",
      q_extra_care: ["No (only adults)"],
      q_parking_tightness: "Very tight",
      q_drive_type: "City, short trips",
      q_daily_commute: "Under 20km",
      q_priorities: ["Good mileage", "Trouble-free, cheap to own"],
    },
    bestQuestion: "What is the best first car for city driving under ₹10 lakh?",
    which: "first car under ₹10 lakh",
    lead: "For a first-time buyer driving mostly in the city with up to ₹10 lakh to spend on-road",
    audience: "a first-time buyer in the city",
    listHeading: "first cars for city driving",
    budgetPhrase: "up to ₹10 lakh",
    judgedOn: "what a new driver lives with, like how easy they are to drive and park, and real mileage",
    profile:
      "up to ₹10 lakh on-road, one or two people, any fuel, any gearbox, short city trips under 20 km a day, very tight parking, and good mileage and trouble-free, cheap ownership as the top priorities",
    checks: [
      { facet: "city_drivability", label: "Easy in city traffic" },
      { facet: "width_tight_spaces", label: "Tight spaces" },
      { facet: "driving_position", label: "Driving position" },
      { facet: "city_mileage_actual", label: "Real city mileage" },
      { facet: "routine_service_cost", label: "Service cost" },
      { facet: "crash_rating_perception", label: "Safety" },
    ],
    faqs: [
      { facet: "city_drivability", ask: "is easiest to drive in city traffic", label: "city driving" },
      { facet: "city_mileage_actual", ask: "gives the best real mileage in the city", label: "real city mileage" },
    ],
  },
  // Added 15 Nov 2026. Each was checked against live data first: 5+ cars with
  // review pages and a top five that differs from every guide above by at
  // least two cars. Tried and dropped for repeating an existing list: mileage,
  // automatic and electric at other budgets, safest under ₹10 lakh.
  {
    slug: "best-diesel-car-under-20-lakh",
    title: "Best Diesel Car Under ₹20 Lakh (Based on Real Reviews)",
    seoTitle: "Best Diesel Car Under ₹20 Lakh | CarDhoondo",
    description:
      "The diesel cars owners and expert reviewers rate best between ₹10 and 20 lakh on-road, with highway stability, overtaking, refinement and ride verdicts.",
    eyebrow: "Diesel cars",
    indexTitle: "Best Diesel Car Under ₹20 Lakh",
    indexDek: "Diesels for long distances, ranked on what owners say about highway stability, overtaking and refinement.",
    published: "2026-11-15",
    updated: RESCORED,
    answers: {
      q_budget_range: ["10", "20"],
      q_fuel: ["Diesel"],
      q_drive_type: "Highway, longer distances",
      q_daily_commute: "50-100km",
    },
    bestQuestion: "What is the best diesel car under ₹20 lakh?",
    which: "diesel car under ₹20 lakh",
    lead: "For a family that drives long distances and wants a diesel with ₹10 to 20 lakh to spend on-road",
    audience: "a family that covers long distances",
    listHeading: "diesel cars under ₹20 lakh",
    budgetPhrase: "₹10 to 20 lakh",
    judgedOn: "what long-distance owners live with, like highway stability, overtaking and back seat room",
    profile:
      "₹10 to 20 lakh on-road, diesel only, any gearbox, two adults and young kids, mostly highway driving, 50 to 100 km a day, somewhat tight parking, and safety and trouble-free, cheap ownership as the top priorities",
    checks: [
      { facet: "highway_stability", label: "Highway stability" },
      { facet: "highway_overtaking", label: "Overtaking" },
      { facet: "engine_refinement", label: "Engine refinement" },
      { facet: "rear_legroom_kneeroom", label: "Back seat room" },
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "fit_finish_quality", label: "Build quality" },
    ],
    faqs: [
      { facet: "highway_overtaking", ask: "is best for overtaking on the highway", label: "highway overtaking" },
      { facet: "suspension_softness", ask: "has the most comfortable ride", label: "ride comfort" },
    ],
  },
  {
    slug: "best-7-seater-car-under-25-lakh",
    title: "Best 7 Seater Car Under ₹25 Lakh (Based on Real Reviews)",
    seoTitle: "Best 7 Seater Car Under ₹25 Lakh | CarDhoondo",
    description:
      "The 6 and 7 seaters owners and expert reviewers rate best between ₹20 and 25 lakh on-road, with third row, middle row, ride and safety verdicts.",
    eyebrow: "7 seaters",
    indexTitle: "Best 7 Seater Car Under ₹25 Lakh",
    indexDek: "The bigger 6 and 7 seaters between ₹20 and 25 lakh, ranked on what owners say about all three rows.",
    published: "2026-11-15",
    updated: RESCORED,
    answers: {
      q_budget_range: ["20", "25"],
      q_seating: "6-7 people",
      q_extra_care: ["Young kids", "Elderly parents"],
    },
    bestQuestion: "What is the best 7 seater car under ₹25 lakh?",
    which: "7 seater under ₹25 lakh",
    lead: "For a big family with ₹20 to 25 lakh to spend on-road",
    audience: "a family of six or seven",
    listHeading: "7 seaters under ₹25 lakh",
    budgetPhrase: "₹20 to 25 lakh",
    judgedOn: "what a big family lives with, like third row space, ride comfort and safety",
    profile:
      "₹20 to 25 lakh on-road, six or seven people with kids and elderly parents, any fuel, any gearbox, mixed driving, a 20 to 50 km daily commute, and safety and trouble-free, cheap ownership as the top priorities",
    checks: [
      { facet: "third_row_usability", label: "Third row" },
      { facet: "rear_legroom_kneeroom", label: "Middle row room" },
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "boot_space_usable", label: "Boot space" },
      { facet: "crash_rating_perception", label: "Safety" },
      { facet: "fit_finish_quality", label: "Build quality" },
    ],
    faqs: [
      { facet: "third_row_usability", ask: "has the most usable third row", label: "the third row" },
      { facet: "suspension_softness", ask: "has the most comfortable ride", label: "ride comfort" },
    ],
  },
  {
    slug: "best-car-for-family-of-5-under-15-lakh",
    title: "Best Car for a Family of 5 Under ₹15 Lakh (Based on Real Reviews)",
    seoTitle: "Best Car for a Family of 5 Under ₹15 Lakh | CarDhoondo",
    description:
      "The cars owners and expert reviewers rate best for five people between ₹10 and 15 lakh on-road, with back seat room, ride, boot and safety verdicts.",
    eyebrow: "Family cars",
    indexTitle: "Best Car for a Family of 5 Under ₹15 Lakh",
    indexDek: "Three in the back changes the answer. The ₹10 to 15 lakh cars owners rate best for five.",
    published: "2026-11-15",
    updated: RESCORED,
    answers: {
      q_budget_range: ["10", "15"],
      q_seating: "5 people",
      q_extra_care: ["Young kids", "Elderly parents"],
    },
    bestQuestion: "What is the best car for a family of 5 under ₹15 lakh?",
    which: "five seater under ₹15 lakh",
    lead: "For a family of five with ₹10 to 15 lakh to spend on-road",
    audience: "a family of five",
    listHeading: "cars for a family of 5 under ₹15 lakh",
    budgetPhrase: "₹10 to 15 lakh",
    judgedOn: "what five people live with, like room for three in the back, ride comfort and boot space",
    profile:
      "₹10 to 15 lakh on-road, any fuel, any gearbox, five people including young kids and elderly parents, mixed city and highway driving, a 20 to 50 km daily commute, somewhat tight parking, and safety and trouble-free, cheap ownership as the top priorities",
  },
  {
    slug: "best-petrol-car-under-20-lakh",
    title: "Best Petrol Car Under ₹20 Lakh for a Family (Based on Real Reviews)",
    seoTitle: "Best Petrol Car Under ₹20 Lakh | CarDhoondo",
    description:
      "The petrol cars owners and expert reviewers rate best for a family between ₹15 and 20 lakh on-road, with space, ride, refinement and safety verdicts.",
    eyebrow: "Petrol cars",
    indexTitle: "Best Petrol Car Under ₹20 Lakh for a Family",
    indexDek: "Not ready for electric? The ₹15 to 20 lakh petrol cars owners rate best for families.",
    published: "2026-11-15",
    updated: RESCORED,
    answers: { q_budget_range: ["15", "20"], q_fuel: ["Petrol"] },
    bestQuestion: "What is the best petrol car under ₹20 lakh for a family?",
    which: "petrol car under ₹20 lakh",
    lead: "For a family that wants a petrol car with ₹15 to 20 lakh to spend on-road",
    audience: "a family buying a petrol car",
    listHeading: "petrol cars under ₹20 lakh",
    budgetPhrase: "₹15 to 20 lakh",
    judgedOn: FAMILY_JUDGED_ON,
    profile: `₹15 to 20 lakh on-road, petrol only (hybrids included), ${FAMILY_PROFILE.replace("any fuel, ", "")}`,
    checks: [
      { facet: "rear_legroom_kneeroom", label: "Back seat room" },
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "boot_space_usable", label: "Boot space" },
      { facet: "crash_rating_perception", label: "Safety" },
      { facet: "engine_refinement", label: "Engine refinement" },
      { facet: "city_mileage_actual", label: "Real city mileage" },
    ],
  },
  // Added 24 Nov 2026, checked against live v4 rankings first. Kept when the
  // top five differs from every guide above by at least two cars, or (body
  // type, parents) answers a clearly different question with at most three in
  // common. Tried and dropped: compact SUV under ₹10 lakh (repeats the ₹10 lakh
  // family list), off-roaders and 7 seaters under ₹15 lakh (only 4 cars each),
  // SUV under ₹25 lakh and fun to drive (repeat other lists).
  {
    slug: "best-car-under-6-lakh",
    title: "Best Car Under ₹6 Lakh (Based on Real Reviews)",
    seoTitle: "Best Car Under ₹6 Lakh | CarDhoondo",
    description:
      "The cheapest new cars owners and expert reviewers rate best, up to ₹6 lakh on-road, with mileage, service cost, space and safety verdicts.",
    eyebrow: "Budget cars",
    indexTitle: "Best Car Under ₹6 Lakh",
    indexDek: "The small cars that cost least to buy and run, ranked on what owners actually say.",
    published: RESCORED,
    answers: { q_budget_range: ["3", "6"] },
    bestQuestion: "What is the best car under ₹6 lakh?",
    which: "car under ₹6 lakh",
    lead: "For a small family with up to ₹6 lakh to spend on-road",
    audience: "a buyer on a tight budget",
    listHeading: "cars under ₹6 lakh",
    budgetPhrase: "up to ₹6 lakh",
    judgedOn: "what a budget buyer lives with, like real mileage, service cost and back seat room",
    profile: `up to ₹6 lakh on-road, ${FAMILY_PROFILE}`,
    checks: [
      { facet: "city_mileage_actual", label: "Real city mileage" },
      { facet: "routine_service_cost", label: "Service cost" },
      { facet: "rear_legroom_kneeroom", label: "Back seat room" },
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "crash_rating_perception", label: "Safety" },
      { facet: "fit_finish_quality", label: "Build quality" },
    ],
    faqs: [
      { facet: "city_mileage_actual", ask: "gives the best real mileage in the city", label: "real city mileage" },
      { facet: "routine_service_cost", ask: "is cheapest to service", label: "service cost" },
    ],
  },
  {
    slug: "best-hatchback-under-10-lakh",
    title: "Best Hatchback Under ₹10 Lakh (Based on Real Reviews)",
    seoTitle: "Best Hatchback Under ₹10 Lakh | CarDhoondo",
    description:
      "The hatchbacks owners and expert reviewers rate best up to ₹10 lakh on-road, with mileage, ride, back seat room and safety verdicts.",
    eyebrow: "Hatchbacks",
    indexTitle: "Best Hatchback Under ₹10 Lakh",
    indexDek: "Swift, Baleno, Tiago and the rest, ranked on what owners say about mileage, ride and space.",
    published: RESCORED,
    bodies: ["hatchback"],
    answers: { q_budget_range: ["3", "10"] },
    bestQuestion: "What is the best hatchback under ₹10 lakh?",
    which: "hatchback under ₹10 lakh",
    lead: "For a small family that wants a hatchback with up to ₹10 lakh to spend on-road",
    audience: "a hatchback buyer",
    listHeading: "hatchbacks under ₹10 lakh",
    budgetPhrase: "up to ₹10 lakh",
    judgedOn: FAMILY_JUDGED_ON,
    profile: `up to ₹10 lakh on-road, hatchbacks only, ${FAMILY_PROFILE}`,
  },
  {
    slug: "best-sedan-under-15-lakh",
    title: "Best Sedan Under ₹15 Lakh (Based on Real Reviews)",
    seoTitle: "Best Sedan Under ₹15 Lakh | CarDhoondo",
    description:
      "City, Verna, Virtus, Slavia or Dzire? The sedans owners and expert reviewers rate best up to ₹15 lakh on-road, with ride, space and safety verdicts.",
    eyebrow: "Sedans",
    indexTitle: "Best Sedan Under ₹15 Lakh",
    indexDek: "City, Verna, Virtus, Slavia and Dzire, ranked on what owners say about ride, rear seat and refinement.",
    published: RESCORED,
    bodies: ["sedan", "compact_sedan"],
    answers: {
      q_budget_range: ["8", "15"],
      q_extra_care: ["No (only adults)"],
      q_priorities: ["Comfortable ride", "Safety and solid build"],
    },
    bestQuestion: "What is the best sedan under ₹15 lakh?",
    which: "sedan under ₹15 lakh",
    lead: "For adults who want a sedan with ₹8 to 15 lakh to spend on-road",
    audience: "a sedan buyer",
    listHeading: "sedans under ₹15 lakh",
    budgetPhrase: "₹8 to 15 lakh",
    judgedOn: "what sedan owners care about, like ride comfort, rear seat room and refinement",
    profile:
      "₹8 to 15 lakh on-road, sedans only, any fuel, any gearbox, adults in the back, mixed city and highway driving, a 20 to 50 km daily commute, somewhat tight parking, and comfortable ride plus safety as the top priorities",
    checks: [
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "rear_legroom_kneeroom", label: "Rear seat room" },
      { facet: "engine_refinement", label: "Engine refinement" },
      { facet: "highway_stability", label: "Highway stability" },
      { facet: "boot_space_usable", label: "Boot space" },
      { facet: "crash_rating_perception", label: "Safety" },
    ],
    faqs: [
      { facet: "suspension_softness", ask: "has the most comfortable ride", label: "ride comfort" },
      { facet: "rear_legroom_kneeroom", ask: "has the most rear seat room", label: "rear seat room" },
    ],
  },
  {
    slug: "best-suv-under-20-lakh",
    title: "Best SUV Under ₹20 Lakh (Based on Real Reviews)",
    seoTitle: "Best SUV Under ₹20 Lakh | CarDhoondo",
    description:
      "The mid-size and bigger SUVs owners and expert reviewers rate best between ₹12 and 20 lakh on-road, with space, ride, safety and build verdicts.",
    eyebrow: "SUVs",
    indexTitle: "Best SUV Under ₹20 Lakh",
    indexDek: "Creta-size SUVs and up between ₹12 and 20 lakh, ranked on what owners actually say.",
    published: RESCORED,
    bodies: ["suv", "large_suv"],
    answers: { q_budget_range: ["12", "20"] },
    bestQuestion: "What is the best SUV under ₹20 lakh?",
    which: "SUV under ₹20 lakh",
    lead: "For a family that wants a proper SUV with ₹12 to 20 lakh to spend on-road",
    audience: "a family buying an SUV",
    listHeading: "SUVs under ₹20 lakh",
    budgetPhrase: "₹12 to 20 lakh",
    judgedOn: FAMILY_JUDGED_ON,
    profile: `₹12 to 20 lakh on-road, mid-size and bigger SUVs only, ${FAMILY_PROFILE}`,
    checks: [
      { facet: "rear_legroom_kneeroom", label: "Back seat room" },
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "ground_clearance_practicality", label: "Ground clearance" },
      { facet: "boot_space_usable", label: "Boot space" },
      { facet: "crash_rating_perception", label: "Safety" },
      { facet: "fit_finish_quality", label: "Build quality" },
    ],
  },
  {
    slug: "best-mpv-in-india",
    title: "Best MPV in India (Based on Real Reviews)",
    seoTitle: "Best MPV in India | CarDhoondo",
    description:
      "Ertiga, XL6, Carens or Innova Hycross? The MPVs owners and expert reviewers rate best, with third row, ride, boot and safety verdicts.",
    eyebrow: "MPVs",
    indexTitle: "Best MPV in India",
    indexDek: "People movers ranked on what owners say about the third row, ride and space, from ₹8 to 25 lakh.",
    published: RESCORED,
    bodies: ["mpv"],
    answers: {
      q_budget_range: ["8", "25"],
      q_seating: "6-7 people",
      q_extra_care: ["Young kids", "Elderly parents"],
    },
    bestQuestion: "What is the best MPV in India?",
    which: "MPV",
    lead: "For a big family that wants an MPV with ₹8 to 25 lakh to spend on-road",
    audience: "a family of six or seven",
    listHeading: "MPVs in India",
    budgetPhrase: "₹8 to 25 lakh",
    judgedOn: "what a big family lives with, like third row space, ride comfort and safety",
    profile:
      "₹8 to 25 lakh on-road, MPVs only, six or seven people with kids and elderly parents, any fuel, any gearbox, mixed driving, a 20 to 50 km daily commute, and safety and trouble-free, cheap ownership as the top priorities",
    checks: [
      { facet: "third_row_usability", label: "Third row" },
      { facet: "rear_legroom_kneeroom", label: "Middle row room" },
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "boot_space_usable", label: "Boot space" },
      { facet: "crash_rating_perception", label: "Safety" },
      { facet: "city_mileage_actual", label: "Real city mileage" },
    ],
    faqs: [
      { facet: "third_row_usability", ask: "has the most usable third row", label: "the third row" },
      { facet: "suspension_softness", ask: "has the most comfortable ride", label: "ride comfort" },
    ],
  },
  {
    slug: "best-car-for-highway-driving-under-15-lakh",
    title: "Best Car for Highway Driving Under ₹15 Lakh (Based on Real Reviews)",
    seoTitle: "Best Car for Highway Driving Under ₹15 Lakh",
    description:
      "The cars owners and expert reviewers rate best on the highway between ₹8 and 15 lakh on-road, with stability, overtaking, ride and refinement verdicts.",
    eyebrow: "Highway cars",
    indexTitle: "Best Car for Highway Driving Under ₹15 Lakh",
    indexDek: "Stable at speed, easy to overtake in, comfortable for hours. Ranked on what owners say.",
    published: RESCORED,
    answers: {
      q_budget_range: ["8", "15"],
      q_extra_care: ["No (only adults)"],
      q_drive_type: "Highway, longer distances",
      q_daily_commute: "50-100km",
      q_priorities: ["Comfortable ride", "Strong performance"],
    },
    bestQuestion: "What is the best car for highway driving under ₹15 lakh?",
    which: "highway car under ₹15 lakh",
    lead: "For someone who spends a lot of time on the highway with ₹8 to 15 lakh to spend on-road",
    audience: "a highway driver",
    listHeading: "cars for highway driving under ₹15 lakh",
    budgetPhrase: "₹8 to 15 lakh",
    judgedOn: "what highway drivers live with, like stability at speed, overtaking and ride comfort",
    profile:
      "₹8 to 15 lakh on-road, any fuel, any gearbox, adults only, mostly highway driving, 50 to 100 km a day, somewhat tight parking, and comfortable ride plus strong performance as the top priorities",
    checks: [
      { facet: "highway_stability", label: "Highway stability" },
      { facet: "highway_overtaking", label: "Overtaking" },
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "nvh_refinement", label: "Cabin refinement" },
      { facet: "highway_mileage_actual", label: "Real highway mileage" },
      { facet: "seat_cushioning_support", label: "Seat comfort" },
    ],
    faqs: [
      { facet: "highway_stability", ask: "is most stable at highway speeds", label: "highway stability" },
      { facet: "highway_overtaking", ask: "is best for overtaking on the highway", label: "highway overtaking" },
    ],
  },
  {
    slug: "best-car-for-long-drives-under-25-lakh",
    title: "Best Car for Long Drives Under ₹25 Lakh (Based on Real Reviews)",
    seoTitle: "Best Car for Long Drives Under ₹25 Lakh | CarDhoondo",
    description:
      "The cars owners and expert reviewers rate most comfortable for long drives between ₹15 and 25 lakh on-road, with seat, ride, quiet and range verdicts.",
    eyebrow: "Long drives",
    indexTitle: "Best Car for Long Drives Under ₹25 Lakh",
    indexDek: "For 100 km days and road trips: the ₹15 to 25 lakh cars owners say stay comfortable for hours.",
    published: RESCORED,
    answers: {
      q_budget_range: ["15", "25"],
      q_extra_care: ["No (only adults)"],
      q_drive_type: "Highway, longer distances",
      q_daily_commute: "100km+ or highly variable",
      q_parking_tightness: "Not tight",
      q_priorities: ["Comfortable ride"],
    },
    bestQuestion: "What is the best car for long drives under ₹25 lakh?",
    which: "long-drive car under ₹25 lakh",
    lead: "For someone who drives 100 km or more a day, or takes long road trips, with ₹15 to 25 lakh to spend on-road",
    audience: "a long-distance driver",
    listHeading: "cars for long drives under ₹25 lakh",
    budgetPhrase: "₹15 to 25 lakh",
    judgedOn: "what long-distance drivers live with, like seat comfort, ride and a quiet cabin",
    profile:
      "₹15 to 25 lakh on-road, any fuel, any gearbox, adults only, mostly highway driving, 100 km or more a day, plenty of parking space, and a comfortable ride as the top priority",
    checks: [
      { facet: "seat_cushioning_support", label: "Seat comfort" },
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "nvh_refinement", label: "Cabin refinement" },
      { facet: "highway_stability", label: "Highway stability" },
      { facet: "highway_mileage_actual", label: "Real highway mileage or range" },
      { facet: "boot_space_usable", label: "Boot space" },
    ],
    faqs: [
      { facet: "seat_cushioning_support", ask: "has the most comfortable seats for long drives", label: "seat comfort" },
      { facet: "nvh_refinement", ask: "has the quietest cabin", label: "cabin refinement" },
    ],
  },
  {
    slug: "best-car-for-elderly-parents-under-15-lakh",
    title: "Best Car for Elderly Parents Under ₹15 Lakh (Based on Real Reviews)",
    seoTitle: "Best Car for Elderly Parents Under ₹15 Lakh",
    description:
      "The cars owners and expert reviewers rate best for elderly parents between ₹8 and 15 lakh on-road: easy to get into, soft ride, comfortable back seat.",
    eyebrow: "Family cars",
    indexTitle: "Best Car for Elderly Parents Under ₹15 Lakh",
    indexDek: "Easy to get in and out of, with a soft ride and a back seat parents are happy in.",
    published: RESCORED,
    answers: {
      q_budget_range: ["8", "15"],
      q_extra_care: ["Elderly parents"],
      q_priorities: ["Comfortable ride", "Safety and solid build"],
    },
    bestQuestion: "What is the best car for elderly parents under ₹15 lakh?",
    which: "car for elderly parents under ₹15 lakh",
    lead: "For a family buying with elderly parents in mind and ₹8 to 15 lakh to spend on-road",
    audience: "a family with elderly parents",
    listHeading: "cars for elderly parents under ₹15 lakh",
    budgetPhrase: "₹8 to 15 lakh",
    judgedOn: "what older passengers live with, like a soft ride, a comfortable back seat and easy entry",
    profile:
      "₹8 to 15 lakh on-road, any fuel, any gearbox, up to four people with elderly parents, mixed city and highway driving, a 20 to 50 km daily commute, somewhat tight parking, and comfortable ride plus safety as the top priorities (cars that sit too low for easy entry are marked down)",
    checks: [
      { facet: "suspension_softness", label: "Ride comfort" },
      { facet: "seat_cushioning_support", label: "Seat comfort" },
      { facet: "rear_legroom_kneeroom", label: "Back seat room" },
      { facet: "nvh_refinement", label: "Cabin refinement" },
      { facet: "crash_rating_perception", label: "Safety" },
      { facet: "fit_finish_quality", label: "Build quality" },
    ],
    faqs: [
      { facet: "suspension_softness", ask: "has the most comfortable ride", label: "ride comfort" },
      { facet: "rear_legroom_kneeroom", ask: "has the most comfortable back seat", label: "back seat room" },
    ],
  },
];

export function findRankedGuide(slug: string): RankedGuide | undefined {
  return RANKED_GUIDES.find((g) => g.slug === slug);
}
