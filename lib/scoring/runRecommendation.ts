import { deriveWeightVector, type QuestionnaireAnswers } from "./questionnaireWeights";
import { recommend, type RecommendOutput } from "./recommend";
import { fetchRecommendationData } from "../data/fetchRecommendationData";

/**
 * Score a set of answers against the current review data and return the
 * ranked shortlist. Shared by /api/recommend (a fresh submission) and
 * /api/saved-searches/[id]/open (re-running a saved search), so both always use
 * exactly the same scoring path. Server-only (reads Supabase).
 */
export async function runRecommendation(answers: QuestionnaireAnswers, topN = 3): Promise<RecommendOutput> {
  const weights = deriveWeightVector(answers);
  const recommendationData = await fetchRecommendationData();
  return recommend({ answers, weights, topN, ...recommendationData });
}
