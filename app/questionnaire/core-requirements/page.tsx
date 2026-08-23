"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepProgress from "../../../components/StepProgress";
import StepQuestionForm from "../../../components/StepQuestionForm";
import { loadQuestionnaireState, type QuestionnaireState } from "../../../lib/questionnaireStore";

export default function CoreRequirementsPage() {
  const router = useRouter();
  const [state, setState] = useState<QuestionnaireState | null>(null);

  useEffect(() => {
    const loaded = loadQuestionnaireState();
    if (!loaded.intro) {
      router.replace("/questionnaire/intro");
      return;
    }
    setState(loaded);
  }, [router]);

  if (!state) return null;

  return (
    <div className="min-h-screen bg-paper">
      <StepProgress current={2} />
      <StepQuestionForm
        section="core_requirements"
        sectionLabel="Core requirements"
        initialAnswers={state.answers}
        initialSkipped={state.skipped}
        priorProfileEntries={[]}
        transitionMessage="Budget, fuel, seating, transmission — the non-negotiables are locked in."
        backHref="/questionnaire/intro"
        onSectionComplete={() => router.push("/questionnaire/everyday-driving")}
      />
    </div>
  );
}
