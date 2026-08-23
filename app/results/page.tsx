"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ThinkingBridge from "../../components/ThinkingBridge";
import ResultsScreen from "../../components/ResultsScreen";
import CarDetail from "../../components/CarDetail";
import CompareView from "../../components/CompareView";
import { loadQuestionnaireState, clearQuestionnaireState } from "../../lib/questionnaireStore";
import { isSectionComplete } from "../../lib/questions";
import type { RecommendOutput } from "../../lib/scoring/recommend";
import type { WriteupOutput } from "../../lib/llm/writeup";

type Step = "loading" | "thinking" | "results" | "detail" | "compare" | "error";

type RecommendResponse = RecommendOutput & {
  questionnaire_response_id: string;
  recommendation_result_id: string;
};

/**
 * Reached only after all 4 step-forms (see app/questionnaire/*) complete --
 * reads the accumulated answers/intro out of sessionStorage rather than
 * receiving them as props, since a real route change (not just client
 * state) got us here. Everything from here down (thinking -> results ->
 * detail/compare) still behaves as one in-page state machine, same as
 * before the step-form split -- only the questionnaire itself needed real
 * per-step URLs.
 */
export default function ResultsPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const submitted = useRef(false);

  const [recommendOutput, setRecommendOutput] = useState<RecommendOutput | null>(null);
  const [recommendationResultId, setRecommendationResultId] = useState<string | null>(null);
  const [recommendReady, setRecommendReady] = useState(false);

  const [writeup, setWriteup] = useState<WriteupOutput | null>(null);
  const [writeupError, setWriteupError] = useState(false);

  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const stored = loadQuestionnaireState();
    if (!stored.intro || !isSectionComplete("what_matters", stored.answers)) {
      router.replace("/questionnaire/intro");
      return;
    }

    setStep("thinking");
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: stored.answers,
          top_n: 3,
          name: stored.intro.name,
          pincode: stored.intro.pincode,
          phone_number: stored.intro.phone_number,
        }),
      });
      if (!res.ok) throw new Error("recommend failed");
      const json: RecommendResponse = await res.json();

      setRecommendOutput(json);
      setRecommendationResultId(json.recommendation_result_id);
      setRecommendReady(true);

      fetch("/api/writeup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendation_result_id: json.recommendation_result_id }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("writeup failed"))))
        .then((w: WriteupOutput) => setWriteup(w))
        .catch(() => setWriteupError(true));
    } catch {
      setStep("error");
    }
  }, [router]);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    submit();
  }, [submit]);

  function restart() {
    clearQuestionnaireState();
    router.push("/");
  }

  if (step === "loading" || step === "thinking") {
    return <ThinkingBridge ready={recommendReady} onDone={() => setStep("results")} />;
  }

  if (step === "error") {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-lg font-medium text-ink">Something went wrong generating your recommendations.</p>
        <p className="mt-2 text-ink-soft">This is on us, not your answers — worth trying again.</p>
        <button
          onClick={restart}
          className="mt-6 rounded-full border border-navy-800 px-6 py-3 text-sm font-medium text-navy-800 hover:bg-navy-50"
        >
          Start over
        </button>
      </main>
    );
  }

  if (!recommendOutput || !recommendationResultId) {
    return null;
  }

  if (step === "results") {
    return (
      <ResultsScreen
        recommendOutput={recommendOutput}
        writeup={writeup}
        writeupError={writeupError}
        onSelectCar={(carId) => {
          setSelectedCarId(carId);
          setStep("detail");
        }}
        onCompare={() => setStep("compare")}
        onRestart={restart}
      />
    );
  }

  if (step === "detail" && selectedCarId) {
    const candidate = recommendOutput.shortlist.find((c) => c.car_id === selectedCarId);
    return (
      <CarDetail
        recommendationResultId={recommendationResultId}
        carId={selectedCarId}
        fallbackLabel={candidate ? `${candidate.brand} ${candidate.car_model}` : ""}
        onBack={() => setStep("results")}
      />
    );
  }

  if (step === "compare") {
    return (
      <CompareView
        recommendationResultId={recommendationResultId}
        recommendOutput={recommendOutput}
        onBack={() => setStep("results")}
      />
    );
  }

  return null;
}
