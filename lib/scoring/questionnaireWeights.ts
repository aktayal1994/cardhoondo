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

  for (const [questionId, answer] of Object.entries(answers)) {
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

  for (const facet of Object.keys(weights)) {
    weights[facet] = Math.max(MIN_FACET_WEIGHT, Math.min(MAX_FACET_WEIGHT, weights[facet]));
  }

  return weights;
}
