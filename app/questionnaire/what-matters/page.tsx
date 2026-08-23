"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepProgress from "../../../components/StepProgress";
import StepQuestionForm from "../../../components/StepQuestionForm";
import { loadQuestionnaireState, type QuestionnaireState } from "../../../lib/questionnaireStore";
import { isSectionComplete, profileEntriesForSection } from "../../../lib/questions";

export default function WhatMattersPage() {
  const router = useRouter();
  const [state, setState] = useState<QuestionnaireState | null>(null);

  useEffect(() => {
    const loaded = loadQuestionnaireState();
    if (!loaded.intro) {
      router.replace("/questionnaire/intro");
      return;
    }
    if (!isSectionComplete("everyday_driving", loaded.answers)) {
      router.replace("/questionnaire/everyday-driving");
      return;
    }
    setState(loaded);
  }, [router]);

  if (!state) return null;

  return (
    <div className="min-h-screen bg-paper">
      <StepProgress current={4} />
      <StepQuestionForm
        section="what_matters"
        sectionLabel="What matters to you"
        initialAnswers={state.answers}
        initialSkipped={state.skipped}
        priorProfileEntries={[
          ...profileEntriesForSection("core_requirements", state.answers, state.skipped),
          ...profileEntriesForSection("everyday_driving", state.answers, state.skipped),
        ]}
        // No transitionMessage -- ThinkingBridge on /results is itself the
        // acknowledgment/wait screen for this final handoff, so a second
        // beat here would just be a redundant pause before it.
        backHref="/questionnaire/everyday-driving"
        onSectionComplete={() => router.push("/results")}
      />
    </div>
  );
}
