/**
 * TypeScript port of scripts/questionnaire_weights.py -- kept as a 1:1 port,
 * not a rewrite, so the two stay easy to diff against each other if the
 * Python policy data changes. See docs/questionnaire.md (v3) for what each
 * question id/answer means and docs/review_taxonomy.md for the facet list.
 *
 * Pure policy data (which question answer boosts which facet, and by how
 * much) -- kept separate from scoreRecommendation.ts the same way the
 * Python version keeps it separate from score_recommendation.py.
 *
 * q_budget, q_fuel, q_transmission, q_parking_tightness, q_brand_avoid are
 * structural filters / soft score-multipliers handled entirely in
 * recommend.ts -- they carry no facet-weight rule here.
 */

export const FACET_THEME_MAP: Record<string, string> = {
  // ride_quality
  suspension_softness: "ride_quality",
  highway_stability: "ride_quality",
  handling_cornering: "ride_quality",
  nvh_refinement: "ride_quality",
  tire_quality: "ride_quality",
  ground_clearance_practicality: "ride_quality",
  // mileage_efficiency
  city_mileage_actual: "mileage_efficiency",
  highway_mileage_actual: "mileage_efficiency",
  mileage_vs_claimed_gap: "mileage_efficiency",
  // reliability
  engine_gearbox_issues: "reliability",
  electrical_issues: "reliability",
  breakdown_frequency: "reliability",
  build_longevity: "reliability",
  // service_cost
  routine_service_cost: "service_cost",
  spare_parts_cost: "service_cost",
  spare_parts_availability: "service_cost",
  // after_sales_dealer
  service_center_availability: "after_sales_dealer",
  wait_time_appointment: "after_sales_dealer",
  staff_competence: "after_sales_dealer",
  service_transparency: "after_sales_dealer",
  warranty_claim_experience: "after_sales_dealer",
  // resale_value
  depreciation_rate: "resale_value",
  resale_demand: "resale_value",
  trade_in_experience: "resale_value",
  // safety_build_quality
  crash_rating_perception: "safety_build_quality",
  airbag_adequacy: "safety_build_quality",
  adas_reliability: "safety_build_quality",
  fit_finish_quality: "safety_build_quality",
  braking_performance: "safety_build_quality",
  // power_drivability
  city_drivability: "power_drivability",
  highway_overtaking: "power_drivability",
  turbo_lag: "power_drivability",
  engine_refinement: "power_drivability",
  offroad_traction_capability: "power_drivability",
  // feature_tech
  touchscreen_lag: "feature_tech",
  connected_car_features: "feature_tech",
  sunroof_quality: "feature_tech",
  climate_control_effectiveness: "feature_tech",
  exterior_lighting_quality: "feature_tech",
  audio_system_quality: "feature_tech",
  // cabin_space
  front_legroom_headroom: "cabin_space",
  rear_legroom_kneeroom: "cabin_space",
  third_row_usability: "cabin_space",
  boot_space_usable: "cabin_space",
  seat_cushioning_support: "cabin_space",
  // visibility_ergonomics
  blind_spots: "visibility_ergonomics",
  driving_position: "visibility_ergonomics",
  dashboard_layout: "visibility_ergonomics",
  // parking_maneuverability
  turning_radius: "parking_maneuverability",
  width_tight_spaces: "parking_maneuverability",
  parking_sensors_camera_quality: "parking_maneuverability",
};

export const ALL_FACETS: string[] = Object.keys(FACET_THEME_MAP);
export const ALL_THEMES: string[] = Array.from(new Set(Object.values(FACET_THEME_MAP))).sort();

export const MAX_FACET_WEIGHT = 5.0;
export const MIN_FACET_WEIGHT = 0.2;

type Rule = [target: string, multiplier: number];

// Each rule: question_id -> answer -> [(target, multiplier), ...]. target is
// a theme name (applies to every facet in that theme) or an exact facet
// name. Multiple applicable rules compose multiplicatively onto a baseline
// weight of 1.0 per facet.
export const WEIGHT_RULES: Record<string, Record<string, Rule[]>> = {
  q_drive_type: {
    // Merges v2's q1_usage + q2_trip_pattern into one question -- each
    // option now fires both the road-character weights and the
    // mileage/reliability weights that used to need two separate answers.
    "City, short trips": [
      ["parking_maneuverability", 1.5],
      ["city_mileage_actual", 1.8],
      ["engine_gearbox_issues", 1.5],
    ],
    "Highway, longer distances": [
      ["highway_stability", 1.8],
      ["highway_overtaking", 1.5],
      ["highway_mileage_actual", 1.8],
      ["seat_cushioning_support", 1.5],
    ],
    "Hilly or ghat roads": [
      ["braking_performance", 1.5],
      ["handling_cornering", 1.5],
      ["engine_refinement", 1.3],
    ],
    "Rural or broken roads": [
      ["suspension_softness", 2.0],
      ["nvh_refinement", 1.3],
      ["ground_clearance_practicality", 1.4],
      ["offroad_traction_capability", 1.2],
    ],
    Mixed: [
      ["highway_stability", 1.2],
      ["parking_maneuverability", 1.2],
      ["city_mileage_actual", 1.2],
      ["highway_mileage_actual", 1.2],
    ],
  },
  // q_daily_commute feeds a fuel-recommendation *score nudge*, applied in
  // recommend.ts against a variant's fuel type (only when the fuel answer
  // is ambiguous) -- not a facet weight, so no rule here.
  q_seating: {
    "7 seater": [["third_row_usability", 2.0]],
    // Headcount answers (24 Oct 2026). Three in the back makes rear room as
    // important as a top-2 priority; reviews alone had it at ~2% of the score.
    "6-7 people": [["third_row_usability", 2.0]],
    "5 people": [["rear_legroom_kneeroom", 2.5]],
    "3-4 people": [["rear_legroom_kneeroom", 1.3]],
  },
  q_who_rides: {
    Partner: [["seat_cushioning_support", 1.3]],
    "Young kids": [["safety_build_quality", 1.5], ["rear_legroom_kneeroom", 1.3]],
    "Elderly parents": [
      ["safety_build_quality", 1.5],
      ["rear_legroom_kneeroom", 1.5],
      ["seat_cushioning_support", 1.3],
    ],
    "Other adults or friends": [
      ["third_row_usability", 1.3],
      ["rear_legroom_kneeroom", 1.3],
    ],
  },
  q_top2_priorities: {
    "Ride quality and handling": [["ride_quality", 2.5]],
    "Safety and build quality": [["safety_build_quality", 2.5]],
    "Fuel efficiency": [["mileage_efficiency", 2.5]],
    "Power and acceleration": [["power_drivability", 2.5]],
    "Features and tech": [["feature_tech", 2.5]],
    "Low running costs": [["service_cost", 2.0]],
  },
  q_frustration: {
    // "Frequent refuelling" is the option value even when the displayed
    // label swaps to "Frequent charging stops" for EV-only fuel
    // selections (same underlying facet, see docs/questionnaire.md).
    "Frequent refuelling": [["mileage_efficiency", 1.8]],
    "Jerky or bumpy rides": [["suspension_softness", 1.8]],
    "Slow overtakes": [["highway_overtaking", 1.8]],
    "Poor visibility or comfort": [["visibility_ergonomics", 1.8]],
    "Lack of modern tech": [["feature_tech", 1.5]],
  },
};

export type QuestionnaireAnswers = Record<string, string | string[]>;

// ---------------------------------------------------------------------------
// Questionnaire v4 (22 Nov 2026, docs/questionnaire_v4_decisions.md)
// ---------------------------------------------------------------------------
// New answers use NEW question ids (q_budget_range, q_extra_care,
// q_priorities, q_brand_love), so every answer saved before v4 (and every
// guide in lib/guides, which still uses the v3 ids) scores exactly as it did.
// The extra v4-only rules below (commute comfort, adults in the back) are
// switched on only when the answers are v4.

export const PRIORITY_THEMES: Record<string, [string, number][]> = {
  // [theme, share of the per-pick multiplier]
  "Comfortable ride": [["ride_quality", 1]],
  "Safety and solid build": [["safety_build_quality", 1]],
  "Good mileage": [["mileage_efficiency", 1]],
  "Strong performance": [["power_drivability", 1]],
  "Features and tech": [["feature_tech", 1]],
  "Trouble-free, cheap to own": [
    ["reliability", 1],
    ["service_cost", 0.8],
    ["after_sales_dealer", 0.6],
  ],
  "Space for people and luggage": [["cabin_space", 1]],
};
export const PRIORITY_BALANCED = "Balanced, no strong focus";
export const CARE_ONLY_ADULTS = "No (only adults)";

const V3_ONLY_QUESTIONS = new Set(["q_budget", "q_who_rides", "q_top2_priorities", "q_frustration"]);

export function isV4Answers(answers: QuestionnaireAnswers): boolean {
  return "q_priorities" in answers || "q_budget_range" in answers || "q_extra_care" in answers;
}

function listOf(answer: string | string[] | undefined): string[] {
  if (answer == null) return [];
  return Array.isArray(answer) ? answer : [answer];
}

function multiplyTarget(weights: Record<string, number>, target: string, multiplier: number) {
  if (target in FACET_THEME_MAP) {
    weights[target] *= multiplier;
    return;
  }
  for (const [facet, theme] of Object.entries(FACET_THEME_MAP)) {
    if (theme === target) weights[facet] *= multiplier;
  }
}

// q_extra_care: kids push safety as hard as a top priority; parents keep the
// v3 "Elderly parents" weights (their height check lives in recommend.ts).
const EXTRA_CARE_RULES: Record<string, Rule[]> = {
  "Young kids": [["safety_build_quality", 2.5], ["rear_legroom_kneeroom", 1.3]],
  "Elderly parents": [
    ["safety_build_quality", 1.5],
    ["rear_legroom_kneeroom", 1.5],
    ["seat_cushioning_support", 1.3],
  ],
};

// Long daily distance: comfort counts for more whatever the fuel.
const COMMUTE_COMFORT_RULES: Record<string, Rule[]> = {
  "50-100km": [["seat_cushioning_support", 1.3], ["nvh_refinement", 1.2]],
  "100km+ or highly variable": [
    ["seat_cushioning_support", 1.5],
    ["nvh_refinement", 1.3],
    ["highway_mileage_actual", 1.3],
  ],
};

function applyV4Rules(weights: Record<string, number>, answers: QuestionnaireAnswers) {
  // Priorities: pick 1-3. With 3 picks each counts a little less so the
  // result stays focused. "Balanced" adds nothing on purpose.
  const picks = listOf(answers["q_priorities"]).filter((p) => p in PRIORITY_THEMES);
  const perPick = picks.length >= 3 ? 2.0 : 2.5;
  for (const p of picks) {
    for (const [theme, share] of PRIORITY_THEMES[p]) multiplyTarget(weights, theme, 1 + (perPick - 1) * share);
  }

  const care = listOf(answers["q_extra_care"]);
  for (const c of care) for (const [t, m] of EXTRA_CARE_RULES[c] ?? []) multiplyTarget(weights, t, m);

  // Only adults: grown-ups ride in the back, so back seat and third row
  // matter more than the headcount alone says.
  if (care.includes(CARE_ONLY_ADULTS)) {
    const seats = answers["q_seating"];
    if (seats === "6-7 people") {
      multiplyTarget(weights, "third_row_usability", 1.25); // 2.0x -> 2.5x
      multiplyTarget(weights, "rear_legroom_kneeroom", 1.5);
    } else if (seats === "3-4 people") {
      multiplyTarget(weights, "rear_legroom_kneeroom", 1.23); // 1.3x -> 1.6x
    }
  }

  const commute = answers["q_daily_commute"];
  if (typeof commute === "string") {
    for (const [t, m] of COMMUTE_COMFORT_RULES[commute] ?? []) multiplyTarget(weights, t, m);
    // Electric only, long days: how far real range falls short of the claim matters more.
    const fuels = listOf(answers["q_fuel"]);
    if (fuels.length === 1 && fuels[0] === "Electric" && commute in COMMUTE_COMFORT_RULES) {
      multiplyTarget(weights, "mileage_vs_claimed_gap", 1.5);
    }
  }
}

/**
 * answers: {question_id: answer}, e.g. {q_top2_priorities: ["Ride quality
 * and handling", "Safety and build quality"]}. q_top2_priorities (pick
 * exactly 2) and q_who_rides (pick any) are the multi-select questions --
 * pass an array for those, plain strings for everything else.
 * Structural-filter questions (q_budget, q_fuel, q_transmission,
 * q_parking_tightness, q_brand_avoid) can be present in answers too;
 * they're simply ignored here since they have no WEIGHT_RULES entry
 * (recommend.ts reads them directly instead). Returns {facet_name: weight},
 * clamped to [MIN_FACET_WEIGHT, MAX_FACET_WEIGHT].
 */
export function deriveWeightVector(answers: QuestionnaireAnswers): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const facet of ALL_FACETS) weights[facet] = 1.0;

  const v4 = isV4Answers(answers);
  for (const [questionId, answer] of Object.entries(answers)) {
    // v4 replaced these; a leftover v3 answer in the same set must not count twice.
    if (v4 && V3_ONLY_QUESTIONS.has(questionId)) continue;
    const ruleSet = WEIGHT_RULES[questionId];
    if (!ruleSet) continue;
    const selected = Array.isArray(answer) ? answer : [answer];
    for (const choice of selected) {
      const rules = ruleSet[choice];
      if (!rules) continue;
      for (const [target, multiplier] of rules) {
        if (target in FACET_THEME_MAP) {
          weights[target] *= multiplier;
        } else if (ALL_THEMES.includes(target)) {
          for (const [facet, theme] of Object.entries(FACET_THEME_MAP)) {
            if (theme === target) weights[facet] *= multiplier;
          }
        }
      }
    }
  }

  if (v4) applyV4Rules(weights, answers);

  for (const facet of Object.keys(weights)) {
    weights[facet] = Math.max(MIN_FACET_WEIGHT, Math.min(MAX_FACET_WEIGHT, weights[facet]));
  }

  return weights;
}
