/** Client-safe shapes for "Decide between" (/decide, /api/decide). */

export interface DecideAreaVerdict {
  facet: string;
  label: string;
  verdict: string;
  claims: number;
}

export interface DecideCar {
  car_id: string;
  name: string;
  model: string;
  rank: number;
  variant_id: string;
  fuel: string;
  transmission: string;
  price_on_road: number | null;
  score: number;
  facets_with_data: number;
  /** Where reviews rate it best, weighted by what this buyer cares about. */
  strengths: DecideAreaVerdict[];
  weaknesses: DecideAreaVerdict[];
  /** Size, comfort and fuel adjustments that moved it for this buyer. */
  adjustments: string[];
}

export interface DecideNotFit {
  car_id: string;
  name: string;
  model: string;
  reasons: string[];
}

/** One area where the two leading cars clearly differ. */
export interface DecideArea {
  facet: string;
  label: string;
  winner_verdict: string;
  other_verdict: string;
  winner_claims: number;
  other_claims: number;
  /** The buyer's answers gave this area extra weight. */
  matters_to_you: boolean;
  /** A reviewer's words for the car that is ahead on it. */
  quote: string | null;
}

export interface DecideMatchup {
  strength: "clear" | "close" | "tie";
  /** Where #1 is ahead. */
  ahead: DecideArea[];
  /** Where the other car is ahead (winner_verdict is still #1's). */
  behind: DecideArea[];
}

export interface DecideResult {
  cars: DecideCar[];
  not_fit: DecideNotFit[];
  verdict: {
    winner_id: string;
    /** #2, the matchup shown first. */
    runner_up_id: string;
    /** #1 against each other ranked car, keyed by that car's id. */
    matchups: Record<string, DecideMatchup>;
  } | null;
  /** car_id -> /cars/<slug> for cars with a published review page. */
  car_pages: Record<string, string>;
  compare_links: { slug: string; a: string; b: string }[];
}

/** The questions "Decide between" asks, in order (ids from lib/questions.ts). */
export const DECIDE_QUESTION_IDS = [
  "q_budget_range",
  "q_seating",
  "q_extra_care",
  "q_drive_type",
  "q_daily_commute",
  "q_parking_tightness",
  "q_priorities",
  "q_fuel",
  "q_transmission",
] as const;
