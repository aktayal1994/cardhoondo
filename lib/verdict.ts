/**
 * Client-safe duplicates of verdictPhrase/confidenceLabel from
 * lib/llm/writeup.ts. Kept as a separate copy (not a shared import) so
 * client components never pull the Gemini-calling server module into the
 * browser bundle just to reuse two pure functions. Thresholds must stay
 * identical to lib/llm/writeup.ts -- see CLAUDE.md "Evidence legibility
 * refinement" for why these exact cutoffs were chosen.
 */

export function verdictPhrase(score: number): string {
  if (score >= 0.6) return "Strongly positive";
  if (score >= 0.2) return "Generally positive";
  if (score > -0.2) return "Mixed reviews";
  if (score > -0.6) return "Generally negative";
  return "Strongly negative";
}

export function verdictTone(score: number): "positive" | "negative" | "neutral" {
  if (score >= 0.2) return "positive";
  if (score > -0.2) return "neutral";
  return "negative";
}

export function confidenceLabel(coverageRatio: number): string {
  if (coverageRatio >= 0.5) return "Confident match";
  if (coverageRatio >= 0.25) return "Good match, still building evidence";
  return "Early signal — limited reviews so far";
}

/** Finer-grained than the pipeline's native low/medium/high confidence field
 * -- a display-only regrouping of the same claim_count, same precedent as
 * the evidence drill-down's "Very high/High/Medium/Low confidence" pass. */
export function claimCountConfidence(claimCount: number): string {
  if (claimCount >= 15) return "Very high confidence";
  if (claimCount >= 8) return "High confidence";
  if (claimCount >= 4) return "Medium confidence";
  return "Low confidence";
}

export function confidenceSentence(claimCount: number): string {
  const label = claimCountConfidence(claimCount);
  const reviews = claimCount === 1 ? "independent review" : "independent reviews";
  return `${label} · based on ${claimCount} ${reviews}`;
}
