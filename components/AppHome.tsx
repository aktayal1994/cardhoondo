"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Car, ChevronRight, GitCompareArrows, ReceiptIndianRupee, ShieldCheck, Sparkles } from "lucide-react";
import { useMe } from "../lib/auth/useMe";
import { BRAND_LOGOS } from "../lib/brandLogos";

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

      <h2 className="mt-8 text-[13px] font-semibold uppercase tracking-wider text-ink-faint">More ways we help</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tile
          href="/quotation"
          icon={ReceiptIndianRupee}
          title="Check a dealer quote"
          sub="Find hidden charges"
          tint="rgba(226,152,74,0.16)"
          color="#f0be80"
          badge="Save ₹₹"
        />
        <Tile href="/cars" icon={Car} title="Car reviews" sub="What owners really say" tint="rgba(124,201,154,0.14)" color="#7cc99a" />
        <Tile
          href="/compare"
          icon={GitCompareArrows}
          title="Compare two cars"
          sub="Head to head, honestly"
          tint="rgba(127,182,224,0.14)"
          color="#8fc1e6"
        />
        <Tile href="/guides" icon={BookOpen} title="Buying guides" sub="First car? Start here" tint="rgba(226,131,124,0.14)" color="#eba29c" />
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
      className="find-card relative mt-5 block w-full overflow-hidden rounded-[28px] p-5 text-left transition active:scale-[0.98]"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[11px] font-semibold text-accent-rust-soft">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
        Takes 3 minutes
      </span>
      <span className="mt-3 block max-w-[15rem] font-display text-[26px] font-semibold leading-[1.15] text-ink">
        Find the car that fits your life
      </span>
      <span className="mt-2 block max-w-[16rem] text-sm leading-relaxed text-charcoal-100/80">
        11 easy questions. 2 or 3 cars, each backed by {(Math.floor(claims / 100) * 100).toLocaleString("en-IN")}+ points from real reviews.
      </span>

      <MiniCar />

      <span className="relative mt-1 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent-rust px-5 py-3 text-[15px] font-semibold text-charcoal-950 shadow-glow-sm">
          Find my car
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <span className="text-xs text-charcoal-100/70">Free, no sign-up</span>
      </span>
    </button>
  );
}

/** A little SUV cruising along a moving road, so the card feels alive. */
function MiniCar() {
  return (
    <span className="relative mt-3 block h-20" aria-hidden>
      <span className="road-dash absolute inset-x-0 bottom-3 h-[2px] opacity-60" />
      <svg viewBox="-60 0 260 70" className="animate-car-drive absolute bottom-3 right-0 h-[72px] w-auto">
        <defs>
          <linearGradient id="mc-body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#f0be80" />
            <stop offset="1" stopColor="#c47a32" />
          </linearGradient>
          <linearGradient id="mc-beam" x1="1" x2="0" y1="0" y2="0">
            <stop offset="0" stopColor="#ffe9c4" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffe9c4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M22 39 L-60 26 L-60 56 L22 43 Z" fill="url(#mc-beam)" />
        <path
          d="M18 46 C18 38 24 34 34 33 L58 31 L78 16 C82 13 86 12 92 12 L140 12 C148 12 153 15 158 20 L172 32 C182 33 190 37 190 46 L190 52 L18 52 Z"
          fill="url(#mc-body)"
        />
        <path d="M84 18 C86 16 88 16 92 16 L120 16 L120 31 L68 31 Z" fill="#1b1309" opacity="0.85" />
        <path d="M125 16 L140 16 C146 16 150 18 154 22 L164 31 L125 31 Z" fill="#1b1309" opacity="0.85" />
        <rect x="20" y="38" width="10" height="5" rx="2" fill="#fff4dc" />
        <rect x="182" y="38" width="7" height="5" rx="2" fill="#e2837c" />
        <circle cx="52" cy="52" r="12" fill="#0f0d09" />
        <circle cx="52" cy="52" r="5" fill="#857f6d" />
        <circle cx="156" cy="52" r="12" fill="#0f0d09" />
        <circle cx="156" cy="52" r="5" fill="#857f6d" />
      </svg>
    </span>
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
}: {
  href: string;
  icon: typeof Car;
  title: string;
  sub: string;
  tint: string;
  color: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="relative flex min-h-[124px] flex-col justify-between rounded-3xl border border-border p-4 transition active:scale-[0.97]"
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
