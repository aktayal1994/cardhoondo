"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StepProgress from "../../../components/StepProgress";
import StepQuestionForm from "../../../components/StepQuestionForm";
import { loadQuestionnaireState, type QuestionnaireState } from "../../../lib/questionnaireStore";
import { isSectionComplete, profileEntriesForSection } from "../../../lib/questions";

export default function EverydayDrivingPage() {
  const router = useRouter();
  const [state, setState] = useState<QuestionnaireState | null>(null);

  useEffect(() => {
    const loaded = loadQuestionnaireState();
    if (!loaded.intro) {
      router.replace("/questionnaire/intro");
      return;
    }
    if (!isSectionComplete("core_requirements", loaded.answers)) {
      router.replace("/questionnaire/core-requirements");
      return;
    }
    setState(loaded);
  }, [router]);

  if (!state) return null;

  return (
    <div className="min-h-screen bg-paper">
      <StepProgress current={3} />
      <StepQuestionForm
        section="everyday_driving"
        sectionLabel="Your everyday driving"
        initialAnswers={state.answers}
        initialSkipped={state.skipped}
        priorProfileEntries={profileEntriesForSection("core_requirements", state.answers, state.skipped)}
        transitionMessage="Good — now I know how you actually drive day to day."
        backHref="/questionnaire/core-requirements"
        onSectionComplete={() => router.push("/questionnaire/what-matters")}
      />
    </div>
  );
}
