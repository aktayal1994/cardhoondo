"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pencil, PanelRightOpen, X } from "lucide-react";
import {
  questionsInSection,
  isAnswerComplete,
  isQuestionVisible,
  summarizeAnswer,
  type QuestionDef,
  type SectionId,
} from "../lib/questions";
import type { QuestionnaireAnswers } from "../lib/scoring/questionnaireWeights";
import { saveAnswers } from "../lib/questionnaireStore";
import QuestionCard from "./QuestionCard";
import StepTransition from "./StepTransition";

export interface ProfileEntry {
  prompt: string;
  value: string;
}

interface StepQuestionFormProps {
  section: SectionId;
  sectionLabel: string;
  /** Full accumulated answers across every step so far -- needed (not just
   * this section's own) because some options resolve a conditionalLabel/
   * conditionalIcon off a different section's answer (e.g. q_frustration's
   * refuelling/charging swap depends on q_fuel from core_requirements). */
  initialAnswers: QuestionnaireAnswers;
  initialSkipped: string[];
  /** Read-only summary rows from steps already completed, shown above this
   * step's own entries in the sidebar for continuity. */
  priorProfileEntries: ProfileEntry[];
  /** Shown full-screen once this step's last question is answered, before
   * onSectionComplete fires. Omit for the final step (what_matters), which
   * hands off straight into ThinkingBridge instead of a redundant beat. */
  transitionMessage?: string;
  backHref: string | null;
  onSectionComplete: () => void;
}

export default function StepQuestionForm({
  section,
  sectionLabel,
  initialAnswers,
  initialSkipped,
  priorProfileEntries,
  transitionMessage,
  backHref,
  onSectionComplete,
}: StepQuestionFormProps) {
  const questions = questionsInSection(section);

  const [answers, setAnswers] = useState<QuestionnaireAnswers>(initialAnswers);
  const [skipped, setSkipped] = useState<Set<string>>(new Set(initialSkipped));
  // Re-entering an already-completed step (browser Back, then forward again)
  // should show everything settled rather than restart at question 1 --
  // walk forward past whatever's already answered.
  const [progressIndex, setProgressIndex] = useState(() => {
    let i = 0;
    while (i < questions.length) {
      const q = questions[i];
      const stillNeedsAnswer =
        isQuestionVisible(q, initialAnswers) &&
        q.required &&
        !isAnswerComplete(q, initialAnswers[q.id]) &&
        !initialSkipped.includes(q.id);
      if (stillNeedsAnswer) break;
      i++;
    }
    return i;
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const activeRef = useRef<HTMLDivElement>(null);

  const settled = questions.slice(0, progressIndex).filter((q) => isQuestionVisible(q, answers));
  const active = progressIndex < questions.length ? questions[progressIndex] : null;
  const allDone = progressIndex >= questions.length;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [progressIndex, editingId]);

  // Same conditional-visibility walk-forward as the old single-page flow,
  // scoped to this section's own question list.
  useEffect(() => {
    setAnswers((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const q of questions) {
        if (q.id in next && !isQuestionVisible(q, prev)) {
          delete next[q.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setProgressIndex((i) => {
      let advanced = i;
      while (advanced < questions.length && !isQuestionVisible(questions[advanced], answers)) advanced++;
      return advanced === i ? i : advanced;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, progressIndex]);

  function finishIfDone(nextAnswers: QuestionnaireAnswers, nextSkipped: Set<string>) {
    saveAnswers(nextAnswers, Array.from(nextSkipped));
    if (transitionMessage) {
      setTransitioning(true);
    } else {
      onSectionComplete();
    }
  }

  function commitActive(question: QuestionDef, value: string | string[]) {
    const nextAnswers = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);
    if (question.type !== "multiAny" && isAnswerComplete(question, value)) {
      window.setTimeout(() => {
        // Computed from the closed-over progressIndex rather than a
        // functional setState updater -- calling finishIfDone (which can
        // call router.push) from inside a setState updater triggers a real
        // React warning/violation ("Cannot update a component while
        // rendering a different component"), since updater functions run
        // during React's own render/commit work. Safe here because each of
        // these handlers fires from a single discrete user action, not a
        // rapid-fire sequence that could race a stale `progressIndex`.
        const next = progressIndex + 1;
        setProgressIndex(next);
        if (next >= questions.length) finishIfDone(nextAnswers, skipped);
      }, 550);
    }
  }

  function confirmMultiAny() {
    const next = progressIndex + 1;
    setProgressIndex(next);
    if (next >= questions.length) finishIfDone(answers, skipped);
  }

  function commitEdit(question: QuestionDef, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setSkipped((prev) => {
      if (!prev.has(question.id)) return prev;
      const next = new Set(prev);
      next.delete(question.id);
      return next;
    });
    if (question.type !== "multiAny" && isAnswerComplete(question, value)) {
      window.setTimeout(() => setEditingId(null), 550);
    }
  }

  function skipActive(question: QuestionDef) {
    const nextSkipped = new Set(skipped).add(question.id);
    setSkipped(nextSkipped);
    const nextAnswers = { ...answers };
    delete nextAnswers[question.id];
    setAnswers(nextAnswers);
    const next = progressIndex + 1;
    setProgressIndex(next);
    if (next >= questions.length) finishIfDone(nextAnswers, nextSkipped);
  }

  function continueManually() {
    saveAnswers(answers, Array.from(skipped));
    onSectionComplete();
  }

  const thisStepEntries = settled
    .filter((q) => !skipped.has(q.id) && answers[q.id] !== undefined)
    .map((q) => ({ prompt: q.prompt, value: summarizeAnswer(q, answers[q.id], answers) }));
  const profileEntries = [...priorProfileEntries, ...thisStepEntries];

  if (transitioning && transitionMessage) {
    return <StepTransition message={transitionMessage} onDone={onSectionComplete} />;
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-paper/90 px-4 py-3 backdrop-blur sm:px-6">
        {backHref ? (
          <a
            href={backHref}
            aria-label="Back to previous step"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-navy-50"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </a>
        ) : (
          <div className="h-9 w-9" />
        )}
        <p className="font-display text-sm font-semibold text-ink-soft">{sectionLabel}</p>
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          aria-label="What we know about you"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-navy-50 lg:hidden"
        >
          <PanelRightOpen className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="hidden w-9 lg:block" />
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:py-12">
        <div className="min-w-0 flex-1 space-y-8">
          {settled.map((q) => {
            const isEditing = editingId === q.id;
            const wasSkipped = skipped.has(q.id);
            return (
              <div key={q.id}>
                {isEditing ? (
                  <div className="rounded-[20px] border border-navy-200 bg-navy-50/40 p-4">
                    <QuestionCard
                      question={q}
                      value={answers[q.id]}
                      answers={answers}
                      onChange={(v) => commitEdit(q, v)}
                      onConfirm={q.type === "multiAny" ? () => setEditingId(null) : undefined}
                      compact
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingId(q.id)}
                    className="group flex w-full items-start justify-between gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-navy-50/60"
                  >
                    <div>
                      <p className="text-sm text-ink-faint">{q.prompt}</p>
                      <p className="mt-0.5 text-sm font-medium text-ink">
                        {wasSkipped ? "Skipped" : summarizeAnswer(q, answers[q.id], answers)}
                      </p>
                    </div>
                    <span className="mt-1 flex items-center gap-1 text-xs text-ink-faint opacity-0 transition group-hover:opacity-100">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Edit
                    </span>
                  </button>
                )}
              </div>
            );
          })}

          {active && (
            <div ref={activeRef}>
              <QuestionCard
                question={active}
                value={answers[active.id]}
                answers={answers}
                onChange={(v) => commitActive(active, v)}
                onConfirm={active.type === "multiAny" ? () => confirmMultiAny() : undefined}
              />
              {!active.required && active.type !== "multiAny" && (
                <button
                  type="button"
                  onClick={() => skipActive(active)}
                  className="ml-12 mt-3 text-sm text-ink-faint underline decoration-dotted underline-offset-4 hover:text-ink-soft"
                >
                  Skip — I don't have a preference
                </button>
              )}
            </div>
          )}

          {allDone && (
            <div className="animate-fade-up ml-12">
              <p className="text-ink-soft">Already answered — you're set for this step.</p>
              <button
                type="button"
                onClick={continueManually}
                className="mt-4 rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-950 active:scale-95"
              >
                Continue
              </button>
            </div>
          )}
        </div>

        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24">
            <ProfilePanel entries={profileEntries} />
          </div>
        </aside>
      </div>

      {profileOpen && (
        <div className="fixed inset-0 z-20 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setProfileOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-paper-raised p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-ink">What we know about you</p>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-navy-50"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            <ProfilePanel entries={profileEntries} hideTitle />
          </div>
        </div>
      )}
    </div>
  );
}

function ProfilePanel({ entries, hideTitle }: { entries: ProfileEntry[]; hideTitle?: boolean }) {
  if (entries.length === 0) {
    return (
      <div>
        {!hideTitle && <p className="mb-3 font-display font-semibold text-ink">What we know about you</p>}
        <p className="text-sm text-ink-faint">Your answers will build up here as you go.</p>
      </div>
    );
  }
  return (
    <div>
      {!hideTitle && <p className="mb-3 font-display font-semibold text-ink">What we know about you</p>}
      <ul className="space-y-3">
        {entries.map((e) => (
          <li key={e.prompt} className="animate-fade-up border-l-2 border-navy-100 pl-3">
            <p className="text-xs text-ink-faint">{e.prompt}</p>
            <p className="text-sm font-medium text-ink">{e.value}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
