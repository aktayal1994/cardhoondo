"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import IntroStep, { type IntroValues } from "../../../components/IntroStep";
import StepProgress from "../../../components/StepProgress";
import StepTransition from "../../../components/StepTransition";
import { loadQuestionnaireState, saveIntro } from "../../../lib/questionnaireStore";
import { isSectionComplete } from "../../../lib/questions";
import { trackEvent } from "../../../lib/analytics";
import { useMe } from "../../../lib/auth/useMe";

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
  // Signed-in people: the details from their last saved search, so they confirm
  // instead of retyping. `contactChecked` holds the first render until we know.
  const me = useMe();
  const [savedContact, setSavedContact] = useState<IntroValues | undefined>(undefined);
  const [contactChecked, setContactChecked] = useState(false);

  useEffect(() => {
    const state = loadQuestionnaireState();
    // This is now the last step (see CLAUDE.md: contact details moved to the
    // end to cut first-touch friction) -- if the questions aren't done yet,
    // send them back into the flow rather than asking for contact details
    // first. what-matters redirects further back itself if an earlier
    // section is incomplete, so this cascades to the right step.
    if (!isSectionComplete("what_matters", state.answers)) {
      router.replace("/questionnaire/what-matters");
      return;
    }
    if (state.intro) setInitialValues(state.intro);
    setHydrated(true);
  }, [router]);

  useEffect(() => {
    if (me.status === "unknown") return;
    if (me.status !== "authed") {
      setContactChecked(true);
      return;
    }
    let cancelled = false;
    fetch("/api/me/contact", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json?.contact) setSavedContact(json.contact);
      })
      .catch(() => {
        /* no saved details: the normal form is the fallback */
      })
      .finally(() => {
        if (!cancelled) setContactChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [me.status]);

  function handleContinue(values: IntroValues) {
    saveIntro(values);
    trackEvent("intro_submitted");
    setTransitioning(`Thanks, ${values.name} — let's find your car.`);
  }

  if (transitioning) {
    return <StepTransition message={transitioning} onDone={() => router.push("/results")} />;
  }

  if (!hydrated || !contactChecked) return null;

  return (
    <div className="min-h-screen bg-paper">
      <StepProgress current={4} />
      <IntroStep initialValues={initialValues} savedContact={savedContact} onContinue={handleContinue} />
    </div>
  );
}
