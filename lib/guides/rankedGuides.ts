import type { QuestionnaireAnswers } from "../scoring/questionnaireWeights";

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

/** A typical young family; each guide overrides what makes it different. */
export const BASE_ANSWERS: QuestionnaireAnswers = {
  q_budget: ["<5L", "5-10L"],
  q_fuel: ["No preference"],
  q_seating: "3-4 people",
  q_transmission: "No preference",
  q_drive_type: "Mixed",
  q_daily_commute: "20-50km",
  q_parking_tightness: "Somewhat tight",
  q_who_rides: ["Partner", "Young kids"],
  q_top2_priorities: ["Safety and build quality", "Low running costs"],
  q_frustration: "Jerky or bumpy rides",
  q_brand_avoid: [],
};

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
  "any fuel, any gearbox, two adults and young kids, mixed city and highway driving, a 20 to 50 km daily commute, somewhat tight parking, and safety plus low running costs as the top two priorities";

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
    answers: { q_budget: ["<5L", "5-10L"] },
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
    answers: { q_budget: ["10-15L"] },
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
    answers: { q_budget: ["15-20L"] },
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
    answers: {
      q_budget: ["10-15L", "15-20L"],
      q_seating: "6-7 people",
      q_who_rides: ["Partner", "Young kids", "Elderly parents"],
    },
    bestQuestion: "What is the best 7 seater car under ₹20 lakh?",
    which: "7 seater under ₹20 lakh",
    lead: "For a big family with ₹10 to 20 lakh to spend on-road",
    audience: "a family of six or seven",
    listHeading: "7 seaters under ₹20 lakh",
    budgetPhrase: "₹10 to 20 lakh",
    judgedOn: "what a big family lives with, like third row space, ride comfort and safety",
    profile:
      "₹10 to 20 lakh on-road, six or seven people with kids and elderly parents, any fuel, any gearbox, mixed driving, a 20 to 50 km daily commute, and safety plus low running costs as the top two priorities",
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
    answers: { q_budget: ["<5L", "5-10L"], q_fuel: ["CNG"] },
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
    answers: { q_budget: ["<5L", "5-10L"], q_transmission: "Automatic" },
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
    answers: { q_budget: ["10-15L", "15-20L"], q_fuel: ["Electric"] },
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
    answers: {
      q_budget: ["<5L", "5-10L"],
      q_seating: "1-2 people",
      q_who_rides: ["Just me", "Partner"],
      q_parking_tightness: "Very tight",
      q_drive_type: "City, short trips",
      q_daily_commute: "Under 20km",
      q_top2_priorities: ["Low running costs", "Fuel efficiency"],
      q_frustration: "Poor visibility or comfort",
    },
    bestQuestion: "What is the best first car for city driving under ₹10 lakh?",
    which: "first car under ₹10 lakh",
    lead: "For a first-time buyer driving mostly in the city with up to ₹10 lakh to spend on-road",
    audience: "a first-time buyer in the city",
    listHeading: "first cars for city driving",
    budgetPhrase: "up to ₹10 lakh",
    judgedOn: "what a new driver lives with, like how easy they are to drive and park, and real mileage",
    profile:
      "up to ₹10 lakh on-road, one or two people, any fuel, any gearbox, short city trips under 20 km a day, very tight parking, and low running costs plus fuel efficiency as the top two priorities",
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
];

export function findRankedGuide(slug: string): RankedGuide | undefined {
  return RANKED_GUIDES.find((g) => g.slug === slug);
}
