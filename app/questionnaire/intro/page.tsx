"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import IntroStep, { type IntroValues } from "../../../components/IntroStep";
import StepProgress from "../../../components/StepProgress";
import StepTransition from "../../../components/StepTransition";
import { loadQuestionnaireState, saveIntro } from "../../../lib/questionnaireStore";

export default function IntroPage() {
  const router = useRouter();
  // IntroStep seeds its own input state from `initialValues` only on first
  // mount (a plain useState initializer, not a prop-synced one) -- so this
  // must be resolved *before* IntroStep ever renders, not patched in via a
  // later setState once the sessionStorage read finishes. `hydrated` gates
  // that first render, same load-gate pattern the other 3 step pages use.
  const [initialValues, setInitialValues] = useState<IntroValues | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  useEffect(() => {
    const state = loadQuestionnaireState();
    if (state.intro) setInitialValues(state.intro);
    setHydrated(true);
  }, []);

  function handleContinue(values: IntroValues) {
    saveIntro(values);
    setTransitioning(`Thanks, ${values.name} — let's find your car.`);
  }

  if (transitioning) {
    return <StepTransition message={transitioning} onDone={() => router.push("/questionnaire/core-requirements")} />;
  }

  if (!hydrated) return null;

  return (
    <div className="min-h-screen bg-paper">
      <StepProgress current={1} />
      <IntroStep initialValues={initialValues} onContinue={handleContinue} />
    </div>
  );
}
