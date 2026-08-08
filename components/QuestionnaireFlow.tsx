"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pencil, PanelRightOpen, X } from "lucide-react";
import { QUESTIONS, SECTIONS, isAnswerComplete, type QuestionDef, type SectionId } from "../lib/questions";
import type { QuestionnaireAnswers } from "../lib/scoring/questionnaireWeights";
import QuestionCard from "./QuestionCard";

interface QuestionnaireFlowProps {
  onSubmit: (answers: QuestionnaireAnswers) => void;
}

function summarize(question: QuestionDef, value: string | string[]): string {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((v) => question.options.find((o) => o.value === v)?.label ?? v)
    .join(" + ");
}

export default function QuestionnaireFlow({ onSubmit }: QuestionnaireFlowProps) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [progressIndex, setProgressIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const activeRef = useRef<HTMLDivElement>(null);

  const settled = QUESTIONS.slice(0, progressIndex);
  const active = progressIndex < QUESTIONS.length ? QUESTIONS[progressIndex] : null;
  const allDone = progressIndex >= QUESTIONS.length;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [progressIndex, editingId]);

  function commitActive(question: QuestionDef, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    if (isAnswerComplete(question, value)) {
      window.setTimeout(() => setProgressIndex((i) => i + 1), 550);
    }
  }

  function commitEdit(question: QuestionDef, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setSkipped((prev) => {
      if (!prev.has(question.id)) return prev;
      const next = new Set(prev);
      next.delete(question.id);
      return next;
    });
    if (isAnswerComplete(question, value)) {
      window.setTimeout(() => setEditingId(null), 550);
    }
  }

  function skipActive(question: QuestionDef) {
    setSkipped((prev) => new Set(prev).add(question.id));
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[question.id];
      return next;
    });
    setProgressIndex((i) => i + 1);
  }

  function jumpToLastEdit() {
    if (progressIndex === 0) return;
    setEditingId(QUESTIONS[progressIndex - 1].id);
  }

  const profileEntries = settled
    .filter((q) => !skipped.has(q.id) && answers[q.id] !== undefined)
    .map((q) => ({ prompt: q.prompt, value: summarize(q, answers[q.id]) }));

  let lastRenderedSection: SectionId | null = null;

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-paper/90 px-4 py-3 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={jumpToLastEdit}
          disabled={progressIndex === 0}
          aria-label="Edit previous answer"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-navy-50 disabled:opacity-0"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <p className="text-sm font-medium text-ink-soft">
          {allDone ? "All done" : SECTIONS.find((s) => s.id === active?.section)?.label}
        </p>
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
          {settled.map((q, idx) => {
            const isEditing = editingId === q.id;
            const wasSkipped = skipped.has(q.id);
            const showSectionHeader = q.section !== lastRenderedSection;
            lastRenderedSection = q.section;

            return (
              <div key={q.id}>
                {showSectionHeader && <SectionDivider label={SECTIONS.find((s) => s.id === q.section)!.label} />}
                {isEditing ? (
                  <div className="rounded-2xl border border-navy-200 bg-navy-50/40 p-4">
                    <QuestionCard
                      question={q}
                      value={answers[q.id]}
                      onChange={(v) => commitEdit(q, v)}
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
                        {wasSkipped ? "Skipped" : summarize(q, answers[q.id])}
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
              {active.section !== lastRenderedSection && <SectionDivider label={SECTIONS.find((s) => s.id === active.section)!.label} />}
              <QuestionCard question={active} value={answers[active.id]} onChange={(v) => commitActive(active, v)} />
              {!active.required && (
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
              <p className="text-ink-soft">That's everything we need.</p>
              <button
                type="button"
                onClick={() => onSubmit(answers)}
                className="mt-4 rounded-full bg-navy-800 px-8 py-4 text-base font-medium text-white shadow-sm transition hover:bg-navy-900 active:scale-[0.98]"
              >
                Show my recommendations
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

function SectionDivider({ label }: { label: string }) {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
  );
}

function ProfilePanel({ entries, hideTitle }: { entries: { prompt: string; value: string }[]; hideTitle?: boolean }) {
  if (entries.length === 0) {
    return (
      <div>
        {!hideTitle && <p className="mb-3 font-medium text-ink">What we know about you</p>}
        <p className="text-sm text-ink-faint">Your answers will build up here as you go.</p>
      </div>
    );
  }
  return (
    <div>
      {!hideTitle && <p className="mb-3 font-medium text-ink">What we know about you</p>}
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
