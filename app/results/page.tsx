"use client";

import ResultsFlow from "../../components/ResultsFlow";

/**
 * Reached only after all 4 step-forms (see app/questionnaire/*) complete --
 * ResultsFlow reads the accumulated answers out of sessionStorage and submits
 * them. The same flow also powers reopened saved searches (app/saved/[id]).
 */
export default function ResultsPage() {
  return <ResultsFlow source={{ kind: "fresh" }} />;
}
