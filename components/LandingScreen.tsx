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
    q: "Do I need to sign up or share my number to get a recommendation?",
    a: "No. Getting your recommendation takes about 3 minutes and doesn't require creating an account.",
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

export default function LandingScreen({ onStart }: { onStart: (location: string) => void }) {
  const stats = useLiveStats();
  return (
    <main className="relative min-h-screen overflow-x-clip bg-paper text-ink">
      <NightCanvas />
      <div className="relative z-10">
        <Nav onStart={onStart} />
        <Hero onStart={onStart} claims={stats.claims} />
        <TrustAndStats stats={stats} />
        <CaseIndex carsCount={stats.cars} />
        <HowItWorks onStart={onStart} />
        <EvidencePreview />
        <WhyCarDhoondo />
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
  const classes = `group inline-flex items-center gap-2 rounded-full bg-accent-rust font-semibold text-charcoal-950 shadow-glow-sm transition hover:brightness-110 ${padding} ${className}`;
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
}: {
  text: string;
  as?: "h1" | "h2";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  if (reduce) return <Tag className={className}>{text}</Tag>;
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
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-soft sm:flex">
          <a href="#how-it-works" className="transition hover:text-ink">
            How it works
          </a>
          <a href="#why-cardhoondo" className="transition hover:text-ink">
            Why CarDhoondo
          </a>
          <a href="#faq" className="transition hover:text-ink">
            FAQ
          </a>
          <Link href="/guides" className="transition hover:text-ink">
            Guides
          </Link>
          <a href="#contact" className="transition hover:text-ink">
            Contact
          </a>
        </nav>
        <GlowButton onClick={() => onStart("nav")} size="sm">
          {PRIMARY_CTA}
        </GlowButton>
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

/** A proper shaded crossover-SUV silhouette (the body shape of what
 * CarDhoondo actually recommends, not a generic sedan) -- body panel
 * contour, glass with a diagonal reflection, alloy wheels with spokes,
 * head/tail lamps, a roof rail. The "assembled from evidence" concept is
 * kept but restrained: a handful of small data-point dots along real seams
 * (headlamp, mirror, door handle, wheel hub) rather than turning the whole
 * car into visible squares. The reveal itself is a blur-to-focus resolve,
 * timed to land right as the hero's complaint chips dim -- "the confusion
 * clears and your recommendation comes into focus," the actual product
 * moment, not a generic entrance animation. */
function EvidenceCar({ claims }: { claims: number }) {
  const reduce = useReducedMotion();

  const vbW = 480;
  const vbH = 235;
  const sill = 175;
  const wheelR = 44;

  // Proportions checked against real SUV side-profile references (short,
  // raked cab-forward nose; wheels ~40% of total body height, set into
  // genuine flared arches cut into the body -- not just resting under a
  // flat sill; a fastback-style roofline with a small rear spoiler kick;
  // two separate window panes split by a B-pillar), not guessed freehand.
  const body =
    "M20,175 C20,166 26,160 34,158 L36,144 " +
    "C41,118 54,99 74,89 C88,82 100,77 112,70 " +
    "C120,58 130,49 144,43 C154,39 167,37 181,36 L318,41 " +
    "C330,42 339,44 346,48 C351,46 355,45.5 359,47.5 " +
    "C367,54 374,63 380,74 C386,87 391,99 395,111 " +
    "C407,115 419,121 427,131 C434,139 438,149 438,159 L438,175 " +
    "L398,175 A48,48 0 0 0 302,175 L178,175 A48,48 0 0 0 82,175 L20,175 Z";

  const rimLight =
    "M34,158 C41,118 54,99 74,89 C88,82 100,77 112,70 " +
    "C120,58 130,49 144,43 C154,39 167,37 181,36 L318,41 " +
    "C330,42 339,44 346,48 C351,46 355,45.5 359,47.5 " +
    "C367,54 374,63 380,74 C386,87 391,99 395,111";

  const glass = "M112,88 C120,64 132,52 146,46 L316,50 C328,51 336,53 343,56 C355,63 366,74 375,86 L390,100 L100,96 Z";
  const bPillar = "M247,49 L256,50 L254,96 L245,95 Z";
  const roofRail = "M188,34 L314,38";
  const characterLine = "M92,140 C180,144 300,144 418,136";
  const doorHandleFront = "M150,105 L166,106";
  const doorHandleRear = "M280,109 L296,110";
  const mirror = "M120,74 C114,71 108,73 107,79 C106,85 111,88 117,86 L122,79 Z";

  return (
    <motion.div
      initial={reduce ? undefined : { filter: "blur(18px)", opacity: 0.35 }}
      animate={{ filter: "blur(0px)", opacity: 1 }}
      transition={{ duration: 1, delay: 1.05, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-[460px]"
    >
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="h-auto w-full drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)]"
        role="img"
        aria-label="A crossover SUV, illustrated, being illuminated from the evidence behind CarDhoondo's recommendations"
      >
        <defs>
          <linearGradient id="carBodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-charcoal-600)" />
            <stop offset="45%" stopColor="var(--color-charcoal-800)" />
            <stop offset="100%" stopColor="var(--color-charcoal-900)" />
          </linearGradient>
          <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a4a52" />
            <stop offset="55%" stopColor="#212d34" />
            <stop offset="100%" stopColor="#161e23" />
          </linearGradient>
          <radialGradient id="wheelGrad" cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="var(--color-charcoal-500)" />
            <stop offset="100%" stopColor="var(--color-charcoal-950)" />
          </radialGradient>
        </defs>

        <ellipse cx={vbW / 2 - 5} cy={sill + wheelR + 6} rx="205" ry="11" fill="#000" opacity="0.45" />

        <g>
          <path d={body} fill="url(#carBodyGrad)" stroke="var(--color-charcoal-950)" strokeWidth="1.5" />
          {/* rim-light along the roof/hood edge -- the "lit from above" cue */}
          <path d={rimLight} fill="none" stroke="var(--color-accent-rust)" strokeWidth="1.75" opacity="0.65" strokeLinecap="round" />

          <path d={glass} fill="url(#glassGrad)" />
          <path d={bPillar} fill="var(--color-charcoal-950)" />
          <path d="M126,80 L150,58" stroke="#8a9aa2" strokeWidth="2.5" opacity="0.4" strokeLinecap="round" />
          <path d="M180,52 L192,72" stroke="#8a9aa2" strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />

          <path d={characterLine} fill="none" stroke="var(--color-charcoal-950)" strokeWidth="1" opacity="0.4" />
          <path d={doorHandleFront} stroke="var(--color-charcoal-950)" strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />
          <path d={doorHandleRear} stroke="var(--color-charcoal-950)" strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />
          <path d={roofRail} stroke="var(--color-charcoal-950)" strokeWidth="3" opacity="0.5" strokeLinecap="round" />
          <path d={mirror} fill="var(--color-charcoal-950)" opacity="0.85" />

          {/* head + tail lamps */}
          <path d="M22,152 C22,147 26,144 32,145 L42,149 L40,158 L26,158 C23,158 22,155 22,152 Z" fill="var(--color-accent-rust)" opacity="0.95" />
          <path d="M420,133 C425,134 429,137 430,142 L428,151 L418,149 L419,139 Z" fill="#c85a4a" opacity="0.9" />

          {/* wheels -- large flared arches (cut into the body path above) with */}
          {/* the tire sitting inside, matched in radius to the arch cutout */}
          {[130, 350].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy={sill} r={wheelR} fill="var(--color-charcoal-950)" />
              <circle cx={cx} cy={sill} r={wheelR * 0.66} fill="url(#wheelGrad)" stroke="var(--color-charcoal-600)" strokeWidth="1" />
              <circle cx={cx} cy={sill} r={wheelR * 0.18} fill="var(--color-charcoal-800)" />
              {[0, 60, 120, 180, 240, 300].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const len = wheelR * 0.5;
                const x2 = cx + Math.cos(rad) * len;
                const y2 = sill + Math.sin(rad) * len;
                return <line key={deg} x1={cx} y1={sill} x2={x2} y2={y2} stroke="var(--color-charcoal-600)" strokeWidth="2.5" strokeLinecap="round" />;
              })}
            </g>
          ))}

          {/* evidence data-points along real seams, restrained not tiled */}
          {!reduce &&
            [
              { x: 32, y: 150 },
              { x: 250, y: 95 },
              { x: 114, y: 79 },
              { x: 357, y: 47 },
            ].map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="2.3"
                fill="var(--color-accent-rust-soft)"
                className="animate-pulse-dot"
                style={{ animationDelay: `${i * 260}ms` }}
              />
            ))}
        </g>
      </svg>
      <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
        Built from {approxFloor(claims).toLocaleString("en-IN")}+ real review claims
      </p>
    </motion.div>
  );
}

/** A soft amber glow that follows the pointer, purely decorative (absolute,
 * pointer-events-none, so it never steals hit-testing from the real content
 * stacked above it) and cheap -- one motion-value-driven background
 * template, so it repaints without triggering a React re-render per pointer
 * move. The actual pointer listener lives on the section wrapping this, via
 * the x/y motion values passed in. */
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
      className="relative overflow-hidden pt-10 pb-20 sm:pt-16 sm:pb-28"
    >
      {!reduce && <CursorHeadlight x={glowX} y={glowY} />}
      <motion.div
        style={reduce ? undefined : { opacity: fade, y: rise }}
        className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10"
      >
        <div>
          {/* The doubt-clearing beat: every conflicting opinion appears sharp,
              holds a moment so it actually registers, then recedes into the
              background right as the car (the answer) sharpens into focus
              below -- the animation acting out "your confusion gets replaced
              by one evidence-backed recommendation," not just a generic
              stagger-in. */}
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
            text="Still confused which car to buy?"
            className="mt-6 max-w-xl text-balance font-display text-[clamp(2.1rem,4.8vw,3.5rem)] font-semibold leading-[1.12] text-ink"
          />
          <motion.p
            initial={reduce ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-4 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg"
          >
            One evidence-backed answer, not fifty conflicting opinions. Matched to how you actually drive.
          </motion.p>

          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <GlowButton onClick={() => onStart("hero")}>{PRIMARY_CTA}</GlowButton>
            <p className="font-mono text-xs text-ink-faint">11 questions &middot; about 3 minutes</p>
          </motion.div>
        </div>

        <EvidenceCar claims={claims} />
      </motion.div>

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
            text="From confused to confident, in four steps"
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

function EvidencePreview() {
  const reduce = useReducedMotion();
  return (
    <section className="border-y border-border py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div className="max-w-lg">
          <StaggerHeading
            text="This is what evidence-backed actually looks like"
            className="text-balance font-display text-3xl font-bold text-ink sm:text-4xl"
          />
          <RevealOnScroll delay={0.15}>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Every reason on a CarDhoondo result links back to a real claim like this one, with a plain-language
              verdict, an honest confidence level, and the actual quote it came from. Not a mystery score.
            </p>
          </RevealOnScroll>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          whileHover={reduce ? undefined : { y: -4 }}
          className="relative rounded-2xl border border-border bg-paper-raised p-7 shadow-card sm:p-8"
        >
          <StampReveal className="absolute -right-4 -top-4 h-16 w-16 text-accent-rust sm:-right-6 sm:-top-6 sm:h-20 sm:w-20">
            <VerdictStamp className="h-full w-full drop-shadow-[0_0_16px_rgba(226,152,74,0.4)]" />
          </StampReveal>

          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">
            Kia Seltos &middot; Ride quality over rough roads
          </p>

          <div className="mt-4 flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-positive shadow-[0_0_8px_rgba(124,201,154,0.7)]" aria-hidden />
            <p className="font-display text-lg font-semibold text-ink">Strongly positive</p>
          </div>
          <p className="mt-1.5 text-sm text-ink-soft">High confidence, based on 11 independent reviews.</p>

          <div className="mt-6 flex gap-3 rounded-xl bg-positive-bg p-5">
            <Quote className="mt-0.5 h-5 w-5 shrink-0 text-positive" strokeWidth={1.75} />
            <p className="text-sm leading-relaxed text-ink">
              &ldquo;Ride quality is very impressive. It gobbles up the worst bumps in its stride without hesitation;
              the earlier Seltos was on the stiffer side, this one is really smooth and nice.&rdquo;
              <span className="mt-1.5 block text-xs font-medium text-ink-soft">
                From an independent expert review in our database
              </span>
            </p>
          </div>
        </motion.div>
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
/* FAQ                                                                      */
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
          text="Common questions about how CarDhoondo works"
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
        <nav className="flex items-center gap-6 text-sm font-medium text-ink-soft">
          <a href="#faq" className="transition hover:text-ink">
            FAQ
          </a>
          <Link href="/guides" className="transition hover:text-ink">
            Guides
          </Link>
          <a href="#contact" className="transition hover:text-ink">
            Contact
          </a>
        </nav>

        <p className="text-xs text-ink-faint">
          &copy; {new Date().getFullYear()} CarDhoondo. Made for car buyers across India.
        </p>
      </div>
    </footer>
  );
}
