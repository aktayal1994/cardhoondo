import { NextRequest, NextResponse } from "next/server";
import { isValidPincode } from "../../../lib/validation";
import { resolvePincodeCity } from "../../../lib/pricing/resolvePincode";

/**
 * GET /api/city-lookup?pincode=110001
 *
 * Resolves a 6-digit Indian pincode to one of the 25 cities cityMaster.ts
 * knows real on-road pricing for. The lookup itself (India Post API +
 * pincode_city_cache) lives in lib/pricing/resolvePincode.ts, shared with
 * the recommender's city prices.
 */
export async function GET(req: NextRequest) {
  const pincode = req.nextUrl.searchParams.get("pincode")?.trim() ?? "";
  if (!isValidPincode(pincode)) {
    return NextResponse.json({ error: "Pincode must be exactly 6 digits" }, { status: 400 });
  }

  try {
    const r = await resolvePincodeCity(pincode);
    if (!r) return NextResponse.json({ error: "Pincode must be exactly 6 digits" }, { status: 400 });
    return NextResponse.json({
      pincode,
      city_key: r.city.city_key,
      display_name: r.city.display_name,
      district: r.district,
      state: r.state,
      matched_exactly: r.matched_exactly,
      cached: r.cached,
    });
  } catch (err) {
    return NextResponse.json({ error: "Lookup failed", detail: (err as Error).message }, { status: 500 });
  }
}
