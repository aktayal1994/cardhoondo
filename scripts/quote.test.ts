/**
 * Plain assert-based test for lib/quote/* (parser, categoriser, analyser),
 * using dealer-quote text shaped like what people actually paste.
 * Run:  npx --yes tsx scripts/quote.test.ts   (from web/)
 */
import assert from "node:assert/strict";
import { parseQuoteText } from "../lib/quote/parseQuoteText";
import { analyzeQuote } from "../lib/quote/analyze";
import type { QuoteBenchmark } from "../lib/quote/types";

// 1. A typical WhatsApp-style quote with tabs, "Rs." and "/-" variations.
const whatsapp = `
Quotation No: 4471
Date: 26/09/2026
Customer: Rahul Sharma  Mobile 9812345670
Hyundai Creta SX(O) 1.5 Petrol IVT
Ex-showroom price: Rs. 17,42,000
Road Tax & Registration   2,45,880/-
Comprehensive Insurance (Zero Dep + RTI)   ₹ 78,400
TCS 1%  17,420
Handling charges 8,500
Logistics & Documentation - 6,000
Accessories Kit (mandatory)   42,000
Teflon Coating + Anti rust  12,500
Extended Warranty 4th & 5th year  19,999
Maruti... AMC 3 years   14,500
FASTag 700
Exchange Bonus (25,000)
Corporate Discount 10,000
Total on-road price: 22,61,679
`;

const parsed = parseQuoteText(whatsapp);
const byLabel = Object.fromEntries(parsed.items.map((i) => [i.label, i]));

assert.equal(parsed.declared_total, 2261679, "declared total captured");
assert.ok(!parsed.items.some((i) => /Quotation|Date|Customer|Mobile/i.test(i.label)), "header/PII lines skipped");
assert.equal(byLabel["Ex-showroom price"].amount, 1742000);
assert.equal(byLabel["Ex-showroom price"].category, "ex_showroom");
assert.equal(byLabel["Road Tax & Registration"].category, "rto");
assert.equal(byLabel["Comprehensive Insurance (Zero Dep + RTI)"].category, "insurance");
assert.equal(byLabel["TCS 1%"].category, "tcs");
assert.equal(byLabel["Handling charges"].category, "dealer_fees");
assert.equal(byLabel["Logistics & Documentation"].category, "dealer_fees");
assert.equal(byLabel["Accessories Kit (mandatory)"].category, "accessories");
assert.equal(byLabel["Teflon Coating + Anti rust"].category, "protection_coating");
assert.equal(byLabel["Extended Warranty 4th & 5th year"].category, "extended_warranty");
assert.equal(byLabel["FASTag"].category, "fastag");
assert.equal(byLabel["Exchange Bonus"].amount, -25000, "parenthesised amount is a discount");
assert.equal(byLabel["Corporate Discount"].amount, -10000);
assert.ok(parsed.items.some((i) => i.category === "service_package"), "AMC recognised");
assert.equal(byLabel["Maruti... AMC 3 years"].amount, 14500, "the rs in \"years\" is not a currency marker");

// 2. Label on one line, amount on the next (PDF copy-paste).
const stacked = parseQuoteText("Insurance\n45,210\nHandling Charges\n₹ 5,000");
assert.equal(stacked.items.length, 2);
assert.equal(stacked.items[0].amount, 45210);

// 3. Analysis against a real-looking benchmark.
const benchmark: QuoteBenchmark = {
  ex_showroom_price: 1742000,
  rto: 245880,
  insurance: 62000,
  on_road_price: 2150000,
  source: "scraped",
  city_name: "New Delhi",
};
const a = analyzeQuote({ items: parsed.items, declared_total: parsed.declared_total, benchmark, brand: "Hyundai", variantLabel: "Creta SX(O)" });
const ids = a.findings.map((f) => f.id);

assert.ok(ids.includes("insurance_high"), "insurance above benchmark is flagged");
assert.ok(ids.includes("dealer_fees"), "dealer fees flagged");
assert.ok(ids.includes("protection_coating"), "coating flagged");
assert.ok(ids.includes("accessories"), "accessories flagged");
assert.equal(a.findings.find((f) => f.id === "accessories")!.severity, "challenge", '"mandatory" escalates accessories');
assert.ok(ids.includes("extended_warranty") && ids.includes("service_package"));
assert.ok(ids.includes("rto_ok"), "road tax in line is reported as fine, not flagged");
assert.ok(ids.includes("ex_showroom_ok"));
assert.ok(ids.includes("discount_present"));
assert.ok(!ids.includes("discount_none"));
assert.equal(a.findings.find((f) => f.id === "insurance_high")!.amount, 78400 - 62000);
assert.equal(a.savings.challenge, 78400 - 62000 + 8500 + 6000 + 12500, "challenge savings = insurance excess + dealer fees + coating");
assert.equal(a.savings.optional, 42000 + 19999 + 14500 + 700, "optional = accessories + warranty + AMC + FASTag");
assert.equal(a.findings[0].severity, "challenge", "challenges sort first");

// 4. A clean quote produces no "challenge" findings.
const clean = analyzeQuote({
  items: parseQuoteText("Ex-showroom price 17,42,000\nRoad tax 2,45,000\nInsurance 61,000\nExchange bonus 20,000").items,
  declared_total: null,
  benchmark,
  brand: "Hyundai",
  variantLabel: "Creta SX(O)",
});
assert.equal(clean.savings.challenge, 0);
assert.ok(!clean.findings.some((f) => f.severity === "challenge"));

// 5. No benchmark at all -> still useful, never crashes.
const noBench = analyzeQuote({ items: parsed.items, declared_total: null, benchmark: null, brand: "Hyundai", variantLabel: "Creta" });
assert.ok(noBench.findings.some((f) => f.id === "insurance_compare"));

// 6. Estimated benchmarks are more forgiving: a ₹4k insurance excess is fine.
const est = analyzeQuote({
  items: parseQuoteText("Insurance 66,000").items,
  declared_total: null,
  benchmark: { ...benchmark, source: "estimated" },
  brand: "Hyundai",
  variantLabel: "Creta",
});
assert.ok(!est.findings.some((f) => f.id === "insurance_high"));

// 7. Lines that don't add up to the stated total are called out.
const mismatch = analyzeQuote({
  items: parseQuoteText("Ex-showroom 10,00,000\nInsurance 40,000").items,
  declared_total: 1200000,
  benchmark: null,
  brand: "Tata",
  variantLabel: "Nexon",
});
assert.ok(mismatch.findings.some((f) => f.id === "total_mismatch"));

// 8. TCS on a sub-₹10 lakh car is questioned.
const tcs = analyzeQuote({
  items: parseQuoteText("Ex-showroom price 8,50,000\nTCS 8,500").items,
  declared_total: null,
  benchmark: null,
  brand: "Maruti",
  variantLabel: "Brezza",
});
assert.ok(tcs.findings.some((f) => f.id === "tcs_unexpected"));

console.log("quote.test.ts: all assertions passed");
