"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Car, ChevronRight, GitCompareArrows, ShieldCheck, Sparkles } from "lucide-react";
import { useMe } from "../lib/auth/useMe";
import { BRAND_LOGOS } from "../lib/brandLogos";
import { JOURNEY, type JourneyTool } from "../lib/journey";
import { SoonBadge } from "./JourneyNextSteps";

/** What the home screen needs to know about a car (kept small: it ships to the browser). */
export interface HomeCar {
  slug: string;
  name: string;
  brand: string;
  price: string | null;
  fuels: string[];
  sourceCount: number;
}

export interface HomeComparison {
  slug: string;
  label: string;
}

/**
 * The phone home screen: an app-style dashboard instead of a marketing hero.
 * "Find my car" is the big card up top; the other features sit below as
 * tiles, then swipeable rows of real cars and rival comparisons. Wider
 * screens get the hero instead (see redesign/RedesignHome). This is also the
 * first screen of the Android app wrapper.
 */
export default function AppHome({
  onStart,
  stats,
  cars,
  comparisons,
}: {
  onStart: (location: string) => void;
  stats: { claims: number; cars: number; videos: number };
  cars: HomeCar[];
  comparisons: HomeComparison[];
}) {
  const me = useMe();
  const firstName = me.user?.name?.split(" ")[0];

  return (
    <section className="px-4 pb-8 pt-5 sm:hidden">
      <p className="text-sm text-ink-soft">{firstName ? `Hi ${firstName}, welcome back` : "Namaste! Buying a car?"}</p>
      <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.01em] text-ink">Which car should you buy?</h1>

      <FindCard onStart={onStart} claims={stats.claims} />

      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
        <TrustPill icon={ShieldCheck} text="No dealer commissions" />
        <TrustPill icon={Sparkles} text={`${Math.floor(stats.videos / 10) * 10}+ reviews read`} />
        <TrustPill icon={Car} text={`${stats.cars} cars covered`} />
      </div>

      <JourneyTimeline onStart={onStart} />

      <h2 className="mt-8 text-[18px] font-semibold text-ink">Research on your own</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tile href="/cars" icon={Car} title="Car reviews" sub="What owners really say" />
        <Tile
          href="/compare"
          icon={GitCompareArrows}
          title="Compare two cars"
          sub="Head to head, honestly"
        />
        <Tile
          href="/guides"
          icon={BookOpen}
          title="Buying guides"
          sub="First car? Start here"
          wide
        />
      </div>

      {cars.length > 0 && (
        <>
          <RowHeader title="Most reviewed cars" href="/cars" />
          <div className="-mx-4 mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
            {cars.map((c) => (
              <CarCard key={c.slug} car={c} />
            ))}
          </div>
        </>
      )}

      {comparisons.length > 0 && (
        <>
          <RowHeader title="Stuck between two?" href="/compare" />
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 no-scrollbar">
            {comparisons.map((c) => (
              <Link
                key={c.slug}
                href={`/compare/${c.slug}`}
                className="shrink-0 rounded-full border border-border bg-paper-raised px-4 py-2.5 text-sm font-medium text-ink transition active:scale-95"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function FindCard({ onStart, claims }: { onStart: (location: string) => void; claims: number }) {
  return (
    <button
      type="button"
      onClick={() => onStart("home_card")}
      className="rd-denim mt-5 block w-full overflow-hidden rounded-[20px] text-left transition active:scale-[0.98]"
    >
      <span className="block px-5 pt-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
          Takes 3 minutes
        </span>
        <span className="mt-3 block text-[26px] font-bold leading-[1.15] tracking-[-0.01em] text-white">
          Find the car that fits your life
        </span>
        <span className="mt-2 block text-sm leading-relaxed text-stage-ink-soft">
          11 easy questions. 2 or 3 cars, each backed by {(Math.floor(claims / 100) * 100).toLocaleString("en-IN")}+ points from real reviews.
        </span>
      </span>
      <span className="relative mx-5 mt-4 block aspect-[16/10] overflow-hidden rounded-[14px] bg-denim-deep">
        <Image
          src="/redesign/showroom.webp"
          alt="A couple in a showroom full of new cars, unsure which one to pick"
          fill
          priority
          sizes="(max-width: 640px) 90vw, 0px"
          className="object-cover"
          style={{ objectPosition: "50% 30%" }}
        />
      </span>
      <span className="flex items-center justify-between px-5 py-5">
        <span className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[15px] font-semibold text-denim">
          Find my car
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <span className="text-xs text-white/75">Free, no sign-up</span>
      </span>
    </button>
  );
}

function TrustPill({ icon: Icon, text }: { icon: typeof Car; text: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-wash px-3 py-1.5 text-xs font-medium text-ink">
      <Icon className="h-3.5 w-3.5 text-accent-rust" strokeWidth={2} />
      {text}
    </span>
  );
}

function Tile({
  href,
  icon: Icon,
  title,
  sub,
  wide,
}: {
  href: string;
  icon: typeof Car;
  title: string;
  sub: string;
  wide?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex rounded-[14px] border border-border bg-paper p-4 transition active:scale-[0.97] ${
        wide ? "col-span-2 items-center gap-4" : "min-h-[124px] flex-col justify-between"
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wash text-denim">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <span>
        <span className="block text-[15px] font-semibold leading-snug text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-soft">{sub}</span>
      </span>
    </Link>
  );
}

/**
 * The buying journey as a vertical timeline: one stage per step, our tool for
 * each. "Find my car" is already the hero card above, so here it is a compact
 * "start here" row; tools not built yet are labelled, not linked.
 */
function JourneyTimeline({ onStart }: { onStart: (location: string) => void }) {
  return (
    <section className="mt-8">
      <h2 className="text-[18px] font-semibold text-ink">With you at every step</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        From choosing the car to taking delivery, every tool runs on real owner and expert reviews.
      </p>
      <ol className="relative mt-4">
        <span aria-hidden className="absolute bottom-6 left-[15px] top-4 w-px bg-gradient-to-b from-accent-rust/60 via-border to-transparent" />
        {JOURNEY.map((stage) => (
          <li key={stage.id} className="relative flex gap-3 pb-5 last:pb-0">
            <span className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent-rust/60 bg-paper text-[12px] font-semibold text-accent-rust-soft">
              {stage.step}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">
                {stage.label} <span className="font-normal text-ink-faint">· {stage.question}</span>
              </p>
              <div className="mt-2 space-y-2">
                {stage.tools.map((tool) => (
                  <JourneyToolRow key={tool.id} tool={tool} onStart={onStart} />
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function JourneyToolRow({ tool, onStart }: { tool: JourneyTool; onStart: (location: string) => void }) {
  const live = tool.href !== null;
  const body = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${live ? "bg-accent-rust/15" : "bg-charcoal-800/70"}`}>
        <tool.icon className={`h-[18px] w-[18px] ${live ? "text-accent-rust-soft" : "text-ink-faint"}`} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`text-[15px] font-semibold ${live ? "text-ink" : "text-ink-soft"}`}>{tool.title}</span>
          {tool.hero && <span className="rounded-full bg-accent-rust/15 px-2 py-0.5 text-[10px] font-bold text-accent-rust-soft">Start here</span>}
          {!live && <SoonBadge />}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{tool.sub}</span>
      </span>
      {live && <ChevronRight className="h-4 w-4 shrink-0 self-center text-ink-faint" strokeWidth={2} />}
    </>
  );
  const cls = `flex w-full gap-3 rounded-[14px] border p-3 text-left ${
    live ? "border-border bg-paper-raised transition active:scale-[0.98]" : "border-dashed border-border"
  }`;
  if (tool.hero) {
    return (
      <button type="button" onClick={() => onStart("home_journey")} className={cls}>
        {body}
      </button>
    );
  }
  if (tool.href) {
    return (
      <Link href={tool.href} className={cls}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

function RowHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <h2 className="text-[18px] font-semibold text-ink">{title}</h2>
      <Link href={href} className="flex items-center text-sm font-medium text-accent-rust-soft">
        See all
        <ChevronRight className="h-4 w-4" strokeWidth={2} />
      </Link>
    </div>
  );
}

function CarCard({ car }: { car: HomeCar }) {
  const logo = BRAND_LOGOS[car.brand];
  return (
    <Link
      href={`/cars/${car.slug}`}
      className="flex w-[68%] shrink-0 snap-start flex-col rounded-[14px] border border-border bg-paper-raised p-4 transition active:scale-[0.97]"
    >
      <span className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-charcoal-50 p-2">
          {logo ? (
            <Image src={logo} alt="" width={32} height={32} className="h-full w-full object-contain" />
          ) : (
            <Car className="h-5 w-5 text-ink-faint" />
          )}
        </span>
        <span className="rounded-full bg-positive-bg px-2.5 py-1 text-[11px] font-semibold text-positive">
          {car.sourceCount} reviews
        </span>
      </span>
      <span className="mt-4 block text-lg font-semibold leading-tight text-ink">{car.name}</span>
      <span className="mt-1 block text-sm text-ink-soft">{car.price ?? "Price not listed"}</span>
      <span className="mt-3 flex flex-wrap gap-1.5">
        {car.fuels.map((f) => (
          <span key={f} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-ink-faint">
            {f}
          </span>
        ))}
      </span>
    </Link>
  );
}
