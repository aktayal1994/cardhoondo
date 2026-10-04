import { MAX_DESCRIPTION_CHARS, MAX_TITLE_CHARS } from "../seo";

/** First candidate that fits the budget; the last one is the fallback. */
function firstFitting(candidates: string[], max: number): string {
  return candidates.find((c) => c.length <= max) ?? candidates[candidates.length - 1];
}

/** e.g. "Kia Seltos Review: Owner & Expert Verdict | CarDhoondo". */
export function carPageTitle(name: string): string {
  return firstFitting(
    [
      `${name} Review: Owner & Expert Verdict | CarDhoondo`,
      `${name} Review: What Owners Say | CarDhoondo`,
      `${name} Review: What Owners Say`,
      `${name} Review | CarDhoondo`,
      `${name} Review`,
    ],
    MAX_TITLE_CHARS,
  );
}

/** Factual summary from the page's own numbers; drops detail until it fits. */
export function carPageDescription(name: string, claims: number, sources: number, price: string | null): string {
  const base = `${name} review from ${claims} statements in ${sources} owner and expert reviews`;
  return firstFitting(
    [
      `${base}: what people like, common complaints${price ? ` and ex-showroom price ${price}` : ""}.`,
      `${base}: what people like, common complaints${price ? ` and price ${price}` : ""}.`,
      `${base}: what people like and common complaints.`,
      `${name} review from ${sources} owner and expert reviews: likes and complaints.`,
    ],
    MAX_DESCRIPTION_CHARS,
  );
}
