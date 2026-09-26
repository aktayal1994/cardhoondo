import { categorize } from "./categorize";
import type { QuoteItem } from "./types";

/**
 * Turns pasted quote text (copied from a WhatsApp message, email or PDF)
 * into line items. Runs in the browser and on the server; no AI, no network.
 *
 * It is a best-effort reader, not an OCR engine: it looks for lines that end
 * in a rupee amount ("Handling charges  Rs. 8,500", "Insurance : 45,210/-").
 * The person always sees and can edit the result before anything is analysed,
 * so a misread line is a small annoyance, never a wrong verdict.
 */

const MAX_AMOUNT = 50_000_000; // ₹5 crore -- above this it's a phone number or ID, not a price

/** Lines that describe the quote itself rather than a charge. */
const SKIP_LINE = /quot(e|ation)?\s*(no|number|id|#|date|valid)|\binvoice\b|gstin|\bpan\b|mobile|phone|contact|e-?mail|\bvin\b|chassis|engine\s*no|\bpin\s*code|valid\s*(till|until|upto)|\bdate\b|customer|address|sales\s*(executive|person|consultant)|\bcolou?r\b\s*[:-]/i;
const DATE_LIKE = /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/;
const HEADER_LINE = /^(sr\.?\s*no\.?\s*)?(description|particulars|item|details?)\b.*\b(amount|price|rs|₹|total)\b/i;

/** A pure total line: sets declared_total instead of becoming an item. */
const TOTAL_LINE = /^(grand\s*|net\s*|final\s*|gross\s*)?(total|on[\s-]*road(\s*price)?|amount\s*payable|net\s*payable|price\s*payable|total\s*payable|balance(\s*amount)?|you\s*pay|out[\s-]*the[\s-]*door)\b/i;
/** A subtotal/summary line that would double-count the lines above it. */
const SUBTOTAL_LINE = /\btotal\b|sub[\s-]*total|net\s*(discount|saving)|savings?\b/i;

function normaliseNumber(token: string): number {
  return Number(token.replace(/,/g, ""));
}

function lastAmount(line: string): { amount: number; hasCurrency: boolean; index: number } | null {
  // (?<![A-Za-z]) stops the "rs" in "years" or "hours" being read as a rupee marker.
  const re = /(?<![A-Za-z])(₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)(?:\s*\/-|\s*only)?/gi;
  let match: RegExpExecArray | null;
  let best: { amount: number; hasCurrency: boolean; index: number } | null = null;
  while ((match = re.exec(line)) !== null) {
    const amount = normaliseNumber(match[2]);
    if (!Number.isFinite(amount)) continue;
    best = { amount, hasCurrency: !!match[1], index: match.index };
  }
  return best;
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/^[\s\d]+[.)]\s+(?=[A-Za-z])/, "") // "1. " / "2) " list numbering
    .replace(/^[-•*·\s]+/, "")
    .replace(/[\s:|\-–—=(]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export interface ParsedQuote {
  items: QuoteItem[];
  declared_total: number | null;
}

export function parseQuoteText(text: string): ParsedQuote {
  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // A label on one line and its amount alone on the next ("Insurance" / "45,210").
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const cur = rawLines[i];
    const next = rawLines[i + 1];
    const curHasAmount = /\d/.test(cur);
    const nextIsAmountOnly = next !== undefined && /^(₹|rs\.?|inr)?\s*-?\d[\d,]*(\.\d{1,2})?\s*(\/-)?$/i.test(next);
    if (!curHasAmount && nextIsAmountOnly) {
      lines.push(`${cur} ${next}`);
      i++;
    } else {
      lines.push(cur);
    }
  }

  const items: QuoteItem[] = [];
  let declaredTotal: number | null = null;

  for (const line of lines) {
    if (HEADER_LINE.test(line) || SKIP_LINE.test(line) || DATE_LIKE.test(line)) continue;
    const found = lastAmount(line);
    if (!found) continue;
    if (found.amount > MAX_AMOUNT) continue;
    if (!found.hasCurrency && found.amount < 100) continue; // "Qty 1", "3 years"

    const label = cleanLabel(line.slice(0, found.index));
    if (!label || !/[A-Za-z]/.test(label)) continue;

    if (TOTAL_LINE.test(label)) {
      // A "Total" that sums only one group ("Total accessories") is a subtotal, not the quote total.
      if (/(accessor|insur|warrant|discount|charges|tax)/i.test(label)) continue;
      declaredTotal = found.amount;
      continue;
    }
    if (SUBTOTAL_LINE.test(label)) continue;

    const negativeMarker = /\(\s*(₹|rs\.?)?\s*\d[\d,]*\s*\)\s*$/i.test(line);
    let amount = found.amount;
    let category = categorize(label, amount);
    if (negativeMarker || category === "discount") {
      amount = -Math.abs(amount);
      category = "discount";
    }
    items.push({ label, amount, category });
  }

  return { items, declared_total: declaredTotal };
}
