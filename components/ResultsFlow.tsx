"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThinkingBridge from "./ThinkingBridge";
import ResultsScreen from "./ResultsScreen";
import CarDetail from "./CarDetail";
import CompareView from "./CompareView";
import SaveSearchPrompt from "./SaveSearchPrompt";
import SavedSearchBanner from "./SavedSearchBanner";
import AuthSheet from "./AuthSheet";
import { loadQuestionnaireState, clearQuestionnaireState } from "../lib/questionnaireStore";
import { isSectionComplete } from "../lib/questions";
import type { RecommendOutput } from "../lib/scoring/recommend";
import type { WriteupOutput } from "../lib/llm/writeup";
import { trackEvent } from "../lib/analytics";
import { savePendingClaim, type PendingClaim } from "../lib/auth/pendingClaim";
import type { Persona } from "../lib/persona/derivePersona";
import type { SavedSearchItem, ShortlistDiff } from "../lib/saved/items";

type Step = "loading" | "thinking" | "results" | "detail" | "compare" | "error" | "signin" | "gone";

type RecommendResponse = RecommendOutput & {
  questionnaire_response_id: string;
  recommendation_result_id: string;
  claim_token?: string;
  persona?: Persona;
  writeup?: WriteupOutput | null;
  diff?: ShortlistDiff;
  saved_search?: SavedSearchItem | null;
};

export type ResultsSource = { kind: "fresh" } | { kind: "saved"; id: string };

/**
 * The whole results experience (thinking -> results -> evidence detail ->
 * compare) as one in-page state machine, for two sources:
 *  - "fresh": the answers just given in the questionnaire (sessionStorage),
 *    submitted to /api/recommend;
 *  - "saved": a saved search reopened from an account; the server re-runs the
 *    recommender on the stored answers and reports what changed.
 */
export default function ResultsFlow({ source }: { source: ResultsSource }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const submitted = useRef(false);

  const [recommendOutput, setRecommendOutput] = useState<RecommendOutput | null>(null);
  const [recommendationResultId, setRecommendationResultId] = useState<string | null>(null);
  const [recommendReady, setRecommendReady] = useState(false);

  const [writeup, setWriteup] = useState<WriteupOutput | null>(null);
  const [writeupError, setWriteupError] = useState(false);

  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  const [claim, setClaim] = useState<PendingClaim | null>(null);
  const [savedInfo, setSavedInfo] = useState<{ saved: SavedSearchItem | null; diff: ShortlistDiff | null } | null>(null);

  const fetchWriteup = useCallback((resultId: string) => {
    fetch("/api/writeup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendation_result_id: resultId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("writeup failed");
        return res.json();
      })
      .then((json: WriteupOutput) => setWriteup(json))
      .catch(() => setWriteupError(true));
  }, []);

  const submitFresh = useCallback(async () => {
    const stored = loadQuestionnaireState();
    // A session saved before the consent notice existed has no consent
    // version: send it back to the intro so the person can read and agree.
    if (!stored.intro || !stored.intro.consent_notice_version || !isSectionComplete("what_matters", stored.answers)) {
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
          consent_notice_version: stored.intro.consent_notice_version,
        }),
      });
      if (!res.ok) throw new Error("recommend failed");
      const json: RecommendResponse = await res.json();

      setRecommendOutput(json);
      setRecommendationResultId(json.recommendation_result_id);
      setRecommendReady(true);

      // Keep the secret that lets this browser save this search later.
      if (json.claim_token && json.persona) {
        const pending: PendingClaim = {
          response_id: json.questionnaire_response_id,
          claim_token: json.claim_token,
          persona: json.persona,
        };
        savePendingClaim(pending);
        setClaim(pending);
      }

      // shortlist_size=0 is a real product-quality signal worth its own
      // event, not just a smaller number on results_viewed -- it's the
      // exact failure mode a thin/broken structural filter produces, and
      // it's invisible in a plain pageview count.
      trackEvent("results_viewed", {
        shortlist_size: json.shortlist.length,
        skipped_no_data_count: json.cars_skipped_no_review_data.length,
      });
      if (json.shortlist.length === 0) trackEvent("recommendation_empty");

      fetchWriteup(json.recommendation_result_id);
    } catch {
      setStep("error");
    }
  }, [router, fetchWriteup]);

  const openSaved = useCallback(
    async (id: string) => {
      setStep("thinking");
      try {
        const res = await fetch(`/api/saved-searches/${id}/open`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: "{}",
        });
        if (res.status === 401) {
          setStep("signin");
          return;
        }
        if (res.status === 404) {
          setStep("gone");
          return;
        }
        if (!res.ok) throw new Error("open failed");
        const json: RecommendResponse = await res.json();

        setRecommendOutput(json);
        setRecommendationResultId(json.recommendation_result_id);
        setSavedInfo({ saved: json.saved_search ?? null, diff: json.diff ?? null });
        setRecommendReady(true);
        trackEvent("saved_search_open", { changed: !!json.diff?.changed });

        // Reuse the stored write-up when the shortlist is unchanged; otherwise write a new one.
        if (json.writeup) setWriteup(json.writeup);
        else fetchWriteup(json.recommendation_result_id);
      } catch {
        setStep("error");
      }
    },
    [fetchWriteup],
  );

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    if (source.kind === "fresh") void submitFresh();
    else void openSaved(source.id);
  }, [source, submitFresh, openSaved]);

  function restart() {
    clearQuestionnaireState();
    router.push("/");
  }

  if (step === "loading" || step === "thinking") {
    return <ThinkingBridge ready={recommendReady} onDone={() => setStep("results")} />;
  }

  if (step === "signin") {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-lg font-medium text-ink">Sign in to open this saved search.</p>
        <p className="mt-2 text-ink-soft">Your saved searches are only visible to you.</p>
        <SigninButton next={source.kind === "saved" ? `/saved/${source.id}` : "/"} />
      </main>
    );
  }

  if (step === "gone") {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-lg font-medium text-ink">This saved search no longer exists.</p>
        <p className="mt-2 text-ink-soft">It may have been deleted from another device.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full border border-border px-6 py-3 text-sm font-medium text-ink-soft transition hover:border-accent-rust/50 hover:text-ink"
        >
          Back to home
        </Link>
      </main>
    );
  }

  if (step === "error") {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-lg font-medium text-ink">
          {source.kind === "saved"
            ? "Couldn't re-run this search."
            : "Something went wrong generating your recommendations."}
        </p>
        <p className="mt-2 text-ink-soft">
          {source.kind === "saved"
            ? "Your saved search is safe. Please try again in a moment."
            : "This is on us, not your answers — worth trying again."}
        </p>
        <button
          onClick={source.kind === "saved" ? () => router.refresh() : restart}
          className="mt-6 rounded-full border border-border px-6 py-3 text-sm font-medium text-ink-soft transition hover:border-accent-rust/50 hover:text-ink"
        >
          {source.kind === "saved" ? "Try again" : "Start over"}
        </button>
      </main>
    );
  }

  if (!recommendOutput || !recommendationResultId) return null;

  if (step === "results") {
    return (
      <ResultsScreen
        recommendOutput={recommendOutput}
        recommendationResultId={recommendationResultId}
        writeup={writeup}
        writeupError={writeupError}
        topSlot={
          source.kind === "fresh" ? (
            <SaveSearchPrompt claim={claim} />
          ) : (
            <SavedSearchBanner saved={savedInfo?.saved ?? null} diff={savedInfo?.diff ?? null} />
          )
        }
        onSelectCar={(carId) => {
          trackEvent("evidence_drilldown_view", { car_id: carId });
          setSelectedCarId(carId);
          setStep("detail");
        }}
        onCompare={() => {
          trackEvent("compare_view_used");
          setStep("compare");
        }}
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

function SigninButton({ next }: { next: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-6 rounded-full bg-accent-rust px-7 py-3.5 text-[15px] font-semibold text-charcoal-950 shadow-glow-sm transition hover:brightness-110"
      >
        Sign in
      </button>
      <AuthSheet open={open} onClose={() => setOpen(false)} next={next} heading="Sign in" />
    </>
  );
}
