import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";
import { isValidPhoneNumber } from "../../../lib/validation";
import { isAcceptedNoticeVersion } from "../../../lib/consent";
import { getCity } from "../../../lib/pricing/cityMaster";
import { estimateOnRoadPrice } from "../../../lib/pricing/rtoFallback";
import { buildAdvice } from "../../../lib/pricing/advice";
import {
  fetchCarModels,
  fetchVariantsForCar,
  fetchScrapedCityPrice,
  toRelativeVariantUrl,
} from "../../../lib/data/fetchQuotationData";

/**
 * GET /api/quotation             -> { cars: [...] }              (model picker)
 * GET /api/quotation?car_id=X    -> { variants: [...] }           (variant picker)
 *
 * POST /api/quotation -> the actual "what will this cost me in my city"
 * computation: real scraped city pricing when it exists (see
 * scripts/city_price_scraper.py), a labeled estimate otherwise, plus a set
 * of rule-based tips on where the number is negotiable. Also saves a lead
 * (respondents + quotation_leads), same upsert-by-phone_number pattern as
 * /api/recommend, so this entry point feeds the same pincode-wise
 * respondent dataset rather than a separate one.
 */
export async function GET(req: NextRequest) {
  const carId = req.nextUrl.searchParams.get("car_id");
  try {
    if (carId) {
      const variants = await fetchVariantsForCar(carId);
      return NextResponse.json({ variants });
    }
    const cars = await fetchCarModels();
    return NextResponse.json({ cars });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load quotation options", detail: err.message }, { status: 500 });
  }
}

interface QuotationRequestBody {
  car_id: string;
  variant_id: string;
  city_key: string;
  name: string;
  phone_number: string;
  pincode?: string;
  /** Version of the consent notice the person agreed to (lib/consent.ts). */
  consent_notice_version?: string;
}

export async function POST(req: NextRequest) {
  let body: QuotationRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { car_id, variant_id, city_key, name, phone_number, pincode, consent_notice_version } = body ?? ({} as QuotationRequestBody);
  if (!car_id || !variant_id || !city_key) {
    return NextResponse.json({ error: "car_id, variant_id and city_key are required" }, { status: 400 });
  }
  if (!phone_number || !isValidPhoneNumber(phone_number)) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }
  if (!isAcceptedNoticeVersion(consent_notice_version)) {
    return NextResponse.json({ error: "Consent required" }, { status: 400 });
  }
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const city = getCity(city_key);
  if (!city) {
    return NextResponse.json({ error: "Unknown city" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  let variants;
  try {
    variants = await fetchVariantsForCar(car_id);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load variants", detail: err.message }, { status: 500 });
  }
  const target = variants.find((v) => v.variant_id === variant_id);
  if (!target) {
    return NextResponse.json({ error: "Variant not found for this car" }, { status: 404 });
  }
  if (target.ex_showroom_price == null) {
    return NextResponse.json({ error: "No price data available for this variant yet" }, { status: 422 });
  }

  const variantUrlRel = toRelativeVariantUrl(target.url);
  let scraped;
  try {
    scraped = await fetchScrapedCityPrice(car_id, city_key, variantUrlRel);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load city pricing", detail: err.message }, { status: 500 });
  }

  const price =
    scraped && scraped.on_road_price != null
      ? {
          ex_showroom_price: scraped.ex_showroom_price ?? target.ex_showroom_price,
          rto: scraped.rto,
          insurance: scraped.insurance,
          other_charges: scraped.other_charges,
          optional_accessories: scraped.optional_accessories,
          on_road_price: scraped.on_road_price,
          source: "scraped" as const,
          scraped_at: scraped.scraped_at,
        }
      : { ...estimateOnRoadPrice(target.ex_showroom_price, city_key), other_charges: null, optional_accessories: null, scraped_at: null };

  const advice = buildAdvice({
    targetVariant: target,
    siblingVariants: variants,
    optionalAccessoriesAmount: price.optional_accessories,
  });

  // Same upsert-by-phone_number identity pattern as /api/recommend, so a
  // quotation check and a questionnaire submission from the same person
  // link to one respondent row rather than splitting them.
  const { data: respondent, error: respondentErr } = await supabase
    .from("respondents")
    .upsert(
      { phone_number, name: name.trim(), pincode: pincode ?? null, last_seen_at: new Date().toISOString() },
      { onConflict: "phone_number" },
    )
    .select("id")
    .single();
  if (respondentErr) {
    return NextResponse.json({ error: "Failed to save respondent", detail: respondentErr.message }, { status: 500 });
  }

  const { error: consentErr } = await supabase
    .from("consent_records")
    .upsert(
      { respondent_id: respondent.id, notice_version: consent_notice_version, source: "quotation" },
      { onConflict: "respondent_id,notice_version,source", ignoreDuplicates: true },
    );
  if (consentErr) {
    return NextResponse.json({ error: "Failed to record consent" }, { status: 500 });
  }

  const { error: leadErr } = await supabase.from("quotation_leads").insert({
    respondent_id: respondent.id,
    car_id,
    variant_id,
    city_key,
    pincode: pincode ?? null,
    on_road_price: price.on_road_price,
    price_source: price.source,
  });
  if (leadErr) {
    return NextResponse.json({ error: "Failed to save quotation lead", detail: leadErr.message }, { status: 500 });
  }

  return NextResponse.json({
    car_id,
    variant_id,
    city: { city_key: city.city_key, display_name: city.display_name, state: city.state },
    price,
    advice,
  });
}
