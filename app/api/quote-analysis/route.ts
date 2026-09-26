import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";
import { isValidPhoneNumber } from "../../../lib/validation";
import { isAcceptedNoticeVersion } from "../../../lib/consent";
import { getCity } from "../../../lib/pricing/cityMaster";
import { estimateOnRoadPrice } from "../../../lib/pricing/rtoFallback";
import { analyzeQuote } from "../../../lib/quote/analyze";
import { categorize } from "../../../lib/quote/categorize";
import { CATEGORY_LABELS, type QuoteBenchmark, type QuoteCategory, type QuoteItem } from "../../../lib/quote/types";
import {
  fetchCarById,
  fetchVariantsForCar,
  fetchScrapedCityPrice,
  toRelativeVariantUrl,
} from "../../../lib/data/fetchQuotationData";

const MAX_ITEMS = 40;
const MAX_AMOUNT = 50_000_000;

interface QuoteAnalysisRequestBody {
  car_id: string;
  variant_id: string;
  city_key: string;
  items: { label: string; amount: number; category?: string }[];
  declared_total?: number | null;
  name: string;
  phone_number: string;
  pincode?: string;
  consent_notice_version?: string;
}

function cleanItems(raw: unknown): QuoteItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ITEMS) return null;
  const items: QuoteItem[] = [];
  for (const r of raw) {
    const label = typeof r?.label === "string" ? r.label.trim().slice(0, 120) : "";
    const amount = Number(r?.amount);
    if (!label || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > MAX_AMOUNT) return null;
    const wanted = typeof r?.category === "string" ? r.category : "";
    const category: QuoteCategory = wanted in CATEGORY_LABELS ? (wanted as QuoteCategory) : categorize(label, amount);
    // A discount is always stored negative, a charge always positive, whatever the client sent.
    const signed = category === "discount" ? -Math.abs(Math.round(amount)) : Math.abs(Math.round(amount));
    items.push({ label, amount: signed, category });
  }
  return items;
}

/**
 * POST /api/quote-analysis -- the dealer-quote check. The person enters the
 * line items of a quote a dealer gave them; we compare it with our own price
 * data and say where they can save. Fully deterministic (lib/quote/*): the
 * quote is never sent to an AI model or any third party. Saves the analysis,
 * plus the person's contact details and consent, the same way /api/recommend
 * does so the quote check feeds the same respondent record.
 */
export async function POST(req: NextRequest) {
  let body: QuoteAnalysisRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { car_id, variant_id, city_key, name, phone_number, pincode, consent_notice_version } = body ?? ({} as QuoteAnalysisRequestBody);
  if (!car_id || !variant_id || !city_key) {
    return NextResponse.json({ error: "car_id, variant_id and city_key are required" }, { status: 400 });
  }
  const items = cleanItems(body.items);
  if (!items) {
    return NextResponse.json({ error: `Add between 1 and ${MAX_ITEMS} quote lines, each with a label and an amount` }, { status: 400 });
  }
  const declaredRaw = body.declared_total;
  const declared_total =
    declaredRaw != null && Number.isFinite(Number(declaredRaw)) && Number(declaredRaw) > 0 && Number(declaredRaw) <= MAX_AMOUNT
      ? Math.round(Number(declaredRaw))
      : null;
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

  let car, variants;
  try {
    [car, variants] = await Promise.all([fetchCarById(car_id), fetchVariantsForCar(car_id)]);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load car data", detail: err.message }, { status: 500 });
  }
  const target = variants.find((v) => v.variant_id === variant_id);
  if (!car || !target) {
    return NextResponse.json({ error: "Car or variant not found" }, { status: 404 });
  }

  let scraped;
  try {
    scraped = await fetchScrapedCityPrice(car_id, city_key, toRelativeVariantUrl(target.url));
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load city pricing", detail: err.message }, { status: 500 });
  }

  let benchmark: QuoteBenchmark | null = null;
  if (scraped && scraped.on_road_price != null) {
    benchmark = {
      ex_showroom_price: scraped.ex_showroom_price ?? target.ex_showroom_price,
      rto: scraped.rto,
      insurance: scraped.insurance,
      on_road_price: scraped.on_road_price,
      source: "scraped",
      city_name: city.display_name,
    };
  } else if (target.ex_showroom_price != null) {
    const est = estimateOnRoadPrice(target.ex_showroom_price, city_key);
    benchmark = {
      ex_showroom_price: target.ex_showroom_price,
      rto: est.rto,
      insurance: est.insurance,
      on_road_price: est.on_road_price,
      source: "estimated",
      city_name: city.display_name,
    };
  }

  const analysis = analyzeQuote({
    items,
    declared_total,
    benchmark,
    brand: car.brand,
    variantLabel: `${car.model} ${target.variant_id}`,
  });

  const supabase = getSupabaseServerClient();

  const { data: respondent, error: respondentErr } = await supabase
    .from("respondents")
    .upsert(
      { phone_number, name: name.trim(), pincode: pincode ?? null, last_seen_at: new Date().toISOString() },
      { onConflict: "phone_number" },
    )
    .select("id")
    .single();
  if (respondentErr) {
    return NextResponse.json({ error: "Failed to save respondent" }, { status: 500 });
  }

  const { error: consentErr } = await supabase
    .from("consent_records")
    .upsert(
      { respondent_id: respondent.id, notice_version: consent_notice_version, source: "quote_analysis" },
      { onConflict: "respondent_id,notice_version,source", ignoreDuplicates: true },
    );
  if (consentErr) {
    return NextResponse.json({ error: "Failed to record consent" }, { status: 500 });
  }

  const { error: saveErr } = await supabase.from("quote_analyses").insert({
    respondent_id: respondent.id,
    car_id,
    variant_id,
    city_key,
    pincode: pincode ?? null,
    items,
    declared_total,
    quoted_total: analysis.quoted_total,
    savings_challenge: analysis.savings.challenge,
    savings_optional: analysis.savings.optional,
    benchmark_source: benchmark?.source ?? null,
    findings: analysis.findings.map((f) => ({ id: f.id, severity: f.severity, amount: f.amount })),
  });
  if (saveErr) {
    return NextResponse.json({ error: "Failed to save the analysis" }, { status: 500 });
  }

  return NextResponse.json({
    car: { car_id, brand: car.brand, model: car.model, variant_id },
    city: { city_key: city.city_key, display_name: city.display_name },
    analysis,
  });
}
