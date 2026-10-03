import { getSupabaseServerClient } from "../supabaseClient";
import { isValidPincode } from "../validation";
import { getCity, matchCityByDistrict, resolveCityForState, type CityMasterEntry } from "./cityMaster";

export interface ResolvedPincodeCity {
  pincode: string;
  city: CityMasterEntry;
  district: string | null;
  state: string | null;
  /** true = the pincode's own district is one of our 25 cities; false = the
   * nearest priced city in that state (or New Delhi when the state is unknown). */
  matched_exactly: boolean;
  cached: boolean;
}

/**
 * Resolves a 6-digit Indian pincode to one of the 25 cities cityMaster.ts
 * knows real on-road pricing for. Uses api.postalpincode.in (the free,
 * India-Post-backed public lookup -- no key, no account); results are cached
 * in Supabase's pincode_city_cache so the same pincode never hits that
 * external API twice. Returns null only for an invalid pincode.
 * Shared by /api/city-lookup (quote check) and the recommender's city prices.
 */
export async function resolvePincodeCity(rawPincode: string | null | undefined): Promise<ResolvedPincodeCity | null> {
  const pincode = (rawPincode ?? "").trim();
  if (!isValidPincode(pincode)) return null;

  const supabase = getSupabaseServerClient();

  const { data: cached, error: cacheErr } = await supabase
    .from("pincode_city_cache")
    .select("city_key, district, state, matched_exactly")
    .eq("pincode", pincode)
    .maybeSingle();
  if (cacheErr) throw cacheErr;
  if (cached) {
    const city = getCity(cached.city_key) ?? resolveCityForState(cached.state);
    return {
      pincode,
      city,
      district: cached.district,
      state: cached.state,
      matched_exactly: cached.matched_exactly,
      cached: true,
    };
  }

  let district: string | null = null;
  let state: string | null = null;
  try {
    const resp = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      headers: { Accept: "application/json" },
      // A plain reference lookup (pincode -> district/state): only the
      // pincode is sent, nothing else about the person.
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (resp.ok) {
      const json = await resp.json();
      const postOffice = json?.[0]?.PostOffice?.[0];
      district = postOffice?.District ?? null;
      state = postOffice?.State ?? null;
    }
  } catch {
    // Falls through to the state-default / national-default resolution below.
  }

  const matched = matchCityByDistrict(district);
  const city = matched ?? resolveCityForState(state);

  // Only cache a real answer: a failed/timed-out lookup (no state) would
  // otherwise pin this pincode to New Delhi forever.
  if (state) {
    const { error: insertErr } = await supabase.from("pincode_city_cache").upsert(
      {
        pincode,
        city_key: city.city_key,
        district,
        state,
        matched_exactly: matched !== null,
        resolved_at: new Date().toISOString(),
      },
      { onConflict: "pincode" },
    );
    if (insertErr) console.error("pincode_city_cache upsert failed", insertErr.message);
  }

  return { pincode, city, district, state, matched_exactly: matched !== null, cached: false };
}
