/**
 * Plain assert-based test for lib/persona/derivePersona.ts, using the nine
 * worked examples from docs/login_flow_design.md section C.9.
 * Run:  npx --yes tsx scripts/persona.test.ts   (from web/)
 */
import assert from "node:assert/strict";
import { derivePersona, disambiguate, topPicksLine } from "../lib/persona/derivePersona";

type A = Record<string, string | string[]>;

const cases: { name: string; answers: A; title: string; chips: string[] }[] = [
  {
    name: "1 city family",
    answers: {
      q_budget: ["10-15L", "15-20L"], q_fuel: ["Petrol"], q_seating: "4/5 seater", q_transmission: "Automatic",
      q_drive_type: "City, short trips", q_daily_commute: "20-50km", q_parking_tightness: "Very tight",
      q_who_rides: ["Partner", "Young kids"], q_top2_priorities: ["Safety and build quality", "Fuel efficiency"],
    },
    title: "The Safety-first City Family",
    chips: ["₹10–20L", "Petrol · Automatic", "4–5 seats", "Safety + Mileage"],
  },
  {
    name: "2 joint family highway",
    answers: {
      q_budget: ["20-25L", ">25L"], q_fuel: ["Diesel"], q_seating: "7 seater", q_transmission: "Manual",
      q_drive_type: "Highway, longer distances", q_daily_commute: "50-100km", q_parking_tightness: "Not tight",
      q_who_rides: ["Partner", "Young kids", "Elderly parents"], q_top2_priorities: ["Ride quality and handling", "Low running costs"],
    },
    title: "The Comfort-first Highway Joint Family",
    chips: ["₹20L+", "Diesel · Manual", "7 seats", "Ride + Running costs"],
  },
  {
    name: "3 value short-hop solo",
    answers: {
      q_budget: ["5-10L"], q_fuel: [], q_seating: "Either works", q_transmission: "Automatic",
      q_drive_type: "Mixed", q_daily_commute: "Under 20km", q_parking_tightness: "Somewhat tight",
      q_who_rides: ["Just me"], q_top2_priorities: ["Fuel efficiency", "Low running costs"],
    },
    title: "The Value-first Short-hop Solo Driver",
    chips: ["₹5–10L", "Any fuel · Automatic", "Any seating", "Mileage + Running costs"],
  },
  {
    name: "4 EV couple",
    answers: {
      q_budget: ["15-20L", "20-25L"], q_fuel: ["Electric"], q_seating: "4/5 seater",
      q_drive_type: "City, short trips", q_daily_commute: "20-50km", q_parking_tightness: "Somewhat tight",
      q_who_rides: ["Partner"], q_top2_priorities: ["Features and tech", "Safety and build quality"],
    },
    title: "The Safety-first City EV Couple",
    chips: ["₹15–25L", "Electric", "4–5 seats", "Safety + Tech"],
  },
  {
    name: "5 rough-road crew",
    answers: {
      q_budget: ["<5L", "5-10L"], q_fuel: ["Petrol", "CNG"], q_seating: "4/5 seater", q_transmission: "Manual",
      q_drive_type: "Rural or broken roads", q_daily_commute: "Under 20km", q_parking_tightness: "Not tight",
      q_who_rides: ["Just me", "Other adults or friends"], q_top2_priorities: ["Ride quality and handling", "Low running costs"],
    },
    title: "The Comfort-first Rough-road Crew",
    chips: ["Under ₹10L", "Petrol/CNG · Manual", "4–5 seats", "Ride + Running costs"],
  },
  {
    name: "6 hill-road family",
    answers: {
      q_budget: ["10-15L", "20-25L"], q_fuel: ["Petrol", "Diesel"], q_seating: "Either works", q_transmission: "No preference",
      q_drive_type: "Hilly or ghat roads", q_daily_commute: "50-100km", q_parking_tightness: "Not tight",
      q_who_rides: ["Elderly parents"], q_top2_priorities: ["Power and acceleration", "Ride quality and handling"],
    },
    title: "The Comfort-first Hill-road Family",
    chips: ["₹10–15L · ₹20–25L", "Petrol/Diesel", "Any seating", "Ride + Power"],
  },
  {
    name: "8 tech highway couple",
    answers: {
      q_budget: [">25L"], q_fuel: ["Petrol"], q_seating: "4/5 seater", q_transmission: "Automatic",
      q_drive_type: "Highway, longer distances", q_daily_commute: "100km+ or highly variable", q_parking_tightness: "Not tight",
      q_who_rides: ["Partner"], q_top2_priorities: ["Power and acceleration", "Features and tech"],
    },
    title: "The Tech-forward Highway Couple",
    chips: ["₹25L+", "Petrol · Automatic", "4–5 seats", "Tech + Power"],
  },
  {
    name: "9 sparse",
    answers: { q_budget: ["10-15L"], q_who_rides: ["Young kids"] },
    title: "The Balanced Family",
    chips: ["₹10–15L", "Any fuel", "Any seating", "Priorities not set"],
  },
];

for (const c of cases) {
  const p = derivePersona(c.answers);
  assert.equal(p.title, c.title, `${c.name}: title`);
  assert.deepEqual(p.chips, c.chips, `${c.name}: chips`);
}

// 7: collision -- two searches with the same title, separated by budget.
const a = derivePersona(cases[0].answers);
const b = derivePersona({
  q_budget: ["20-25L"], q_fuel: ["Diesel"], q_seating: "7 seater", q_transmission: "Automatic",
  q_drive_type: "City, short trips", q_daily_commute: "20-50km", q_parking_tightness: "Very tight",
  q_who_rides: ["Partner", "Young kids"], q_top2_priorities: ["Safety and build quality", "Ride quality and handling"],
});
assert.equal(b.title, "The Safety-first City Family");
assert.deepEqual(b.chips, ["₹20–25L", "Diesel · Automatic", "7 seats", "Safety + Ride"]);
const d = disambiguate([
  { id: "A", created_at: "2026-09-01", persona: a },
  { id: "B", created_at: "2026-09-02", persona: b },
]);
assert.deepEqual(d, { A: "₹10–20L", B: "₹20–25L" });

// unique titles get no suffix
const solo = disambiguate([{ id: "X", created_at: "2026-09-01", persona: derivePersona(cases[1].answers) }]);
assert.deepEqual(solo, { X: null });

// identical searches fall back to numbering
const twin = disambiguate([
  { id: "1", created_at: "2026-09-01", persona: a },
  { id: "2", created_at: "2026-09-02", persona: a },
]);
assert.deepEqual(twin, { "1": "#1", "2": "#2" });

// top picks line
assert.equal(topPicksLine([]), "No confident match at save time — open to re-check.");
assert.equal(
  topPicksLine([
    { car_id: "x", brand: "Hyundai", car_model: "Venue", variant_id: "v", price_on_road: 1, rank: 1 },
    { car_id: "y", brand: "Toyota", car_model: "Urban Cruiser Hyryder", variant_id: "v", price_on_road: 1, rank: 2 },
  ]),
  "Top picks: Hyundai Venue · Toyota Urban Cruiser Hyryder",
);

console.log(`persona tests passed (${cases.length} worked examples + collision/numbering/top-picks)`);
