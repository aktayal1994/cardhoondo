/**
 * Fallback on-road price estimate for a (car, city) pair scripts/
 * city_price_scraper.py hasn't scraped real data for yet.
 *
 * Every one of the 25 cities in cityMaster.ts is either being scraped
 * directly, or is what every Indian state/UT in STATE_DEFAULT_CITY resolves
 * to -- so this table only ever needs to cover those 25 city_keys, not every
 * state in India. It exists purely as a stop-gap for the window before the
 * scraper (which runs city-by-city, car-by-car and can take a while to
 * finish a full pass) has reached a given pair, not as a long-term pricing
 * source -- real scraped data always wins when it exists (see
 * getQuotationPrice in this same folder).
 *
 * Multipliers are ballpark on-road/ex-showroom ratios built from each
 * state's publicly known RTO tax slabs + ~4% first-year comprehensive
 * insurance -- genuinely approximate (real RTO tax is slab-based on price
 * and varies further by fuel type), which is exactly why the UI must label
 * anything using this table "Estimated", never presented as a firm quote.
 */
export const CITY_ON_ROAD_MULTIPLIER: Record<string, number> = {
  new_delhi: 1.13,
  gurgaon: 1.15,
  noida: 1.15,
  mumbai: 1.19,
  pune: 1.19,
  nagpur: 1.19,
  bengaluru: 1.23,
  hyderabad: 1.2,
  chennai: 1.18,
  coimbatore: 1.18,
  kolkata: 1.16,
  ahmedabad: 1.15,
  surat: 1.15,
  jaipur: 1.17,
  lucknow: 1.15,
  kanpur: 1.15,
  chandigarh: 1.16,
  bhopal: 1.17,
  indore: 1.17,
  patna: 1.15,
  kochi: 1.19,
  thiruvananthapuram: 1.19,
  guwahati: 1.15,
  bhubaneswar: 1.15,
  dehradun: 1.15,
};

const DEFAULT_MULTIPLIER = 1.16;
/** First-year comprehensive insurance, as a share of ex-showroom price --
 * used only to split the estimated markup into a plausible RTO-vs-insurance
 * breakdown for display; the total (on_road_price) is what actually matters. */
const INSURANCE_SHARE_OF_EX_SHOWROOM = 0.04;

export interface EstimatedBreakdown {
  ex_showroom_price: number;
  rto: number;
  insurance: number;
  on_road_price: number;
  source: "estimated";
}

export function estimateOnRoadPrice(exShowroomPrice: number, cityKey: string): EstimatedBreakdown {
  const multiplier = CITY_ON_ROAD_MULTIPLIER[cityKey] ?? DEFAULT_MULTIPLIER;
  const onRoadPrice = Math.round(exShowroomPrice * multiplier);
  const insurance = Math.round(exShowroomPrice * INSURANCE_SHARE_OF_EX_SHOWROOM);
  const rto = Math.max(onRoadPrice - exShowroomPrice - insurance, 0);
  return { ex_showroom_price: exShowroomPrice, rto, insurance, on_road_price: onRoadPrice, source: "estimated" };
}
