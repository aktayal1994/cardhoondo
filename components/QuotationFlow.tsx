"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Lightbulb, MapPin, Search } from "lucide-react";
import { isValidPhoneNumber, isValidPincode } from "../lib/validation";
import { CITIES, type CityMasterEntry } from "../lib/pricing/cityMaster";
import { formatINR } from "../lib/format";
import { CURRENT_NOTICE_VERSION } from "../lib/consent";
import ConsentNotice from "./ConsentNotice";

interface CarModelOption {
  car_id: string;
  brand: string;
  model: string;
}

interface QuotationVariant {
  car_id: string;
  variant_id: string;
  url: string | null;
  ex_showroom_price: number | null;
  on_road_price: number | null;
  fuel_type: string | null;
}

interface AdviceTip {
  id: string;
  title: string;
  body: string;
}

interface QuotationResult {
  car_id: string;
  variant_id: string;
  city: { city_key: string; display_name: string; state: string };
  price: {
    ex_showroom_price: number;
    rto: number | null;
    insurance: number | null;
    other_charges: number | null;
    optional_accessories: number | null;
    on_road_price: number;
    source: "scraped" | "estimated";
  };
  advice: AdviceTip[];
}

export default function QuotationFlow({ initialCarId, initialVariantId }: { initialCarId?: string; initialVariantId?: string }) {
  const [cars, setCars] = useState<CarModelOption[]>([]);
  const [carId, setCarId] = useState(initialCarId ?? "");
  const [variants, setVariants] = useState<QuotationVariant[]>([]);
  const [variantId, setVariantId] = useState(initialVariantId ?? "");
  const [cityKey, setCityKey] = useState("");
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "looking_up" | "done" | "error">("idle");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<QuotationResult | null>(null);

  useEffect(() => {
    fetch("/api/quotation")
      .then((r) => r.json())
      .then((d) => setCars(d.cars ?? []));
  }, []);

  useEffect(() => {
    if (!carId) {
      setVariants([]);
      return;
    }
    fetch(`/api/quotation?car_id=${encodeURIComponent(carId)}`)
      .then((r) => r.json())
      .then((d) => setVariants(d.variants ?? []));
  }, [carId]);

  const groupedCars = useMemo(() => {
    const byBrand = new Map<string, CarModelOption[]>();
    for (const c of cars) {
      const list = byBrand.get(c.brand) ?? [];
      list.push(c);
      byBrand.set(c.brand, list);
    }
    return [...byBrand.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [cars]);

  const sortedVariants = useMemo(
    () => [...variants].sort((a, b) => (a.ex_showroom_price ?? 0) - (b.ex_showroom_price ?? 0)),
    [variants],
  );

  async function lookupPincode(value: string) {
    setPincode(value);
    if (!isValidPincode(value)) {
      setPincodeStatus("idle");
      return;
    }
    setPincodeStatus("looking_up");
    try {
      const resp = await fetch(`/api/city-lookup?pincode=${value}`);
      const data = await resp.json();
      if (resp.ok && data.city_key) {
        setCityKey(data.city_key);
        setPincodeStatus("done");
      } else {
        setPincodeStatus("error");
      }
    } catch {
      setPincodeStatus("error");
    }
  }

  const nameError = touched && name.trim().length === 0;
  const phoneError = touched && !isValidPhoneNumber(phone);
  const canSubmit = !!carId && !!variantId && !!cityKey && name.trim().length > 0 && isValidPhoneNumber(phone);

  async function handleSubmit() {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const resp = await fetch("/api/quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ car_id: carId, variant_id: variantId, city_key: cityKey, name: name.trim(), phone_number: phone, pincode: pincode || undefined, consent_notice_version: CURRENT_NOTICE_VERSION }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult(data as QuotationResult);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <QuotationResultView result={result} onStartOver={() => { setResult(null); setSubmitError(null); }} />;
  }

  const selectedCar = cars.find((c) => c.car_id === carId);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">On-road price check</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">What will this car actually cost you?</h1>
      <p className="mt-2 text-ink-soft">
        Pick a model, variant and city — real registration, insurance and on-road pricing where we have it, a clearly
        labeled estimate where we don't. Plus real ways to bring the number down before you sign anything.
      </p>

      <div className="mt-8 space-y-5">
        <Field label="Car">
          <select
            value={carId}
            onChange={(e) => { setCarId(e.target.value); setVariantId(""); }}
            className="w-full rounded-xl border border-border bg-paper-raised px-4 py-3 text-sm text-ink focus:border-accent-rust/70 focus:outline-none"
          >
            <option value="">Select a car</option>
            {groupedCars.map(([brand, models]) => (
              <optgroup key={brand} label={brand}>
                {models.map((c) => (
                  <option key={c.car_id} value={c.car_id}>{c.model}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        {carId && (
          <Field label="Variant">
            <select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              className="w-full rounded-xl border border-border bg-paper-raised px-4 py-3 text-sm text-ink focus:border-accent-rust/70 focus:outline-none"
            >
              <option value="">Select a variant</option>
              {sortedVariants.map((v) => (
                <option key={v.variant_id} value={v.variant_id}>
                  {v.variant_id} {v.fuel_type ? `(${v.fuel_type})` : ""} — {v.ex_showroom_price ? formatINR(v.ex_showroom_price) : "price n/a"}
                </option>
              ))}
            </select>
            {selectedCar && <p className="mt-1.5 text-xs text-ink-faint">{sortedVariants.length} variants of the {selectedCar.model}, cheapest first.</p>}
          </Field>
        )}

        {variantId && (
          <Field label="City">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-paper-raised px-4 py-3 focus-within:border-accent-rust/70">
              <MapPin className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={(e) => lookupPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter your pincode"
                className="w-28 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              />
              <span className="text-ink-faint">or</span>
              <select
                value={cityKey}
                onChange={(e) => { setCityKey(e.target.value); setPincode(""); setPincodeStatus("idle"); }}
                className="flex-1 bg-transparent text-sm text-ink focus:outline-none"
              >
                <option value="">choose a city</option>
                {CITIES.map((c: CityMasterEntry) => (
                  <option key={c.city_key} value={c.city_key}>{c.display_name}</option>
                ))}
              </select>
            </div>
            {pincodeStatus === "looking_up" && <p className="mt-1.5 text-xs text-ink-faint">Looking up your pincode…</p>}
            {pincodeStatus === "done" && cityKey && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-positive">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Matched to {CITIES.find((c) => c.city_key === cityKey)?.display_name}
              </p>
            )}
            {pincodeStatus === "error" && <p className="mt-1.5 text-xs text-negative">Couldn't look up that pincode — choose a city instead.</p>}
          </Field>
        )}

        {cityKey && (
          <>
            <Field label="Your name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                aria-invalid={nameError}
                className={`w-full rounded-xl border bg-paper-raised px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${nameError ? "border-negative" : "border-border focus:border-accent-rust/70"}`}
              />
              {nameError && <p className="mt-1.5 text-sm text-negative">Enter your name.</p>}
            </Field>

            <Field label="Phone number">
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                aria-invalid={phoneError}
                className={`w-full rounded-xl border bg-paper-raised px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${phoneError ? "border-negative" : "border-border focus:border-accent-rust/70"}`}
              />
              {phoneError && <p className="mt-1.5 text-sm text-negative">Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.</p>}
              <p className="mt-1.5 text-xs text-ink-faint">Name and phone are used to get in touch about your recommendations, and to ask for your feedback so we can improve CarDhoondo.</p>
            </Field>
          </>
        )}

        {cityKey && <ConsentNotice />}

        {submitError && <p className="text-sm text-negative">{submitError}</p>}

        {cityKey && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-full bg-accent-rust px-8 py-3.5 text-base font-semibold text-stage shadow-glow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Checking…" : "Agree and check on-road price"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}

function PriceRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 text-sm">
      <span className={muted ? "text-ink-faint" : "text-ink-soft"}>{label}</span>
      <span className={`font-mono ${muted ? "text-ink-faint" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function QuotationResultView({ result, onStartOver }: { result: QuotationResult; onStartOver: () => void }) {
  const { price, city, advice } = result;
  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">Your on-road price</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">{result.variant_id} in {city.display_name}</h1>

      <div className="mt-6 rounded-[20px] border border-border bg-paper-raised p-5 shadow-card sm:p-6">
        <div className="flex items-center justify-between">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              price.source === "scraped" ? "bg-positive-bg text-positive" : "bg-charcoal-800/60 text-ink-soft"
            }`}
          >
            {price.source === "scraped" ? `Real pricing for ${city.display_name}` : `Estimated for ${city.display_name}`}
          </span>
        </div>

        <p className="mt-4 font-mono text-3xl font-semibold text-ink">{formatINR(price.on_road_price)}</p>
        <p className="text-xs text-ink-faint">on-road price</p>

        <div className="mt-4 divide-y divide-border border-t border-border">
          <PriceRow label="Ex-showroom price" value={formatINR(price.ex_showroom_price)} />
          {price.rto != null && <PriceRow label="RTO & registration" value={formatINR(price.rto)} />}
          {price.insurance != null && <PriceRow label="Insurance" value={formatINR(price.insurance)} />}
          {price.other_charges != null && price.other_charges > 0 && <PriceRow label="Other charges" value={formatINR(price.other_charges)} />}
          {price.optional_accessories != null && price.optional_accessories > 0 && (
            <PriceRow label="Optional accessories (not required)" value={formatINR(price.optional_accessories)} muted />
          )}
        </div>

        {price.source === "estimated" && (
          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            We don't have a real {city.display_name} price for this exact variant yet, so this is an estimate based on
            typical RTO and insurance rates for {city.state}. Your dealer's actual on-road quote may differ.
          </p>
        )}
      </div>

      {advice.length > 0 && (
        <div className="mt-6">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">
            <Lightbulb className="h-4 w-4 text-accent-rust-soft" strokeWidth={1.75} /> How to bring this number down
          </p>
          <div className="mt-3 space-y-3">
            {advice.map((tip) => (
              <div key={tip.id} className="rounded-xl border border-border bg-paper-raised p-4">
                <p className="text-sm font-medium text-ink">{tip.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onStartOver}
        className="mt-8 flex items-center gap-2 text-sm font-medium text-ink-soft underline decoration-dotted underline-offset-4 hover:text-ink"
      >
        <Search className="h-3.5 w-3.5" strokeWidth={1.75} /> Check a different car or city
      </button>
    </div>
  );
}
