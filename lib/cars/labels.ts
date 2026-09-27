import { humanize } from "../format";

/** Reader-friendly names for the 12 review themes and 51 facets (the raw
 * slugs like "nvh_refinement" mean nothing to a car buyer). Anything not
 * listed falls back to a humanised slug so a new facet never breaks a page. */
const THEME_LABELS: Record<string, string> = {
  ride_quality: "Ride and handling",
  mileage_efficiency: "Mileage and fuel efficiency",
  reliability: "Reliability",
  service_cost: "Service and spare parts cost",
  after_sales_dealer: "Service network and dealers",
  resale_value: "Resale value",
  safety_build_quality: "Safety and build quality",
  power_drivability: "Engine and performance",
  feature_tech: "Features and technology",
  cabin_space: "Cabin space and comfort",
  visibility_ergonomics: "Visibility and ergonomics",
  parking_maneuverability: "Parking and maneuverability",
};

const FACET_LABELS: Record<string, string> = {
  suspension_softness: "Ride comfort",
  highway_stability: "Highway stability",
  handling_cornering: "Handling",
  nvh_refinement: "Cabin refinement",
  tire_quality: "Tyre quality",
  ground_clearance_practicality: "Ground clearance",
  city_mileage_actual: "City mileage",
  highway_mileage_actual: "Highway mileage",
  mileage_vs_claimed_gap: "Claimed vs real mileage",
  engine_gearbox_issues: "Drivetrain reliability",
  electrical_issues: "Electrical reliability",
  breakdown_frequency: "Breakdown record",
  build_longevity: "Long-term build quality",
  routine_service_cost: "Routine service cost",
  spare_parts_cost: "Spare parts cost",
  spare_parts_availability: "Spare parts availability",
  service_center_availability: "Service centre availability",
  wait_time_appointment: "Service wait times",
  staff_competence: "Service staff competence",
  service_transparency: "Service transparency",
  warranty_claim_experience: "Warranty claims",
  depreciation_rate: "Depreciation",
  resale_demand: "Resale demand",
  trade_in_experience: "Trade-in experience",
  crash_rating_perception: "Crash safety",
  airbag_adequacy: "Airbags",
  adas_reliability: "ADAS driver assistance",
  fit_finish_quality: "Fit & finish",
  braking_performance: "Braking",
  city_drivability: "City drivability",
  highway_overtaking: "Highway overtaking",
  turbo_lag: "Turbo response",
  engine_refinement: "Engine refinement",
  offroad_traction_capability: "Off-road capability",
  touchscreen_lag: "Touchscreen responsiveness",
  connected_car_features: "Connected car features",
  sunroof_quality: "Sunroof",
  climate_control_effectiveness: "Air conditioning",
  exterior_lighting_quality: "Headlight quality",
  audio_system_quality: "Audio system",
  front_legroom_headroom: "Front seat space",
  rear_legroom_kneeroom: "Rear seat space",
  third_row_usability: "Third row usability",
  boot_space_usable: "Boot space",
  seat_cushioning_support: "Seat comfort",
  blind_spots: "Visibility and blind spots",
  driving_position: "Driving position",
  dashboard_layout: "Dashboard layout",
  turning_radius: "Turning radius",
  width_tight_spaces: "Tight-space driving",
  parking_sensors_camera_quality: "Parking camera & sensors",
};

export function themeLabel(theme: string): string {
  return THEME_LABELS[theme] ?? humanize(theme);
}

export function facetLabel(facet: string): string {
  return FACET_LABELS[facet] ?? humanize(facet);
}

/** Lower-cased for use mid-sentence, keeping acronyms (ADAS, NVH) intact. */
export function facetLabelInline(facet: string): string {
  const label = facetLabel(facet);
  const firstWord = label.split(" ")[0];
  return firstWord === firstWord.toUpperCase() ? label : label.charAt(0).toLowerCase() + label.slice(1);
}
