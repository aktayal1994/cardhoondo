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

/** e.g. "Hyundai Creta vs Kia Seltos: Owner Verdict | CarDhoondo". Pass nameB
 * as the bare model for same-brand pairs ("Maruti Suzuki Fronx vs Brezza"). */
export function comparisonTitle(nameA: string, nameB: string, modelA: string, modelB: string): string {
  return firstFitting(
    [
      `${nameA} vs ${nameB}: Owner Verdict | CarDhoondo`,
      `${nameA} vs ${nameB}: Which Is Better?`,
      `${nameA} vs ${nameB} | CarDhoondo`,
      `${nameA} vs ${nameB}`,
      `${modelA} vs ${modelB}: Owner Verdict | CarDhoondo`,
      `${modelA} vs ${modelB}`,
    ],
    MAX_TITLE_CHARS,
  );
}

export function comparisonDescription(modelA: string, modelB: string, sources: number): string {
  return firstFitting(
    [
      `${modelA} or ${modelB}? See where each one wins on mileage, comfort, space and more, based on ${sources} owner and expert reviews, with prices.`,
      `${modelA} or ${modelB}? Where each one wins, based on ${sources} owner and expert reviews, with prices.`,
      `${modelA} vs ${modelB}: where each one wins, from ${sources} owner and expert reviews.`,
    ],
    MAX_DESCRIPTION_CHARS,
  );
}
