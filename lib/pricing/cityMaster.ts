import cityMasterData from "./cityMaster.json";

/** Copied from data/city_master.json at the repo root -- kept in sync by
 * hand, same convention as web/lib/scoring/*.ts being close ports of the
 * Python scripts. This copy exists because cardhoondo-deploy (the repo
 * Vercel actually builds from) only ships web/'s own contents, so anything
 * the live app reads has to live inside web/, not one level up. */

export interface CityMasterEntry {
  city_key: string;
  display_name: string;
  state: string;
  cardekho_slug: string;
  tier: "metro" | "tier1" | "tier2";
  aliases: string[];
}

interface CityMasterFile {
  cities: CityMasterEntry[];
  state_default_city: Record<string, string>;
  default_city: string;
}

const data = cityMasterData as CityMasterFile;

export const CITIES: CityMasterEntry[] = data.cities;
export const STATE_DEFAULT_CITY: Record<string, string> = data.state_default_city;
export const DEFAULT_CITY_KEY: string = data.default_city;

const byKey = new Map(CITIES.map((c) => [c.city_key, c]));

export function getCity(cityKey: string): CityMasterEntry | undefined {
  return byKey.get(cityKey);
}

/** Matches a district/city string (as returned by a pincode lookup) against
 * every city's alias list, case-insensitively, exact-match only -- pincode
 * APIs return clean district names, not free text, so a loose substring
 * match would risk false positives (e.g. "Nagpur" matching inside a longer
 * unrelated district name). Returns null if nothing matches; the caller
 * falls back to STATE_DEFAULT_CITY. */
export function matchCityByDistrict(district: string | null | undefined): CityMasterEntry | null {
  if (!district) return null;
  const needle = district.trim().toLowerCase();
  for (const city of CITIES) {
    if (city.aliases.some((a) => a.toLowerCase() === needle)) return city;
  }
  return null;
}

export function resolveCityForState(state: string | null | undefined): CityMasterEntry {
  const key = (state && STATE_DEFAULT_CITY[state]) || DEFAULT_CITY_KEY;
  return byKey.get(key) ?? byKey.get(DEFAULT_CITY_KEY)!;
}
