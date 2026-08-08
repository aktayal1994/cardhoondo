"use client";

import { useCallback, useState } from "react";
import LandingScreen from "../components/LandingScreen";
import QuestionnaireFlow from "../components/QuestionnaireFlow";
import ThinkingBridge from "../components/ThinkingBridge";
import ResultsScreen from "../components/ResultsScreen";
import CarDetail from "../components/CarDetail";
import CompareView from "../components/CompareView";
import type { QuestionnaireAnswers } from "../lib/scoring/questionnaireWeights";
import type { RecommendOutput } from "../lib/scoring/recommend";
import type { WriteupOutput } from "../lib/llm/writeup";

type Step = "landing" | "questionnaire" | "thinking" | "results" | "detail" | "compare" | "error";

type RecommendResponse = RecommendOutput & {
  questionnaire_response_id: string;
  recommendation_result_id: string;
};

export default function HomePage() {
  const [step, setStep] = useState<Step>("landing");
  const [flowKey, setFlowKey] = useState(0);

  const [recommendOutput, setRecommendOutput] = useState<RecommendOutput | null>(null);
  const [recommendationResultId, setRecommendationResultId] = useState<string | null>(null);
  const [recommendReady, setRecommendReady] = useState(false);

  const [writeup, setWriteup] = useState<WriteupOutput | null>(null);
  const [writeupError, setWriteupError] = useState(false);

  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  const handleSubmit = useCallback(async (answers: QuestionnaireAnswers) => {
    setStep("thinking");
    setRecommendOutput(null);
    setRecommendationResultId(null);
    setRecommendReady(false);
    setWriteup(null);
    setWriteupError(false);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, top_n: 3 }),
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
  }, []);

  function restart() {
    setStep("landing");
    setFlowKey((k) => k + 1);
    setRecommendOutput(null);
    setRecommendationResultId(null);
    setRecommendReady(false);
    setWriteup(null);
    setWriteupError(false);
    setSelectedCarId(null);
  }

  if (step === "landing") {
    return <LandingScreen onStart={() => setStep("questionnaire")} />;
  }

  if (step === "questionnaire") {
    return <QuestionnaireFlow key={flowKey} onSubmit={handleSubmit} />;
  }

  if (step === "thinking") {
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
    // Shouldn't be reachable (results/detail/compare all require these), but
    // keeps the type-checker honest below instead of using non-null asserts.
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
