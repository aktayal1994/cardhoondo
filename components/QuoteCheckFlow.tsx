"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, ClipboardPaste, Copy, MapPin, Plus, Send, X } from "lucide-react";
import { isValidPhoneNumber, isValidPincode } from "../lib/validation";
import { CITIES, type CityMasterEntry } from "../lib/pricing/cityMaster";
import { formatINR } from "../lib/format";
import { CURRENT_NOTICE_VERSION } from "../lib/consent";
import { categorize } from "../lib/quote/categorize";
import { parseQuoteText } from "../lib/quote/parseQuoteText";
import { CATEGORY_LABELS, type Finding, type QuoteAnalysis, type QuoteCategory } from "../lib/quote/types";
import { trackEvent } from "../lib/analytics";
import ConsentNotice from "./ConsentNotice";

interface CarModelOption {
  car_id: string;
  brand: string;
  model: string;
}

interface QuotationVariant {
  car_id: string;
  variant_id: string;
  ex_showroom_price: number | null;
  fuel_type: string | null;
}

interface Row {
  id: number;
  label: string;
  amount: string; // digits only
  category: QuoteCategory;
  categoryTouched: boolean;
  isDiscount: boolean;
}

interface Result {
  car: { car_id: string; brand: string; model: string; variant_id: string };
  city: { city_key: string; display_name: string };
  analysis: QuoteAnalysis;
}

const inputClass =
  "w-full rounded-xl border border-border bg-paper-raised px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent-rust/70 focus:outline-none";

let rowSeq = 1;
const newRow = (over: Partial<Row> = {}): Row => ({
  id: rowSeq++,
  label: "",
  amount: "",
  category: "other",
  categoryTouched: false,
  isDiscount: false,
  ...over,
});

export default function QuoteCheckFlow({ initialCarId, initialVariantId }: { initialCarId?: string; initialVariantId?: string }) {
  const [cars, setCars] = useState<CarModelOption[]>([]);
  const [carId, setCarId] = useState(initialCarId ?? "");
  const [variants, setVariants] = useState<QuotationVariant[]>([]);
  const [variantId, setVariantId] = useState(initialVariantId ?? "");
  const [cityKey, setCityKey] = useState("");
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "looking_up" | "done" | "error">("idle");

  const [pasted, setPasted] = useState("");
  const [parseNote, setParseNote] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [declaredTotal, setDeclaredTotal] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

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
    for (const c of cars) byBrand.set(c.brand, [...(byBrand.get(c.brand) ?? []), c]);
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

  function readPastedQuote() {
    const parsed = parseQuoteText(pasted);
    if (parsed.items.length === 0) {
      setParseNote("We couldn't find any amounts in that text. Add the lines by hand below.");
      if (rows.length === 0) setRows([newRow()]);
      return;
    }
    setRows(
      parsed.items.map((i) =>
        newRow({ label: i.label, amount: String(Math.abs(i.amount)), category: i.category, isDiscount: i.amount < 0 }),
      ),
    );
    if (parsed.declared_total) setDeclaredTotal(String(parsed.declared_total));
    setParseNote(`We found ${parsed.items.length} lines. Check them below and fix anything we misread.`);
  }

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (!next.categoryTouched && ("label" in patch || "amount" in patch)) {
          const cat = categorize(next.label, Number(next.amount) || 1);
          next.category = cat;
          next.isDiscount = cat === "discount";
        }
        return next;
      }),
    );
  }

  const validRows = rows.filter((r) => r.label.trim() && Number(r.amount) > 0);
  const nameError = touched && name.trim().length === 0;
  const phoneError = touched && !isValidPhoneNumber(phone);
  const canSubmit =
    !!carId && !!variantId && !!cityKey && validRows.length > 0 && name.trim().length > 0 && isValidPhoneNumber(phone);

  async function handleSubmit() {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const resp = await fetch("/api/quote-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          car_id: carId,
          variant_id: variantId,
          city_key: cityKey,
          items: validRows.map((r) => ({
            label: r.label.trim(),
            amount: r.category === "discount" ? -Number(r.amount) : Number(r.amount),
            category: r.category,
          })),
          declared_total: declaredTotal ? Number(declaredTotal) : null,
          name: name.trim(),
          phone_number: phone,
          pincode: pincode || undefined,
          consent_notice_version: CURRENT_NOTICE_VERSION,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult(data as Result);
      trackEvent("quote_check_analyzed", { lines: validRows.length });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <ResultView result={result} onStartOver={() => { setResult(null); setSubmitError(null); }} />;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">Dealer quote check</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">Got a quote from a dealer? See where you can save.</h1>
      <p className="mt-2 text-ink-soft">
        Enter what the dealer quoted. We compare it with real prices for your city and flag the insurance, accessories,
        service add-ons and fees you can question, with the exact words to ask.
      </p>

      <Section n={1} title="Which car was quoted?">
        <div className="space-y-4">
          <select
            value={carId}
            onChange={(e) => { setCarId(e.target.value); setVariantId(""); }}
            className={inputClass}
            aria-label="Car"
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

          {carId && (
            <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className={inputClass} aria-label="Variant">
              <option value="">Select the variant</option>
              {sortedVariants.map((v) => (
                <option key={v.variant_id} value={v.variant_id}>
                  {v.variant_id} {v.fuel_type ? `(${v.fuel_type})` : ""}
                </option>
              ))}
            </select>
          )}

          {variantId && (
            <div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-paper-raised px-4 py-3 focus-within:border-accent-rust/70">
                <MapPin className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => lookupPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Your pincode"
                  aria-label="Pincode"
                  className="w-28 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <span className="text-ink-faint">or</span>
                <select
                  value={cityKey}
                  onChange={(e) => { setCityKey(e.target.value); setPincode(""); setPincodeStatus("idle"); }}
                  aria-label="City"
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink focus:outline-none"
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
              {pincodeStatus === "error" && <p className="mt-1.5 text-xs text-negative">Couldn't look up that pincode. Choose a city instead.</p>}
            </div>
          )}
        </div>
      </Section>

      {cityKey && (
        <Section n={2} title="What did the dealer quote?">
          <p className="text-sm text-ink-soft">
            Paste the text of the quote (from WhatsApp, email or the PDF), or type the lines in. Copy only the lines and
            amounts and leave out your name, phone number and address. We can&apos;t read photos or PDF files, and
            nothing you enter here is sent to any AI.
          </p>

          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={5}
            placeholder={"Ex-showroom price  17,42,000\nInsurance  78,400\nHandling charges  8,500\nAccessories kit  42,000"}
            className={`${inputClass} mt-3 font-mono text-[13px] leading-relaxed`}
            aria-label="Paste the quote text"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={readPastedQuote}
              disabled={!pasted.trim()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-paper-raised px-5 py-2.5 text-sm font-medium text-ink transition hover:border-accent-rust/50 disabled:opacity-50"
            >
              <ClipboardPaste className="h-4 w-4" strokeWidth={1.75} /> Read my quote
            </button>
            {parseNote && <p className="text-xs text-ink-soft">{parseNote}</p>}
          </div>

          <div className="mt-5 space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-paper-raised p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={r.label}
                    onChange={(e) => updateRow(r.id, { label: e.target.value })}
                    placeholder="What is this charge?"
                    aria-label="Charge name"
                    className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:bg-charcoal-800/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                    aria-label="Remove this line"
                    className="rounded-full p-1.5 text-ink-faint transition hover:bg-charcoal-800 hover:text-ink"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-border px-2.5 py-1.5">
                    <span className="text-sm text-ink-faint">{r.category === "discount" ? "− ₹" : "₹"}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={r.amount ? Number(r.amount).toLocaleString("en-IN") : ""}
                      onChange={(e) => updateRow(r.id, { amount: e.target.value.replace(/\D/g, "").slice(0, 9) })}
                      placeholder="Amount"
                      aria-label="Amount in rupees"
                      className="ml-1 w-28 bg-transparent font-mono text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                    />
                  </div>
                  <select
                    value={r.category}
                    onChange={(e) => updateRow(r.id, { category: e.target.value as QuoteCategory, categoryTouched: true })}
                    aria-label="What kind of charge is this?"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-transparent px-2 py-1.5 text-xs text-ink-soft focus:outline-none"
                  >
                    {(Object.keys(CATEGORY_LABELS) as QuoteCategory[]).map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, newRow()])}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-rust-soft underline decoration-dotted underline-offset-4 hover:text-accent-rust"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} /> Add a line
          </button>

          {rows.length > 0 && (
            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-ink">Total on the quote (optional)</label>
              <input
                type="text"
                inputMode="numeric"
                value={declaredTotal ? Number(declaredTotal).toLocaleString("en-IN") : ""}
                onChange={(e) => setDeclaredTotal(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="The final amount the dealer wants"
                className={`${inputClass} font-mono`}
              />
              <p className="mt-1.5 text-xs text-ink-faint">If the total doesn&apos;t match the lines, we&apos;ll tell you.</p>
            </div>
          )}
        </Section>
      )}

      {validRows.length > 0 && (
        <Section n={3} title="Where should we show it?">
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                aria-label="Your name"
                aria-invalid={nameError}
                className={`${inputClass} ${nameError ? "border-negative" : ""}`}
              />
              {nameError && <p className="mt-1.5 text-sm text-negative">Enter your name.</p>}
            </div>
            <div>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                aria-label="Phone number"
                aria-invalid={phoneError}
                className={`${inputClass} ${phoneError ? "border-negative" : ""}`}
              />
              {phoneError && <p className="mt-1.5 text-sm text-negative">Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.</p>}
            </div>
            <ConsentNotice />
            {submitError && <p className="text-sm text-negative">{submitError}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-full bg-accent-rust px-8 py-3.5 text-base font-semibold text-stage shadow-glow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Checking your quote…" : "Agree and check my quote"}
            </button>
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="flex items-center gap-3 font-display text-lg font-semibold text-ink">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-charcoal-800/70 font-mono text-xs text-accent-rust-soft">{n}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      // clipboard blocked: nothing useful to do, the text is on screen to select
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-accent-rust/50 hover:text-ink"
    >
      {done ? <Check className="h-3 w-3" strokeWidth={2} /> : <Copy className="h-3 w-3" strokeWidth={1.75} />}
      {done ? "Copied" : label}
    </button>
  );
}

const SEVERITY_DOT: Record<Finding["severity"], string> = {
  challenge: "bg-negative",
  optional: "bg-accent-rust",
  info: "bg-neutral-verdict",
  good: "bg-positive",
};

function FindingCard({ f }: { f: Finding }) {
  return (
    <div className="rounded-[16px] border border-border bg-paper-raised p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[f.severity]}`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{f.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.detail}</p>

          {f.items && f.items.length > 0 && (
            <ul className="mt-2.5 space-y-1 border-l border-border pl-3">
              {f.items.map((i, idx) => (
                <li key={idx} className="flex items-baseline justify-between gap-3 text-xs text-ink-faint">
                  <span className="min-w-0 truncate">{i.label}</span>
                  <span className="font-mono">{formatINR(Math.abs(i.amount))}</span>
                </li>
              ))}
            </ul>
          )}

          {f.ask && (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-charcoal-800/60 px-3 py-2.5">
              <p className="text-sm text-ink">
                <span className="mr-1.5 text-xs font-semibold uppercase tracking-wide text-accent-rust-soft">Ask</span>
                {f.ask}
              </p>
              <CopyButton text={f.ask} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FindingGroup({ title, hint, findings }: { title: string; hint: string; findings: Finding[] }) {
  if (findings.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-0.5 text-sm text-ink-faint">{hint}</p>
      <div className="mt-3 space-y-3">
        {findings.map((f) => (
          <FindingCard key={f.id} f={f} />
        ))}
      </div>
    </section>
  );
}

function ResultView({ result, onStartOver }: { result: Result; onStartOver: () => void }) {
  const { analysis, car, city } = result;
  const { findings, savings, benchmark } = analysis;
  const of = (s: Finding["severity"]) => findings.filter((f) => f.severity === s);

  const total = analysis.declared_total ?? analysis.quoted_total;
  const vsTypical = benchmark?.on_road_price ? total - benchmark.on_road_price : null;

  const askList = findings.filter((f) => f.ask && f.severity !== "good");
  const message =
    `Hi, I'm looking at the ${car.brand} ${car.model} ${car.variant_id}. Before I decide, could you help with these points on your quote?\n\n` +
    askList.map((f, i) => `${i + 1}. ${f.ask}`).join("\n") +
    `\n\nThank you.`;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">Your quote check</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
        {car.brand} {car.model} {car.variant_id}
      </h1>
      <p className="text-sm text-ink-faint">Quote checked against prices in {city.display_name}</p>

      <div className="mt-6 rounded-[20px] border border-border bg-paper-raised p-5 shadow-card sm:p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-mono text-2xl font-semibold text-ink sm:text-3xl">{formatINR(savings.challenge)}</p>
            <p className="mt-1 text-xs leading-snug text-ink-soft">worth challenging: overpaid or dealer-set charges</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold text-accent-rust-soft sm:text-3xl">{formatINR(savings.optional)}</p>
            <p className="mt-1 text-xs leading-snug text-ink-soft">optional extras: your call whether to keep them</p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-ink-soft">Your quote total</span>
            <span className="font-mono text-ink">{formatINR(total)}</span>
          </div>
          {benchmark?.on_road_price != null && (
            <div className="flex justify-between gap-4">
              <span className="text-ink-soft">
                {benchmark.source === "scraped" ? "Typical on-road price" : "Estimated on-road price"} in {city.display_name}
              </span>
              <span className="font-mono text-ink">{formatINR(benchmark.on_road_price)}</span>
            </div>
          )}
          {vsTypical != null && (
            <p className="pt-1 text-xs text-ink-faint">
              {vsTypical > 0
                ? `Your quote is ${formatINR(vsTypical)} above that.`
                : `Your quote is ${formatINR(Math.abs(vsTypical))} below that.`}{" "}
              The typical price has no accessories, add-ons or dealer charges.
            </p>
          )}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          These are places to ask, not accusations. Some extras are worth having, and you decide which. We can&apos;t promise
          what a dealer will agree to.
          {benchmark?.source === "estimated" &&
            ` We don't have a real ${city.display_name} price for this exact variant yet, so our price checks are rough and we only flag large gaps.`}
        </p>
      </div>

      <FindingGroup title="Worth challenging" hint="Where the quote is above typical, or charges the dealer sets." findings={of("challenge")} />
      <FindingGroup title="Your call" hint="Optional extras. You can skip them or buy them later." findings={of("optional")} />
      <FindingGroup title="Good to know" hint="Worth understanding before you sign." findings={of("info")} />
      <FindingGroup title="Looks fine" hint="Nothing to push back on here." findings={of("good")} />

      {askList.length > 0 && (
        <section className="mt-8 rounded-[20px] border border-border bg-charcoal-800/40 p-5">
          <h2 className="font-display text-lg font-semibold text-ink">Send this to your dealer</h2>
          <p className="mt-1 text-sm text-ink-soft">All the questions above in one message. It has none of your details.</p>
          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-paper-raised p-3 text-xs leading-relaxed text-ink-soft">{message}</pre>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <CopyButton text={message} label="Copy message" />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-rust px-4 py-2 text-xs font-semibold text-stage transition hover:brightness-110"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={2} /> Share on WhatsApp
            </a>
          </div>
        </section>
      )}

      <p className="mt-8 text-xs leading-relaxed text-ink-faint">
        Based only on the lines you entered and our price data. It is information, not a quotation, an offer or professional
        advice. Confirm every figure with the dealer before you pay.
      </p>

      <button
        onClick={onStartOver}
        className="mt-6 text-sm font-medium text-ink-soft underline decoration-dotted underline-offset-4 hover:text-ink"
      >
        Check another quote
      </button>
    </div>
  );
}
