"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValue,
  animate,
  AnimatePresence,
} from "motion/react";
import {
  ShieldCheck,
  Ban,
  MessageCircleQuestion,
  ListChecks,
  ScanSearch,
  Sparkles,
  PhoneCall,
  Mail,
  ArrowRight,
  ArrowDown,
  X,
  Check,
  ChevronDown,
  Quote,
} from "lucide-react";
import { CookieSettingsButton } from "./CookieBanner";
import AccountMenu from "./AccountMenu";
import MobileMenu from "./MobileMenu";
import WelcomeBackStrip from "./WelcomeBackStrip";
import AppHome, { type HomeCar, type HomeComparison } from "./AppHome";
import NightDriveScene from "./NightDriveScene";
import { SoonBadge } from "./JourneyNextSteps";
import { JOURNEY, type JourneyTool } from "../lib/journey";

/**
 * "Nightdrive" -- a dark, cinematic scroll-driven redesign of the earlier
 * warm-paper "evidence dossier" landing page, inspired by the pacing and
 * restraint of razorpay.com/foundation-model (staged scroll reveals, a
 * near-black canvas, big serif statements, generous negative space) but
 * built entirely with CSS + Framer Motion -- no WebGL/3D canvas, so it stays
 * fast and reliable on mid-range Indian Android phones. The car's own
 * night-driving metaphor replaces Razorpay's own blue network-globe motif:
 * one glowing amber accent is the thing that finds you in the dark, the
 * same way a recommendation cuts through fifty conflicting opinions. Every
 * section keeps its original copy/positioning (already SEO- and
 * research-tuned) -- only the visual and motion language changed.
 */

const FAQS = [
  {
    q: "How does CarDhoondo recommend a car?",
    a: "You answer 11 quick questions about how you actually drive: road conditions, family size, budget, and what matters most to you. We match your answers against a database of facts extracted from real ownership and expert car reviews, and recommend the 2-3 cars with the strongest evidence behind them for your specific situation.",
  },
  {
    q: "Is CarDhoondo really free? How do you make money?",
    a: "Yes. Using CarDhoondo to find your car is free, with no signup required. We don't take commissions from dealers or manufacturers for a recommendation, that's the whole point. Once we're bigger, we may earn a small, clearly-disclosed referral fee on things like financing or insurance you choose to buy afterward, never on which car gets recommended to you.",
  },
  {
    q: "How is this different from CarDekho or CarWale?",
    a: "CarDekho and CarWale are catalogs: great for browsing specs, but they show you hundreds of cars and leave the choosing to you. CarDhoondo asks about your life first and narrows it down to 2-3 cars, with the actual review evidence for why each one fits, not just a spec sheet.",
  },
  {
    q: "Do I need to create an account or share my details to get a recommendation?",
    a: "You don't need an account. You do give us your name, pincode and mobile number at the start: the pincode tailors the recommendation to your city, and your name and number let us get in touch about your recommendations and ask for feedback so we can improve. We don't share them with car dealers, and you can ask us to delete them any time. It takes about 3 minutes.",
  },
  {
    q: "What if a recommended car doesn't have enough review data?",
    a: "We say so, honestly. If a car doesn't have enough real review evidence yet, we tell you that directly instead of guessing. We'd rather admit a gap than fake confidence.",
  },
];

const PRIMARY_CTA = "Find my car";

interface SiteStats {
  claims: number;
  cars: number;
  videos: number;
}

// Last-known-good numbers, shown instantly while the real fetch resolves
// (and kept if it fails) -- this is exactly the kind of value that drifted
// stale once already (hardcoded 4,036 written Aug 22, real count well past
// it by September), so it's now a floor/fallback, never the source of truth.
const FALLBACK_STATS: SiteStats = { claims: 4036, cars: 59, videos: 558 };

/** Fetches live claim/car/video counts from /api/stats once on mount.
 * Marketing copy that cites these numbers should never go stale again the
 * way the old hardcoded 4,036 did. */
function useLiveStats(): SiteStats {
  const [stats, setStats] = useState<SiteStats>(FALLBACK_STATS);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("stats fetch failed"))))
      .then((data: Partial<SiteStats>) => {
        if (
          !cancelled &&
          typeof data.claims === "number" &&
          typeof data.cars === "number" &&
          typeof data.videos === "number"
        ) {
          setStats({ claims: data.claims, cars: data.cars, videos: data.videos });
        }
      })
      .catch(() => {
        /* keep the fallback -- a marketing stat rendering slightly stale
           beats the section breaking if /api/stats or Supabase is down */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return stats;
}

/** Rounds down to a clean, safely-an-understatement number for the
 * shorter "4,000+" style teaser copy -- the exact count still appears
 * verbatim in the stat card below it. */
function approxFloor(n: number, step = 100): number {
  return Math.floor(n / step) * step;
}

export default function LandingScreen({
  onStart,
  cars = [],
  comparisons = [],
}: {
  onStart: (location: string) => void;
  cars?: HomeCar[];
  comparisons?: HomeComparison[];
}) {
  const stats = useLiveStats();
  return (
    <main className="relative min-h-screen overflow-x-clip bg-paper text-ink">
      <NightCanvas />
      <div className="relative z-10">
        <Nav onStart={onStart} />
        {/* Space is reserved by CSS (.welcome-slot) only for browsers that recently had a session. */}
        <div className="welcome-slot">
          <WelcomeBackStrip onStart={onStart} />
        </div>
        {/* Phones get an app-style home screen; the cinematic hero is desktop only. */}
        <AppHome onStart={onStart} stats={stats} cars={cars} comparisons={comparisons} />
        <div className="hidden sm:block">
          <Hero onStart={onStart} claims={stats.claims} />
          <Journey onStart={onStart} claims={stats.claims} />
        </div>
        <TrustAndStats stats={stats} />
        <CaseIndex carsCount={stats.cars} />
        <HowItWorks onStart={onStart} />
        <EvidencePreview />
        <WhyCarDhoondo />
        <AboutUs stats={stats} />
        <Faq />
        <Contact onStart={onStart} />
        <Footer />
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------------- */
/* Fixed backdrop: a night sky the whole page scrolls over                 */
/* ---------------------------------------------------------------------- */

function NightCanvas() {
  return (
    <div className="starfield ambient-glow fixed inset-0 z-0" aria-hidden />
  );
}

/* ---------------------------------------------------------------------- */
/* Shared primitives                                                       */
/* ---------------------------------------------------------------------- */

/** The primary CTA everywhere on the page: a glowing amber pill, the one
 * loud element on an otherwise dark, quiet canvas -- the "headlight" that
 * always tells you where to go next. */
function GlowButton({
  onClick,
  href,
  children,
  className = "",
  size = "md",
}: {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  className?: string;
  size?: "md" | "sm";
}) {
  const padding = size === "sm" ? "px-5 py-2.5 text-sm" : "px-7 py-3.5 text-[15px]";
  const classes = `group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-accent-rust font-semibold text-charcoal-950 shadow-glow-sm transition hover:brightness-110 ${padding} ${className}`;
  const content = (
    <>
      {children}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" strokeWidth={2.5} />
    </>
  );
  if (href) {
    return (
      <motion.span whileTap={{ scale: 0.96 }} className="inline-block">
        <Link href={href} className={classes}>
          {content}
        </Link>
      </motion.span>
    );
  }
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick} className={classes}>
      {content}
    </motion.button>
  );
}

/** Counts up from 0 to `value` once the number scrolls into view. Writes
    directly to the DOM node instead of React state, since this changes on
    every animation frame -- a state update per frame would re-render the
    whole tree and stutter on mobile. */
function CountUpNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;
    if (reduce || !isInView) {
      ref.current.textContent = value.toLocaleString("en-IN");
      return;
    }
    const controls = animate(0, value, {
      duration: 1.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        if (ref.current) ref.current.textContent = Math.round(latest).toLocaleString("en-IN");
      },
    });
    return () => controls.stop();
  }, [isInView, reduce, value]);

  return (
    <p ref={ref} className={className}>
      0
    </p>
  );
}

/** A plain scroll-reveal lift, used for section headers and list content. */
function RevealOnScroll({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** A small circular "verdict stamp" mark, hand-drawn as SVG, used wherever
 * the page wants to visually assert "this has been checked." */
function VerdictStamp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="43" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.9" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 4" opacity="0.55" />
      <path d="M30 51 L43 64 L71 34" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StampReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  return (
    <div ref={ref} className={`${className ?? ""} ${reduce || isInView ? "animate-stamp-in" : "opacity-0"}`}>
      {children}
    </div>
  );
}

/** Splits a heading into words and reveals them with a staggered blur-fade,
 * the page's signature "cinematic statement" motion -- used for every major
 * section headline, not just the hero. */
function StaggerHeading({
  text,
  as: Tag = "h2",
  className,
  instant = false,
}: {
  text: string;
  as?: "h1" | "h2";
  className?: string;
  /** Render fully visible in the server HTML, no reveal. Used for the hero:
   * ad visitors on slow in-app browsers (Instagram on Android) saw a near-black
   * screen until JS hydrated, and ~99% left before the button appeared (GA, 3 Oct 2026). */
  instant?: boolean;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  if (reduce || instant) return <Tag className={className}>{text}</Tag>;
  return (
    <Tag className={className}>
      <motion.span
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.6 }}
        transition={{ staggerChildren: 0.045 }}
        className="inline"
      >
        {words.map((w, i) => (
          <motion.span
            key={i}
            variants={{
              hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
              show: { opacity: 1, y: 0, filter: "blur(0px)" },
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block"
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  );
}

/* ---------------------------------------------------------------------- */
/* Nav                                                                     */
/* ---------------------------------------------------------------------- */

function Brandmark({ textClass = "text-ink" }: { textClass?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image src="/cardhoondo-icon.png" alt="" width={237} height={237} priority className="h-7 w-7 sm:h-8 sm:w-8" />
      <span className={`font-display text-lg font-bold tracking-tight ${textClass}`}>CarDhoondo</span>
    </span>
  );
}

function Nav({ onStart }: { onStart: (location: string) => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" aria-label="CarDhoondo home">
          <Brandmark />
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-soft lg:flex">
          <a href="#how-it-works" className="transition hover:text-ink">
            How it works
          </a>
          <Link href="/cars" className="transition hover:text-ink">
            Car reviews
          </Link>
          <Link href="/guides" className="transition hover:text-ink">
            Guides
          </Link>
          <Link href="/quotation" className="transition hover:text-ink">
            Check my quote
          </Link>
          <a href="#about" className="transition hover:text-ink">
            About
          </a>
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          <AccountMenu />
          {/* Phones: the hero's CTA sits just below, and "Find my car" heads the menu. */}
          <span className="hidden sm:inline-flex">
            <GlowButton onClick={() => onStart("nav")} size="sm">
              {PRIMARY_CTA}
            </GlowButton>
          </span>
          <MobileMenu onStart={onStart} />
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------------- */
/* Hero: the "evidence mosaic" car (kept -- already token-driven, now       */
/* glows amber-on-dark for free) plus a scroll-linked parallax fade and a  */
/* cursor-following headlight glow.                                       */
/* ---------------------------------------------------------------------- */

// Each one is a complete, self-contained thought on its own -- "Colleague
// says wait." (wait for *what*?) tested as confusing rather than relatable.
// Every chip now names both the source AND the actual conflicting advice.
const COMPLAINTS = ["Chacha: “Buy diesel, no question.”", "Colleague: “Wait, new model's coming.”", "YouTube: 15 different Top 10 lists."];

/** Glassy chip over the night-drive scene: the evidence behind every answer. */
function ReviewChip({ claims }: { claims: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-black/45 px-4 py-2.5 backdrop-blur-md">
      <span className="h-2 w-2 rounded-full bg-accent-rust animate-pulse-dot" />
      <span className="text-sm text-ink">
        <span className="font-semibold">{approxFloor(claims).toLocaleString("en-IN")}+</span>{" "}
        <span className="text-ink-soft">points from real owner and expert reviews</span>
      </span>
    </div>
  );
}

function CursorHeadlight({ x, y }: { x: ReturnType<typeof useMotionValue<number>>; y: ReturnType<typeof useMotionValue<number>> }) {
  const background = useTransform(
    [x, y],
    ([xv, yv]) => `radial-gradient(320px circle at ${xv}px ${yv}px, rgba(226,152,74,0.12), transparent 70%)`,
  );
  return <motion.div className="pointer-events-none absolute inset-0 z-0 hidden sm:block" style={{ background }} />;
}

function Hero({ onStart, claims }: { onStart: (location: string) => void; claims: number }) {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const fade = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const rise = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const glowX = useMotionValue(-9999);
  const glowY = useMotionValue(-9999);

  return (
    <section
      id="top"
      ref={heroRef}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        glowX.set(e.clientX - rect.left);
        glowY.set(e.clientY - rect.top);
      }}
      onPointerLeave={() => {
        glowX.set(-9999);
        glowY.set(-9999);
      }}
      className="relative overflow-hidden"
    >
      {/* Wide screens: the night drive fills the hero behind the text. */}
      <div className="absolute inset-0 hidden lg:block">
        <NightDriveScene wide priority />
        <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/80 via-35% to-transparent to-60%" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-paper to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper to-transparent" />
      </div>
      {!reduce && <CursorHeadlight x={glowX} y={glowY} />}
      <motion.div
        style={reduce ? undefined : { opacity: fade, y: rise }}
        className="relative mx-auto max-w-6xl px-6 pt-14 sm:pt-16 lg:flex lg:min-h-[600px] lg:items-center lg:pb-24 lg:pt-10 xl:min-h-[min(calc(100vh-4rem),780px)]"
      >
        <div className="lg:max-w-[30rem] xl:max-w-[34rem]">
          {/* The doubt-clearing beat: every conflicting opinion appears sharp,
              holds a moment so it actually registers, then recedes as the
              answer (the car, the button) comes into focus. */}
          <div className="flex flex-wrap gap-2">
            {COMPLAINTS.map((text, i) => (
              <motion.span
                key={text}
                initial={reduce ? undefined : { opacity: 0, y: -8 }}
                animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 1, 0.4], y: [-8, 0, 0, 0] }}
                transition={reduce ? undefined : { duration: 2.4, delay: i * 0.12, times: [0, 0.16, 0.5, 1], ease: "easeInOut" }}
                className="rounded-full border border-border bg-paper-raised/80 px-3.5 py-1.5 font-mono text-[11px] text-ink-soft backdrop-blur-sm"
              >
                {text}
              </motion.span>
            ))}
          </div>

          <StaggerHeading
            as="h1"
            instant
            text="Still confused which car to buy in India?"
            className="mt-6 max-w-xl text-balance font-display text-[clamp(2.1rem,4.8vw,3.5rem)] font-semibold leading-[1.12] text-ink"
          />
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            One evidence-backed answer, not fifty conflicting opinions. Matched to how you actually drive.
          </p>

          {/* Headline, pitch and button are plain (not motion) so they are
              visible in the server HTML before any JS runs -- see StaggerHeading `instant`. */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <GlowButton onClick={() => onStart("hero")}>{PRIMARY_CTA}</GlowButton>
            <p className="font-mono text-xs text-ink-faint">11 questions &middot; about 3 minutes</p>
          </div>
        </div>
      </motion.div>

      {/* Tablets and narrower windows: the same scene as a wide panel under the text. */}
      <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-12 lg:hidden">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[28px] shadow-glow">
          <NightDriveScene />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <ReviewChip claims={claims} />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-28 right-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] hidden lg:block">
        <ReviewChip claims={claims} />
      </div>

      {!reduce && (
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-x-0 bottom-6 hidden justify-center sm:flex"
          aria-hidden
        >
          <ArrowDown className="h-5 w-5 text-ink-faint" strokeWidth={1.5} />
        </motion.div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* The buying journey (desktop; phones get AppHome's timeline): one stage  */
/* per column, our tool for each. "Find my car" is the glowing hero card;  */
/* tools not built yet are labelled "Coming soon" and not linked.          */
/* ---------------------------------------------------------------------- */

function Journey({ onStart, claims }: { onStart: (location: string) => void; claims: number }) {
  return (
    <section id="journey" className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <StaggerHeading
            text="From the first search to the first service, one honest guide"
            className="text-balance font-display text-3xl font-bold text-ink sm:text-4xl"
          />
          <RevealOnScroll delay={0.15}>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Choosing the car is only the start. At every step after it, the same {approxFloor(claims).toLocaleString("en-IN")}+
              points from real owner and expert reviews tell you what to check, what to ask and what to push back on.
              Nobody else has read the reviews this closely.
            </p>
          </RevealOnScroll>
        </div>

        <div className="relative mt-14 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          <div aria-hidden className="absolute left-5 right-0 top-5 hidden h-px bg-gradient-to-r from-accent-rust/70 via-border to-transparent lg:block" />
          {JOURNEY.map((stage, i) => (
            <RevealOnScroll key={stage.id} delay={i * 0.08} className="relative">
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent-rust/70 bg-paper font-mono text-sm font-medium text-accent-rust-soft shadow-glow-sm">
                {stage.step}
              </div>
              <p className="mt-4 font-display text-lg font-semibold text-ink">{stage.label}</p>
              <p className="text-sm text-ink-faint">{stage.question}</p>
              <div className="mt-4 flex flex-col gap-3">
                {stage.tools.map((tool) => (
                  <JourneyCard key={tool.id} tool={tool} onStart={onStart} />
                ))}
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

function JourneyCard({ tool, onStart }: { tool: JourneyTool; onStart: (location: string) => void }) {
  const Icon = tool.icon;
  if (tool.hero) {
    return (
      <div className="rounded-2xl border border-accent-rust/50 bg-gradient-to-b from-accent-rust/15 to-paper-raised p-5 shadow-glow-sm">
        <Icon className="h-6 w-6 text-accent-rust" strokeWidth={1.9} />
        <p className="mt-3 font-display text-xl font-semibold text-ink">{tool.title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{tool.sub}</p>
        <GlowButton onClick={() => onStart("journey")} size="sm" className="mt-4">
          Start here
        </GlowButton>
      </div>
    );
  }
  const live = tool.href !== null;
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <Icon className={`h-5 w-5 ${live ? "text-accent-rust-soft" : "text-ink-faint"}`} strokeWidth={1.9} />
        {live ? (
          <ArrowRight className="h-4 w-4 text-accent-rust-soft transition group-hover:translate-x-0.5" strokeWidth={2} />
        ) : (
          <SoonBadge />
        )}
      </div>
      <p className={`mt-3 font-display text-base font-semibold ${live ? "text-ink" : "text-ink-soft"}`}>{tool.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{tool.sub}</p>
    </>
  );
  if (tool.href) {
    return (
      <Link href={tool.href} className="group block rounded-2xl border border-border bg-paper-raised p-5 transition hover:border-accent-rust/50">
        {inner}
      </Link>
    );
  }
  return <div className="rounded-2xl border border-dashed border-border p-5">{inner}</div>;
}

/* ---------------------------------------------------------------------- */
/* Trust + real numbers (asymmetric -- one loud stat beside a divided list) */
/* ---------------------------------------------------------------------- */

const TRUST_POINTS = [
  {
    icon: Ban,
    title: "No dealer commissions",
    body: "We don't take a cut from any dealer or manufacturer for a recommendation.",
  },
  {
    icon: MessageCircleQuestion,
    title: "No sponsored results",
    body: "Every car shown is ranked purely on how well it fits your answers, never on who paid us.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence, not opinion",
    body: "Every reason we give is backed by a real ownership or expert review. You can see the quote.",
  },
];

function IconBadge({ icon: Icon, className = "" }: { icon: React.ElementType; className?: string }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-charcoal-800/70 ${className}`}
    >
      <Icon className="h-5 w-5 text-accent-rust-soft" strokeWidth={1.75} />
    </div>
  );
}

function StatCard({
  caseNo,
  value,
  title,
  body,
}: {
  caseNo: string;
  value: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <RevealOnScroll className="rounded-2xl border border-border bg-paper-raised p-6 shadow-card sm:p-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">Case file no. {caseNo}</p>
      <CountUpNumber
        value={value}
        className="mt-2 font-mono text-[clamp(2.25rem,4.2vw,3.5rem)] font-semibold leading-none tracking-tight text-accent-rust-soft"
      />
      <p className="mt-3 font-display text-base font-semibold text-ink sm:text-lg">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
    </RevealOnScroll>
  );
}

function TrustAndStats({ stats }: { stats: SiteStats }) {
  return (
    <section className="border-b border-border py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 lg:grid-cols-[1.15fr_0.95fr] lg:items-center lg:gap-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <StatCard
            caseNo="001"
            value={stats.claims}
            title="Real review claims, weighed line by line"
            body={<>Pulled from real ownership and expert reviews across {stats.cars} cars so far, not marketing copy.</>}
          />
          <StatCard
            caseNo="002"
            value={stats.videos}
            title="Review videos watched, start to finish"
            body="Every claim above traces back to a real ownership or expert video, timestamp and all -- not a spec sheet skim."
          />
        </div>

        <div className="divide-y divide-border">
          {TRUST_POINTS.map((point, i) => (
            <RevealOnScroll key={point.title} delay={i * 0.08} className="flex gap-4 py-5 first:pt-0 last:pb-0">
              <IconBadge icon={point.icon} />
              <div>
                <p className="font-display font-semibold text-ink">{point.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{point.body}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Case index -- an auto-scrolling, self-looping strip of file tabs naming */
/* real cars already in the database. Pauses on hover/focus so it's still  */
/* readable, and falls back to a plain static (manually scrollable) row    */
/* under prefers-reduced-motion instead of an endless auto-scroll.        */
/* ---------------------------------------------------------------------- */

const INDEX_CARS = [
  "Hyundai Creta",
  "Kia Seltos",
  "Maruti Grand Vitara",
  "Mahindra Scorpio N",
  "Tata Sierra",
  "Mahindra Thar",
  "Toyota Innova Crysta",
  "Mahindra XUV 3XO",
  "Toyota Urban Cruiser Hyryder",
  "Hyundai Venue",
  "Skoda Kushaq",
  "Volkswagen Virtus",
  "Honda City",
  "Renault Duster",
  "MG Astor",
  "Kia Syros",
];

function CaseIndex({ carsCount }: { carsCount: number }) {
  const reduce = useReducedMotion();
  const track = reduce ? INDEX_CARS : [...INDEX_CARS, ...INDEX_CARS];

  return (
    <section className="border-b border-border py-10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-5 text-sm text-ink-faint">A sample of the {carsCount} cars already in our database</p>
      </div>
      <div className={reduce ? "overflow-x-auto px-6" : "overflow-hidden"} style={reduce ? { scrollbarWidth: "thin" } : undefined}>
        <div className={`flex w-max gap-2 ${reduce ? "" : "marquee-track"}`}>
          {track.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="shrink-0 whitespace-nowrap rounded-full border border-border bg-paper-raised/70 px-4 py-2.5 font-mono text-xs text-ink-soft"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* How it works -- a vertical case-file timeline, not a scroll-hijacked    */
/* pinned stack. Each row reveals once, in order, as it enters view.      */
/* ---------------------------------------------------------------------- */

const STEPS = [
  {
    icon: ListChecks,
    title: "Tell us how you actually drive",
    body: "11 quick questions grouped into core requirements, your everyday driving, and what matters to you. No jargon, about 3 minutes.",
  },
  {
    icon: ScanSearch,
    title: "We weigh real review evidence",
    body: "Your answers are matched against facts extracted from real ownership and expert reviews, not marketing copy.",
  },
  {
    icon: Sparkles,
    title: "Get 2-3 cars, with reasons shown",
    body: "See exactly why each car fits, backed by real quotes and claim counts, not a black-box score.",
  },
  {
    icon: PhoneCall,
    title: "Talk to a real human, if you want",
    body: "No pressure, no automatic dealer handoff. Reach out only when you're ready.",
  },
];

function HowItWorks({ onStart }: { onStart: (location: string) => void }) {
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <StaggerHeading
            text="How to pick the right car in India, in four steps"
            className="text-balance font-display text-3xl font-bold text-ink sm:text-4xl"
          />
          <RevealOnScroll delay={0.15}>
            <p className="mt-4 leading-relaxed text-ink-soft">
              No dealer visits, no 20-tab browser research marathon. Just your actual driving life, matched against
              real evidence.
            </p>
          </RevealOnScroll>
        </div>

        <div className="relative mt-14 max-w-2xl">
          <div className="absolute left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-accent-rust/60 via-border to-transparent" aria-hidden />
          <div className="flex flex-col gap-10">
            {STEPS.map((step, i) => (
              <RevealOnScroll key={step.title} delay={i * 0.08} className="relative flex gap-6 pl-0">
                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-accent-rust/70 bg-paper font-mono text-lg font-medium text-accent-rust-soft shadow-glow-sm">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="pt-1.5">
                  <step.icon className="mb-2 h-5 w-5 text-accent-rust" strokeWidth={1.75} />
                  <p className="font-display text-xl font-semibold text-ink sm:text-2xl">{step.title}</p>
                  <p className="mt-2 max-w-md text-base leading-relaxed text-ink-soft">{step.body}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <GlowButton onClick={() => onStart("how_it_works")}>{PRIMARY_CTA}</GlowButton>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Evidence preview (a real component preview, not a fake screenshot --    */
/* the numbers and quote below are real, taken as-is from the actual Kia  */
/* Seltos review-claims database)                                         */
/* ---------------------------------------------------------------------- */

/** One real evidence card -- a verdict, confidence, and a real quote. Used
 * twice below (one positive, one negative) so the landing page shows the
 * evidence system as it actually behaves: it surfaces a car's real flaws
 * exactly as plainly as its strengths, not just the flattering half. */
function EvidenceCardExample({
  car,
  facetLabel,
  verdict,
  sentiment,
  confidence,
  quote,
  delay = 0,
}: {
  car: string;
  facetLabel: string;
  verdict: string;
  sentiment: "positive" | "negative";
  confidence: string;
  quote: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const isPositive = sentiment === "positive";
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { y: -4 }}
      className="relative rounded-2xl border border-border bg-paper-raised p-7 shadow-card sm:p-8"
    >
      {isPositive ? (
        <StampReveal className="absolute -right-4 -top-4 h-16 w-16 text-accent-rust sm:-right-6 sm:-top-6 sm:h-20 sm:w-20">
          <VerdictStamp className="h-full w-full drop-shadow-[0_0_16px_rgba(226,152,74,0.4)]" />
        </StampReveal>
      ) : (
        <StampReveal className="absolute -right-3 -top-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-negative bg-paper-raised text-negative shadow-[0_0_16px_rgba(226,131,124,0.35)] sm:-right-4 sm:-top-4 sm:h-14 sm:w-14">
          <X className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.5} aria-hidden />
        </StampReveal>
      )}

      <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">
        {car} &middot; {facetLabel}
      </p>

      <div className="mt-4 flex items-center gap-2.5">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isPositive ? "bg-positive shadow-[0_0_8px_rgba(124,201,154,0.7)]" : "bg-negative shadow-[0_0_8px_rgba(226,131,124,0.7)]"
          }`}
          aria-hidden
        />
        <p className="font-display text-lg font-semibold text-ink">{verdict}</p>
      </div>
      <p className="mt-1.5 text-sm text-ink-soft">{confidence}</p>

      <div className={`mt-6 flex gap-3 rounded-xl p-5 ${isPositive ? "bg-positive-bg" : "bg-negative-bg"}`}>
        <Quote
          className={`mt-0.5 h-5 w-5 shrink-0 ${isPositive ? "text-positive" : "text-negative"}`}
          strokeWidth={1.75}
        />
        <p className="text-sm leading-relaxed text-ink">
          &ldquo;{quote}&rdquo;
          <span className="mt-1.5 block text-xs font-medium text-ink-soft">
            From an independent expert review in our database
          </span>
        </p>
      </div>
    </motion.div>
  );
}

function EvidencePreview() {
  return (
    <section className="border-y border-border py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="max-w-lg">
          <StaggerHeading
            text="Car recommendations backed by real owner and expert reviews"
            className="text-balance font-display text-3xl font-bold text-ink sm:text-4xl"
          />
          <RevealOnScroll delay={0.15}>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Every reason on a CarDhoondo result links back to a real claim like these, with a plain-language
              verdict, an honest confidence level, and the actual quote it came from. That includes a car&apos;s real
              flaws, stated as plainly as its strengths -- not a mystery score, and not just the flattering half.
            </p>
          </RevealOnScroll>
        </div>

        <div className="flex flex-col gap-6">
          <EvidenceCardExample
            car="Kia Seltos"
            facetLabel="Ride quality over rough roads"
            verdict="Strongly positive"
            sentiment="positive"
            confidence="High confidence, based on 11 independent reviews."
            quote="Ride quality is very impressive. It gobbles up the worst bumps in its stride without hesitation; the earlier Seltos was on the stiffer side, this one is really smooth and nice."
          />
          <EvidenceCardExample
            car="Tata Sierra"
            facetLabel="Fit and finish"
            verdict="Strongly negative"
            sentiment="negative"
            confidence="High confidence, based on 17 independent reviews."
            quote="The steering wheel is not screwed on straight at the straight-ahead position... the moment you point it straight it starts pulling to the left. And this is another example of that fit and finish issue that Tata Motors just can't seem to get right."
            delay={0.1}
          />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Why CarDhoondo (pain points vs. our approach)                           */
/* ---------------------------------------------------------------------- */

const OLD_WAY = [
  "Conflicting advice everywhere: chacha, colleagues, YouTube, and Reddit all say something different, and the more you research, the more confused you get.",
  "Dealer pressure and hidden charges: inflated insurance, forced accessories, and upsells you never asked for.",
  "The variant trap: base models stripped of essentials to push you toward a pricier top trim.",
  "EV or petrol? Diesel or hybrid? Generic articles, no answer for your specific life.",
];

const NEW_WAY = [
  "One clear recommendation, not fifty opinions to reconcile yourself.",
  "No dealer commissions, no sponsored results: every ranking is answer-driven, not paid for.",
  "Every reason is backed by a real review quote you can read yourself.",
  "Matched to how you actually drive and live, not a generic buyer segment.",
];

function WhyCarDhoondo() {
  const reduce = useReducedMotion();
  return (
    <section id="why-cardhoondo" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <StaggerHeading
            text="Car buying in India is broken by too many opinions"
            className="text-balance font-display text-3xl font-bold text-ink sm:text-4xl"
          />
          <RevealOnScroll delay={0.15}>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Here&apos;s the honest comparison: what researching a car normally feels like, and what we built instead.
            </p>
          </RevealOnScroll>
        </div>

        <div className="mt-14 flex flex-col items-stretch gap-6 lg:flex-row lg:items-center">
          <div className="flex-1 rounded-2xl border border-negative/25 bg-negative-bg p-8">
            <p className="mb-6 font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
              The usual way
            </p>
            <ul className="space-y-5">
              {OLD_WAY.map((point, i) => (
                <motion.li
                  key={point}
                  initial={reduce ? false : { opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="flex gap-3 text-sm leading-relaxed text-ink-soft"
                >
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-negative" strokeWidth={2.5} />
                  {point}
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-center self-center">
            <StampReveal>
              <VerdictStamp className="h-14 w-14 text-accent-rust drop-shadow-[0_0_18px_rgba(226,152,74,0.45)]" />
            </StampReveal>
          </div>

          <div className="flex-1 rounded-2xl border border-accent-rust/35 bg-paper-raised p-8 shadow-glow">
            <p className="mb-6 font-display text-sm font-semibold uppercase tracking-wide text-accent-rust-soft">
              The CarDhoondo way
            </p>
            <ul className="space-y-5">
              {NEW_WAY.map((point, i) => (
                <motion.li
                  key={point}
                  initial={reduce ? false : { opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.45, delay: 0.3 + i * 0.08 }}
                  className="flex gap-3 text-sm leading-relaxed text-ink"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-rust" strokeWidth={2.5} />
                  {point}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* About us                                                                 */
/* ---------------------------------------------------------------------- */

const ABOUT_PRINCIPLES = [
  {
    icon: Ban,
    title: "No dealer money, no sponsored picks",
    body: "Nobody pays to be on your shortlist. We don't take commissions from dealers or manufacturers for recommending a car, so the only thing that decides a recommendation is the evidence.",
  },
  {
    icon: ScanSearch,
    title: "Evidence, not opinions",
    body: "Every recommendation is built from claims extracted from real ownership and expert reviews, and each one links back to what reviewers actually said, good and bad.",
  },
  {
    icon: ShieldCheck,
    title: "Honest about what we don't know",
    body: "If a car doesn't have enough review data yet, we say so instead of guessing. We'd rather show a gap than fake confidence.",
  },
];

const ABOUT_VISION_MISSION = [
  {
    label: "Our vision",
    headline: "Every car buyer in India knows which car is right for them, and why.",
    body: "A first-time buyer should be able to walk into a showroom confident, not confused, and not at the mercy of whoever is talking loudest.",
  },
  {
    label: "Our mission",
    headline: "Support you through your car-buying journey.",
    body: "We help you choose the car that genuinely fits your life, and avoid unnecessary spends along the way, like a variant, add-on or accessory you never needed.",
  },
];

function AboutUs({ stats }: { stats: SiteStats }) {
  return (
    <section id="about" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">About us</p>
            <StaggerHeading
              text="An unbiased car advisor with no dealer commissions"
              className="mt-3 text-balance font-display text-3xl font-bold text-ink sm:text-4xl"
            />
            <RevealOnScroll delay={0.15}>
              <div className="mt-5 space-y-4 leading-relaxed text-ink-soft">
                <p>
                  Buying a car in India means hearing from everyone: family, colleagues, the dealer, fifteen
                  YouTube videos. Most of it contradicts the rest, and much of it comes from someone who earns
                  when you pick a particular car.
                </p>
                <p>
                  CarDhoondo is an independent, India-first car recommender. You tell us how you actually
                  drive, and we match that against what real owners and expert reviewers have said, then
                  narrow it to 2-3 cars with the evidence for each. We&apos;re built for first and
                  second-time buyers who are tired of the noise, not for car enthusiasts.
                </p>
                <p>
                  We&apos;re early, and we say so. Right now we&apos;re working through{" "}
                  <span className="font-mono text-ink">{stats.claims.toLocaleString("en-IN")}</span> review
                  claims across <span className="font-mono text-ink">{stats.cars}</span> cars, and we keep
                  adding more.
                </p>
              </div>
            </RevealOnScroll>
          </div>

          <div className="space-y-4">
            {ABOUT_PRINCIPLES.map((p, i) => (
              <RevealOnScroll key={p.title} delay={0.1 + i * 0.08}>
                <div className="flex gap-4 rounded-2xl border border-border bg-paper-raised p-6 shadow-card">
                  <IconBadge icon={p.icon} />
                  <div>
                    <p className="font-display text-base font-semibold text-ink">{p.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.body}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16">
          {ABOUT_VISION_MISSION.map((item, i) => (
            <RevealOnScroll key={item.label} delay={0.1 + i * 0.08}>
              <div className="h-full rounded-2xl border border-accent-rust/35 bg-paper-raised p-6 shadow-glow sm:p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-rust-soft">
                  {item.label}
                </p>
                <p className="mt-3 text-balance font-display text-xl font-semibold leading-snug text-ink sm:text-2xl">
                  {item.headline}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.body}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* FAQ                                                                     */
/* ---------------------------------------------------------------------- */

function Faq() {
  const reduce = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section id="faq" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <StaggerHeading
          text="Car buying FAQs: how CarDhoondo works"
          className="text-center text-balance font-display text-3xl font-bold text-ink sm:text-4xl"
        />

        {/* SEO note: the FAQPage JSON-LD below already carries every question's
            full answer text for search engines regardless of open/closed UI
            state, so conditionally rendering the answer here (rather than
            keeping it in the DOM and just hiding it) doesn't cost any SEO
            value while keeping the accordion implementation simple. */}
        <div className="mt-12 divide-y divide-border">
          {FAQS.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={f.q} className="py-2">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="font-display font-semibold text-ink">{f.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                  >
                    <ChevronDown className="h-5 w-5 shrink-0 text-ink-faint" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reduce ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm leading-relaxed text-ink-soft">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Contact                                                                  */
/* ---------------------------------------------------------------------- */

function Contact({ onStart }: { onStart: (location: string) => void }) {
  return (
    <section id="contact" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <StaggerHeading
          text="Questions, feedback, or found a bug? We read everything."
          className="font-display text-3xl font-bold text-ink text-balance sm:text-4xl"
        />
        <RevealOnScroll delay={0.15}>
          <p className="mt-4 text-ink-soft">
            CarDhoondo is early and actively being built. If something felt off, you&apos;re interested in
            collaborating or partnering with us, or you just want to say hi, reach out directly.
          </p>
        </RevealOnScroll>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:mycardhoondo@gmail.com"
            className="flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-ink-soft transition hover:border-accent-rust/50 hover:text-ink"
          >
            <Mail className="h-4 w-4" strokeWidth={1.75} />
            mycardhoondo@gmail.com
          </a>
          <GlowButton onClick={() => onStart("contact")}>{PRIMARY_CTA}</GlowButton>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Footer                                                                   */
/* ---------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div>
          <Brandmark />
          <p className="mt-2 max-w-xs text-sm text-ink-soft">
            No dealer commissions. No sponsored results. Just the car that fits your life.
          </p>
        </div>

        {/* Same links as the top nav -- the top nav is hidden below `sm`, so
            this is the only way to reach FAQ/Contact/Guides on mobile. */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-ink-soft sm:justify-start">
          <a href="#about" className="transition hover:text-ink">
            About
          </a>
          <a href="#faq" className="transition hover:text-ink">
            FAQ
          </a>
          <Link href="/cars" className="transition hover:text-ink">
            Car reviews
          </Link>
          <Link href="/guides" className="transition hover:text-ink">
            Guides
          </Link>
          <Link href="/quotation" className="transition hover:text-ink">
            Check my quote
          </Link>
          <a href="#contact" className="transition hover:text-ink">
            Contact
          </a>
          <Link href="/privacy" className="transition hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-ink">
            Terms
          </Link>
          <CookieSettingsButton className="transition hover:text-ink" />
        </nav>

        <p className="text-xs text-ink-faint">
          &copy; {new Date().getFullYear()} CarDhoondo. Made for car buyers across India.
        </p>
      </div>
    </footer>
  );
}
