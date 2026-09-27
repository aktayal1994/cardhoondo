/** ₹10.99 lakh style, the way Indian car buyers read prices. */
export function formatLakh(amount: number | null | undefined): string {
  if (amount == null) return "";
  // Truncate (not round): catalog prices carry a stray rupee (10,99,901), and
  // rounding would turn "10.99" into "11".
  const lakh = Math.floor(amount / 1000) / 100;
  return `₹${lakh.toFixed(2).replace(/\.?0+$/, "")} lakh`;
}

export function priceRangeText(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && Math.round(min / 1000) !== Math.round(max / 1000)) {
    return `${formatLakh(min)} to ${formatLakh(max)}`;
  }
  return formatLakh(min ?? max);
}

/** "A", "A and B", "A, B and C". */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

/** "cng" -> "CNG", "petrol" -> "Petrol". */
export function fuelLabel(fuel: string): string {
  const f = fuel.trim().toLowerCase();
  if (f === "cng") return "CNG";
  if (f === "ev" || f === "electric") return "Electric";
  return capitalize(f);
}
