"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Car, ChevronRight, GitCompareArrows, ShieldCheck, Sparkles } from "lucide-react";
import { useMe } from "../lib/auth/useMe";
import { BRAND_LOGOS } from "../lib/brandLogos";
import { JOURNEY, type JourneyTool } from "../lib/journey";
import NightDriveScene from "./NightDriveScene";
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
 * tiles, then swipeable rows of real cars and rival comparisons. Desktop
 * keeps the original hero (see LandingScreen).
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
      <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight text-ink">Which car should you buy?</h1>

      <FindCard onStart={onStart} claims={stats.claims} />

      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
        <TrustPill icon={ShieldCheck} text="No dealer commissions" />
        <TrustPill icon={Sparkles} text={`${Math.floor(stats.videos / 10) * 10}+ reviews read`} />
        <TrustPill icon={Car} text={`${stats.cars} cars covered`} />
      </div>

      <JourneyTimeline onStart={onStart} />

      <h2 className="mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-faint">Research on your own</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tile href="/cars" icon={Car} title="Car reviews" sub="What owners really say" tint="rgba(124,201,154,0.14)" color="#7cc99a" />
        <Tile
          href="/compare"
          icon={GitCompareArrows}
          title="Compare two cars"
          sub="Head to head, honestly"
          tint="rgba(127,182,224,0.14)"
          color="#8fc1e6"
        />
        <Tile
          href="/guides"
          icon={BookOpen}
          title="Buying guides"
          sub="First car? Start here"
          tint="rgba(226,131,124,0.14)"
          color="#eba29c"
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
      className="find-card relative mt-5 block w-full overflow-hidden rounded-[28px] text-left transition active:scale-[0.98]"
    >
      <span className="relative mt-12 block aspect-[3/2] w-full">
        <NightDriveScene priority />
        {/* Blend the photo's dark sky into the card above, and fade into solid dark below. */}
        <span className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-t from-transparent to-[#120d07]" />
        <span className="absolute inset-x-0 -bottom-px h-2/5 bg-gradient-to-b from-transparent via-[#120d07]/70 to-[#120d07]" />
      </span>
      <span className="absolute left-5 top-5 z-10 max-w-[13.5rem]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-accent-rust-soft backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
          Takes 3 minutes
        </span>
        <span className="mt-3 block font-display text-[26px] font-semibold leading-[1.15] text-ink drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          Find the car that fits your life
        </span>
      </span>

      <span className="relative z-10 block px-5 pb-5">
        <span className="block text-sm leading-relaxed text-charcoal-100/85">
          11 easy questions. 2 or 3 cars, each backed by {(Math.floor(claims / 100) * 100).toLocaleString("en-IN")}+ points from real reviews.
        </span>
        <span className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-rust px-5 py-3 text-[15px] font-semibold text-charcoal-950 shadow-glow-sm">
            Find my car
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-xs text-charcoal-100/70">Free, no sign-up</span>
        </span>
      </span>
    </button>
  );
}

function TrustPill({ icon: Icon, text }: { icon: typeof Car; text: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-paper-raised/80 px-3 py-1.5 text-xs text-ink-soft">
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
  tint,
  color,
  badge,
  wide,
}: {
  href: string;
  icon: typeof Car;
  title: string;
  sub: string;
  tint: string;
  color: string;
  badge?: string;
  wide?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative flex rounded-3xl border border-border p-4 transition active:scale-[0.97] ${
        wide ? "col-span-2 items-center gap-4" : "min-h-[124px] flex-col justify-between"
      }`}
      style={{ background: `linear-gradient(150deg, ${tint}, rgba(23,20,15,0.6) 70%)` }}
    >
      {badge && (
        <span className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: tint, color }}>
          {badge}
        </span>
      )}
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: tint }}>
        <Icon className="h-6 w-6" style={{ color }} strokeWidth={1.9} />
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
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint">With you at every step</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        From choosing the car to its first service, every tool runs on real owner and expert reviews.
      </p>
      <ol className="relative mt-4">
        <span aria-hidden className="absolute bottom-6 left-[15px] top-4 w-px bg-gradient-to-b from-accent-rust/60 via-border to-transparent" />
        {JOURNEY.map((stage) => (
          <li key={stage.id} className="relative flex gap-3 pb-5 last:pb-0">
            <span className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent-rust/60 bg-paper font-mono text-[11px] font-medium text-accent-rust-soft">
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
  const cls = `flex w-full gap-3 rounded-2xl border p-3 text-left ${
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
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint">{title}</h2>
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
      className="flex w-[68%] shrink-0 snap-start flex-col rounded-3xl border border-border bg-paper-raised p-4 transition active:scale-[0.97]"
    >
      <span className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-charcoal-50 p-2">
          {logo ? (
            <Image src={logo} alt="" width={32} height={32} className="h-full w-full object-contain" />
          ) : (
            <Car className="h-5 w-5 text-charcoal-900" />
          )}
        </span>
        <span className="rounded-full bg-positive-bg px-2.5 py-1 text-[11px] font-semibold text-positive">
          {car.sourceCount} reviews
        </span>
      </span>
      <span className="mt-4 block font-display text-lg font-semibold leading-tight text-ink">{car.name}</span>
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
