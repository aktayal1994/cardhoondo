"use client";

import { use } from "react";
import ResultsFlow from "../../../components/ResultsFlow";

/** A reopened saved search. Private to the signed-in owner; never indexed (see app/robots.ts). */
export default function SavedSearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ResultsFlow source={{ kind: "saved", id }} />;
}
