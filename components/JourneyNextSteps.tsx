import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { stagesAfter, type JourneyStageId } from "../lib/journey";

export function SoonBadge() {
  return (
    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
      Coming soon
    </span>
  );
}

/**
 * "What's next on your journey": the later buying stages and our tool for
 * each, shown at the end of a tool's result so every feature hands the user
 * on to the next one. Tools not built yet are shown, labelled, but not linked.
 */
export default function JourneyNextSteps({ current }: { current: JourneyStageId }) {
  const stages = stagesAfter(current);
  if (stages.length === 0) return null;
  return (
    <section className="mt-10 rounded-[20px] border border-border bg-paper-raised/70 p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-ink">What&apos;s next on your car journey</h2>
      <p className="mt-1 text-sm text-ink-soft">The same review data, there for you at every step until the keys are in your hand.</p>
      <ol className="mt-4 space-y-3">
        {stages.map((stage) =>
          stage.tools.map((tool) => {
            const body = (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-rust/10">
                  <tool.icon className="h-[18px] w-[18px] text-accent-rust-soft" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{stage.label}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                    {tool.title}
                    {!tool.href && <SoonBadge />}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{tool.sub}</span>
                </span>
                {tool.href && <ArrowRight className="mt-6 h-4 w-4 shrink-0 text-accent-rust-soft" strokeWidth={2} />}
              </>
            );
            return (
              <li key={tool.id}>
                {tool.href ? (
                  <Link href={tool.href} className="flex gap-3 rounded-xl p-2 -m-2 transition hover:bg-charcoal-800/40">
                    {body}
                  </Link>
                ) : (
                  <div className="flex gap-3">{body}</div>
                )}
              </li>
            );
          }),
        )}
      </ol>
    </section>
  );
}
