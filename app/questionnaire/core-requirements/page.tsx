"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepProgress from "../../../components/StepProgress";
import StepQuestionForm from "../../../components/StepQuestionForm";
import { loadQuestionnaireState, type QuestionnaireState } from "../../../lib/questionnaireStore";
import { trackEvent } from "../../../lib/analytics";

export default function CoreRequirementsPage() {
  const router = useRouter();
  const [state, setState] = useState<QuestionnaireState | null>(null);

  useEffect(() => {
    setState(loadQuestionnaireState());
  }, [router]);

  if (!state) return null;

  return (
    <div className="min-h-screen bg-paper">
      <StepProgress current={1} />
      <StepQuestionForm
        section="core_requirements"
        sectionLabel="Core requirements"
        initialAnswers={state.answers}
        initialSkipped={state.skipped}
        priorProfileEntries={[]}
        transitionMessage="Budget, fuel, seating, transmission — the non-negotiables are locked in."
        backHref="/"
        onSectionComplete={() => {
          trackEvent("questionnaire_step_complete", { step: "core_requirements" });
          router.push("/questionnaire/everyday-driving");
        }}
      />
    </div>
  );
}
