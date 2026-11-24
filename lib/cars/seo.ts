import { MAX_DESCRIPTION_CHARS, MAX_TITLE_CHARS } from "../seo";

/** First candidate that fits the budget; the last one is the fallback. */
function firstFitting(candidates: string[], max: number): string {
  return candidates.find((c) => c.length <= max) ?? candidates[candidates.length - 1];
}

/** The year in a title tells a searcher the page is current; it rolls over by itself (pages re-render daily). */
function year(): number {
  return new Date().getFullYear();
}

/** e.g. "Hyundai Exter Review (2026): What Owners Really Say". Search
 * Console (Nov 2026) showed review searches typed as "<brand> <model> review". */
export function carPageTitle(name: string, model: string): string {
  const y = year();
  return firstFitting(
    [
      `${name} Review (${y}): What Owners Really Say`,
      `${name} Review (${y}): Owner Verdict`,
      `${model} Review (${y}): What Owners Really Say`,
      `${name} Review (${y})`,
      `${name} Review`,
    ],
    MAX_TITLE_CHARS,
  );
}

/** Leads with the verdict itself (what owners like and complain about), so the
 * snippet answers the search before the click. Drops detail until it fits. */
export function carPageDescription(
  name: string,
  sources: number,
  price: string | null,
  likes: string[],
  complaints: string[],
): string {
  const like = likes.length ? `Owners like its ${joinTwo(likes)}` : null;
  const dislike = complaints.length ? `complain about its ${joinTwo(complaints)}` : null;
  const verdict = like && dislike ? `${like} and ${dislike}.` : like ? `${like}.` : dislike ? `Owners ${dislike}.` : "";
  return firstFitting(
    [
      `${name} review: ${verdict} From ${sources} owner and expert reviews${price ? `, price ${price}` : ""}.`,
      `${name} review: ${verdict} From ${sources} owner and expert reviews.`,
      `${name}: ${verdict} From ${sources} real reviews.`,
      `${name} review from ${sources} owner and expert reviews: what people like and common complaints.`,
    ],
    MAX_DESCRIPTION_CHARS,
  );
}

/** e.g. "Creta vs Seltos: Which Is Better? (2026) | CarDhoondo". People type
 * comparisons as bare models, often with "which is better" (Search Console, Nov 2026). */
export function comparisonTitle(nameA: string, nameB: string, modelA: string, modelB: string): string {
  const y = year();
  return firstFitting(
    [
      `${nameA} vs ${nameB}: Which Is Better? (${y})`,
      `${modelA} vs ${modelB}: Which Is Better? (${y}) | CarDhoondo`,
      `${modelA} vs ${modelB}: Which Is Better? (${y})`,
      `${modelA} vs ${modelB} (${y})`,
    ],
    MAX_TITLE_CHARS,
  );
}

/** Leads with who wins where, from the page's own verdicts. */
export function comparisonDescription(
  modelA: string,
  modelB: string,
  sources: number,
  aWins: string[],
  bWins: string[],
): string {
  const verdict =
    aWins.length && bWins.length
      ? `Owners rate the ${modelA} better for ${joinTwo(aWins)}, the ${modelB} for ${joinTwo(bWins)}.`
      : aWins.length
        ? `Owners rate the ${modelA} better for ${joinTwo(aWins)}; the ${modelB} is not clearly ahead anywhere.`
        : bWins.length
          ? `Owners rate the ${modelB} better for ${joinTwo(bWins)}; the ${modelA} is not clearly ahead anywhere.`
          : `Owners rate the ${modelA} and ${modelB} about the same in every area.`;
  return firstFitting(
    [
      `${modelA} or ${modelB}? ${verdict} From ${sources} owner and expert reviews, with prices.`,
      `${modelA} or ${modelB}? ${verdict} From ${sources} real reviews.`,
      `${modelA} or ${modelB}? ${verdict}`,
      `${modelA} or ${modelB}? Where each one wins, from ${sources} owner and expert reviews, with prices.`,
    ],
    MAX_DESCRIPTION_CHARS,
  );
}

function joinTwo(items: string[]): string {
  const xs = items.slice(0, 2);
  return xs.length === 2 ? `${xs[0]} and ${xs[1]}` : (xs[0] ?? "");
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
    [`${models}: Which Is Best? (${year()})`, `${models}: Which Is Best?`, `${models} | CarDhoondo`, models],
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
