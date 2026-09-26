import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";
import { isValidPincode } from "../../../lib/validation";
import { matchCityByDistrict, resolveCityForState, getCity } from "../../../lib/pricing/cityMaster";

/**
 * GET /api/city-lookup?pincode=110001
 *
 * Resolves a 6-digit Indian pincode to one of the 25 cities cityMaster.ts
 * knows real on-road pricing for. Uses api.postalpincode.in (the free,
 * India-Post-backed public lookup -- no key, no account) rather than
 * shipping and maintaining our own ~19k-row pincode dataset; results are
 * cached in Supabase's pincode_city_cache so the same pincode never hits
 * that external API twice.
 */
export async function GET(req: NextRequest) {
  const pincode = req.nextUrl.searchParams.get("pincode")?.trim() ?? "";
  if (!isValidPincode(pincode)) {
    return NextResponse.json({ error: "Pincode must be exactly 6 digits" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: cached, error: cacheErr } = await supabase
    .from("pincode_city_cache")
    .select("city_key, district, state, matched_exactly")
    .eq("pincode", pincode)
    .maybeSingle();
  if (cacheErr) {
    return NextResponse.json({ error: "Lookup failed", detail: cacheErr.message }, { status: 500 });
  }
  if (cached) {
    const city = getCity(cached.city_key);
    return NextResponse.json({
      pincode,
      city_key: cached.city_key,
      display_name: city?.display_name ?? cached.city_key,
      district: cached.district,
      state: cached.state,
      matched_exactly: cached.matched_exactly,
      cached: true,
    });
  }

  let district: string | null = null;
  let state: string | null = null;
  try {
    const resp = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      headers: { Accept: "application/json" },
      // This is a plain reference lookup (pincode -> district/state), not
      // user data leaving the app -- see the "Privacy" rule about not
      // sending user data to third parties; a pincode alone isn't personal
      // data and nothing else about the person is sent.
      cache: "no-store",
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
  const resolved = matched ?? resolveCityForState(state);
  const matchedExactly = matched !== null;

  const { error: insertErr } = await supabase.from("pincode_city_cache").upsert(
    {
      pincode,
      city_key: resolved.city_key,
      district,
      state,
      matched_exactly: matchedExactly,
      resolved_at: new Date().toISOString(),
    },
    { onConflict: "pincode" },
  );
  if (insertErr) {
    // Cache-write failure shouldn't block returning a real answer.
    console.error("pincode_city_cache upsert failed", insertErr.message);
  }

  return NextResponse.json({
    pincode,
    city_key: resolved.city_key,
    display_name: resolved.display_name,
    district,
    state,
    matched_exactly: matchedExactly,
    cached: false,
  });
}
