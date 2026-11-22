import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";

/**
 * "Compare my cars" call to action near the top of review and head-to-head
 * pages, so a reader stuck between cars gets a personal answer before
 * scrolling the whole page. Pre-picks the cars on /decide.
 */
export default function DecideCta({
  title,
  sub,
  carIds,
  button,
  rivals = [],
}: {
  title: string;
  sub: string;
  /** Cars to pre-pick on /decide. */
  carIds: string[];
  button: string;
  /** One-tap matchups: pre-picks these cars alongside carIds. */
  rivals?: { carId: string; model: string }[];
}) {
  const href = (ids: string[]) => `/decide?cars=${ids.join(",")}`;
  return (
    <aside className="mt-6 rounded-[14px] border border-accent-rust/30 bg-wash px-5 py-5 sm:px-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper text-accent-rust">
          <Scale className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-snug text-ink">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{sub}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={href(carIds)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-rust px-5 py-2.5 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
        >
          {button} <ArrowRight className="h-4 w-4" />
        </Link>
        {rivals.map((r) => (
          <Link
            key={r.carId}
            href={href([...carIds, r.carId])}
            className="rounded-full border border-border bg-paper px-4 py-2 text-sm font-medium text-ink transition hover:border-accent-rust/50"
          >
            vs {r.model}
          </Link>
        ))}
      </div>
    </aside>
  );
}
