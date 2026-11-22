import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * "Compare my cars" poster near the top of review and head-to-head pages, so
 * a reader stuck between cars gets a personal answer before scrolling the
 * whole page. Photo: the home page's couple unsure in a showroom (our own
 * AI image, no badges); the thought bubble leads to the couple, never to a
 * car, so no car in the photo stands in for a named model. Pre-picks the
 * cars on /decide.
 */
export default function DecideCta({
  question,
  title,
  sub,
  carIds,
  button,
  rivals = [],
}: {
  /** Thought-bubble text over the photo, e.g. "Baleno or Swift?". */
  question: string;
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
    <aside className="bg-stage mt-6 overflow-hidden rounded-[14px] shadow-[0_8px_28px_rgba(30,68,112,0.18)] sm:flex">
      <div className="relative aspect-[16/9] sm:aspect-auto sm:w-[44%] sm:shrink-0">
        <Image
          src="/redesign/showroom.webp"
          alt="A couple in a car showroom, unsure which car to pick"
          fill
          sizes="(min-width: 640px) 300px, 100vw"
          className="object-cover"
          style={{ objectPosition: "50% 30%" }}
        />
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#27548a]/45 sm:bg-gradient-to-r sm:to-[#27548a]/60" />
        <span className="absolute left-3 top-3 max-w-[70%] rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-[#222] shadow-md">
          {question}
          <span aria-hidden className="absolute -bottom-3 right-3 h-3 w-3 rounded-full bg-white shadow" />
          <span aria-hidden className="absolute -bottom-6 right-0 h-2 w-2 rounded-full bg-white shadow" />
        </span>
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">New · Compare my cars</p>
        <p className="mt-1.5 font-display text-xl font-bold leading-snug text-ink sm:text-2xl">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{sub}</p>
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
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-white/10"
            >
              vs {r.model}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
