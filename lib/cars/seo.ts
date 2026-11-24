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

/** Titles for the owner-topic pages (/cars/<slug>/problems | pros | mileage). */
export function topicTitle(kind: "problems" | "pros" | "mileage", name: string, model: string, isEv: boolean): string {
  const m = isEv ? "Real Range" : "Real Mileage";
  const sets = {
    problems: [
      `${name} Problems: What Owners Report | CarDhoondo`,
      `${name} Problems: What Owners Report`,
      `${name} Problems and Complaints`,
      `${model} Problems: What Owners Report`,
    ],
    pros: [
      `${name} Pros: What Owners Love | CarDhoondo`,
      `${name} Pros: What Owners Love`,
      `${name} Pros and Good Points`,
      `${model} Pros: What Owners Love`,
    ],
    mileage: [
      `${name} ${m}: What Owners Get | CarDhoondo`,
      `${name} ${m}: What Owners Get`,
      `${name} ${m}`,
      `${model} ${m}: What Owners Get`,
    ],
  } as const;
  return firstFitting([...sets[kind]], MAX_TITLE_CHARS);
}

export function topicDescription(
  kind: "problems" | "pros" | "mileage",
  model: string,
  count: number,
  sources: number,
  areas: string[],
  isEv: boolean,
): string {
  const list = areas.slice(0, 3).join(", ");
  const cands =
    kind === "problems"
      ? [
          `Common ${model} problems from ${count} critical remarks in real owner and expert reviews${list ? `: ${list}` : ""}, in their own words.`,
          `Common ${model} problems from ${count} remarks in owner and expert reviews, in their own words.`,
          `Common ${model} problems, from real owner and expert reviews.`,
        ]
      : kind === "pros"
        ? [
            `What owners and experts like about the ${model}, from ${count} remarks in real reviews${list ? `: ${list}` : ""}, in their own words.`,
            `What owners and experts like about the ${model}, from ${count} remarks in real reviews.`,
            `What owners and experts like about the ${model}.`,
          ]
        : [
            `${model} ${isEv ? "real-world range" : "real mileage"} in the city and on the highway, from ${count} remarks in ${sources} owner and expert reviews, by ${isEv ? "version" : "fuel"}.`,
            `${model} ${isEv ? "real-world range" : "real mileage"} from ${count} remarks in ${sources} owner and expert reviews.`,
            `${model} ${isEv ? "real-world range" : "real mileage"} from owner and expert reviews.`,
          ];
  return firstFitting(cands, MAX_DESCRIPTION_CHARS);
}

/** e.g. "Creta vs Seltos vs Hyryder: Owner Verdict | CarDhoondo". */
export function trioTitle(models: string): string {
  return firstFitting(
    [`${models}: Owner Verdict | CarDhoondo`, `${models}: Which Is Best?`, `${models} | CarDhoondo`, models],
    MAX_TITLE_CHARS,
  );
}

export function trioDescription(models: string[], sources: number): string {
  const [a, b, c] = models;
  return firstFitting(
    [
      `${a}, ${b} or ${c}? See which one leads on mileage, comfort, space and more, from ${sources} owner and expert reviews, with prices.`,
      `${a}, ${b} or ${c}? Which one leads where, from ${sources} owner and expert reviews.`,
      `${a} vs ${b} vs ${c}: which one leads where, from real reviews.`,
    ],
    MAX_DESCRIPTION_CHARS,
  );
}
