/**
 * Persists questionnaire progress across real page navigations. Each of the
 * 4 steps (intro / core requirements / everyday driving / what matters) is
 * now its own route (see app/questionnaire/*), so state can't just live in
 * a single component's React state the way the old single-page
 * QuestionnaireFlow did -- a route change unmounts the page. sessionStorage
 * is the right lifetime here: survives back/forward and refresh within the
 * tab, clears when the tab closes, no server/account needed for a fake-door
 * flow with no auth.
 */
import type { QuestionnaireAnswers } from "./scoring/questionnaireWeights";
import type { IntroValues } from "../components/IntroStep";

const STORAGE_KEY = "cardhoondo_questionnaire_v1";

export interface QuestionnaireState {
  intro: IntroValues | null;
  answers: QuestionnaireAnswers;
  skipped: string[];
}

const EMPTY_STATE: QuestionnaireState = { intro: null, answers: {}, skipped: [] };

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadQuestionnaireState(): QuestionnaireState {
  if (!isBrowser()) return EMPTY_STATE;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    return {
      intro: parsed.intro ?? null,
      answers: parsed.answers ?? {},
      skipped: Array.isArray(parsed.skipped) ? parsed.skipped : [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

function saveQuestionnaireState(state: QuestionnaireState) {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function saveIntro(intro: IntroValues) {
  const state = loadQuestionnaireState();
  saveQuestionnaireState({ ...state, intro });
}

/** Merges (not replaces) into whatever's already stored, so completing one
 * step never loses another step's answers. */
export function saveAnswers(answers: QuestionnaireAnswers, skipped: string[]) {
  const state = loadQuestionnaireState();
  saveQuestionnaireState({
    ...state,
    answers: { ...state.answers, ...answers },
    skipped: Array.from(new Set([...state.skipped, ...skipped])),
  });
}

export function clearQuestionnaireState() {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
