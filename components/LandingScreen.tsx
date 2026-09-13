"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useInView,
  useReducedMotion,
  animate,
  AnimatePresence,
} from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
  X,
  Check,
  ChevronDown,
  Quote,
} from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

export default function LandingScreen({ onStart }: { onStart: (location: string) => void }) {
  return (
    <main className="min-h-screen overflow-x-clip bg-paper">
      {/* nav + hero are budgeted to fit one screen (min-h-dvh) so the CTA band
          is visible without scrolling on first load -- if content ever needs
          more room (e.g. large system font settings), min-h lets it grow
          rather than clipping anything. */}
      <div className="flex min-h-dvh flex-col">
        <Nav onStart={onStart} />
        <Hero onStart={onStart} />
      </div>
      <TrustAndStats />
      <CarMarquee />
      <HowItWorks onStart={onStart} />
      <EvidencePreview />
      <WhyCarDhoondo />
      <Faq />
      <Contact onStart={onStart} />
      <Footer />
    </main>
  );
}

/* ---------------------------------------------------------------------- */
/* Shared motion primitives                                                */
/* ---------------------------------------------------------------------- */

/** Pulls toward the cursor on hover, spring-settles back to rest on leave.
    Skipped entirely under reduced-motion -- the button just stays put. */
function MagneticButton({
  onClick,
  className,
  children,
  strength = 0.3,
}: {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  strength?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

  function handleMouseMove(e: React.MouseEvent) {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={reduce ? undefined : { x: springX, y: springY }}
      whileTap={{ scale: 0.96 }}
      className={className}
    >
      {children}
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

/** A gentle 3D tilt that tracks the cursor, so the evidence card feels like
    a physical object rather than a flat screenshot. Off under reduced-motion. */
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rotateX = useSpring(0, { stiffness: 220, damping: 22 });
  const rotateY = useSpring(0, { stiffness: 220, damping: 22 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 9);
    rotateX.set(py * -9);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A plain scroll-reveal lift, used for section headers and list content
    that isn't already handled by a more specific animation below. */
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
      initial={reduce ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------------- */
/* Nav                                                                     */
/* ---------------------------------------------------------------------- */

function Nav({ onStart }: { onStart: (location: string) => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <a href="#top" className="flex items-center" aria-label="CarDhoondo home">
          <Image
            src="/cardhoondo-logo.png"
            alt="CarDhoondo - Your Perfect Car Found"
            width={489}
            height={105}
            priority
            className="h-8 w-auto sm:h-9"
          />
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft sm:flex">
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
        <MagneticButton
          onClick={() => onStart("nav")}
          strength={0.25}
          className="rounded-full bg-accent-gold px-5 py-2.5 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105"
        >
          {PRIMARY_CTA}
        </MagneticButton>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------------- */
/* Hero                                                                    */
/* ---------------------------------------------------------------------- */

const HERO_ALT =
  "A couple stands on a coastal road as CarDhoondo highlights one clear, confidently recommended car.";

const OPINIONS = [
  { text: "Chacha says diesel", top: "4%", left: "50%", rotate: -5, delay: "0s" },
  { text: "Colleague says wait", top: "22%", left: "58%", rotate: 4, delay: "1.1s" },
  { text: "YouTube: Top 10 SUVs", top: "4%", left: "76%", rotate: 3, delay: "2.2s" },
];

/** The literal visual of the hero's own headline: too many scattered
    opinions floating around, none of them about you. Confined to a narrow
    band in the upper-right (sky/mountain, never the headline column on the
    left or the people/car documented as this crop's protected safe zone),
    so it never risks the hard-won hero crop math or the headline's own
    legibility. */
function OpinionCloud() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] hidden sm:block" aria-hidden>
      {OPINIONS.map((op) => (
        <span
          key={op.text}
          className="animate-chip-float absolute rounded-full border border-white/25 bg-black/30 px-3 py-1.5 font-mono text-[11px] text-white/85 backdrop-blur-sm"
          style={
            {
              top: op.top,
              left: op.left,
              "--chip-rot": `${op.rotate}deg`,
              "--chip-delay": op.delay,
            } as React.CSSProperties
          }
        >
          {op.text}
        </span>
      ))}
    </div>
  );
}

function Hero({ onStart }: { onStart: (location: string) => void }) {
  return (
    <section id="top" className="flex flex-1 flex-col bg-paper">
      {/* One clean photo (no baked-in text), so headline placement/size is
          fully our own CSS -- fluid (clamp-based), not just breakpoint jumps,
          so it holds up while a window is being resized, not only at fixed
          device presets. Fills whatever room is left after the CTA band
          below; object-position leans toward the people/car (the photo's
          real subject) since cropping is purely aesthetic now -- nothing in
          the photo itself needs protecting from a crop anymore.
          Headline copy below is deliberately preserved verbatim (not
          rewritten for the redesign) -- it's the live Instagram fake-door
          ad creative's exact hook, and campaign continuity outweighs a
          generic hero-line-count guideline here. */}
      <div className="relative min-h-[max(280px,33vw)] flex-1 overflow-hidden">
        <Image src="/hero-banner.jpg" alt={HERO_ALT} fill priority sizes="100vw" className="object-cover object-[64%_83%]" />

        {/* legibility scrim -- a fixed dark zone independent of the photo's
            own crop, so headline text stays readable no matter which part
            of the photo ends up behind it at a given width */}
        <div className="absolute inset-0 bg-gradient-to-b from-stage/90 via-stage/72 to-stage/30 sm:bg-gradient-to-r sm:from-stage/95 sm:via-stage/78 sm:to-stage/20" />

        <OpinionCloud />

        <div className="relative flex h-full flex-col justify-center px-6 py-[clamp(1.5rem,5vw,3.5rem)] sm:px-10 lg:px-16">
          <div className="max-w-[clamp(16rem,42vw,34rem)]">
            <h1 className="font-display font-bold leading-[1.1] tracking-tight text-stage-ink text-balance text-[clamp(1.5rem,4.4vw,3.25rem)]">
              <span className="block">Asked chacha.</span>
              <span className="block">Asked colleagues.</span>
              <span className="block text-accent-gold-soft">Watched 15 YouTube videos.</span>
            </h1>
            <p className="mt-[clamp(0.5rem,1.2vw,0.9rem)] font-display font-medium text-stage-ink text-[clamp(1rem,2vw,1.5rem)]">
              Still confused which car to buy?
            </p>
          </div>
        </div>
      </div>

      {/* the decision moment -- kept compact so it doesn't eat into the
          image's share of the screen. This is the page's one deliberate
          dark chapter (a direct continuation of the hero photo's own
          scrim, not a separate stylistic flip), so everything below it
          stays on a single light canvas per the Airbnb reference's own
          "no dark mode on the public web" discipline. */}
      <div className="shrink-0 bg-stage stage-glow">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-4 text-center sm:flex-row sm:justify-between sm:gap-4 sm:py-5 sm:text-left">
          <p className="font-display text-base font-semibold text-stage-ink sm:text-xl lg:text-2xl">
            CarDhoondo is the one clear answer to all of that.
          </p>
          <div className="flex flex-col items-center gap-1 sm:items-end">
            <MagneticButton
              onClick={() => onStart("hero")}
              className="group flex items-center gap-2 rounded-full bg-accent-gold px-6 py-2.5 text-sm font-semibold text-stage shadow-lg shadow-black/30 transition hover:brightness-105 sm:px-8 sm:py-3.5 sm:text-base"
            >
              {PRIMARY_CTA}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" strokeWidth={2.25} />
            </MagneticButton>
            <p className="text-xs text-stage-ink-soft sm:text-sm">11 questions · ~3 minutes · No signup required</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Trust + real numbers (asymmetric -- one loud stat beside a divided list,  */
/* not three equal cards)                                                  */
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

function TrustAndStats() {
  return (
    <section className="border-b border-border bg-paper">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
        <RevealOnScroll className="rounded-[20px] border border-border bg-paper-raised p-8 shadow-card">
          <CountUpNumber
            value={4036}
            className="font-mono text-[clamp(2.75rem,6vw,4.5rem)] font-semibold leading-none tracking-tight text-navy-900"
          />
          <p className="mt-3 font-display text-lg font-semibold text-ink">Real review claims, weighed line by line</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Pulled from real ownership and expert reviews across 57 cars so far, not marketing copy. This is the
            evidence base a recommendation actually draws from.
          </p>
        </RevealOnScroll>

        <div className="divide-y divide-border">
          {TRUST_POINTS.map((point, i) => (
            <RevealOnScroll key={point.title} delay={i * 0.08} className="flex gap-4 py-5 first:pt-0 last:pb-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50">
                <point.icon className="h-5 w-5 text-navy-700" strokeWidth={1.75} />
              </div>
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
/* Real-cars marquee (one per page, per the taste-skill's own marquee cap) */
/* ---------------------------------------------------------------------- */

const MARQUEE_CARS = [
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

function CarMarquee() {
  const items = [...MARQUEE_CARS, ...MARQUEE_CARS];
  return (
    <section className="overflow-hidden border-b border-border bg-paper-raised py-10">
      <p className="mx-auto mb-6 max-w-6xl px-6 text-sm text-ink-faint">
        A sample of the 59 cars already in our database
      </p>
      <div className="flex w-max animate-marquee gap-3">
        {items.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="whitespace-nowrap rounded-full border border-border bg-paper px-5 py-2.5 font-mono text-sm text-ink-soft"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* How it works (a real GSAP sticky-stack -- each step pins and the        */
/* previous shrinks/fades as the next arrives, literally dramatising       */
/* "one step replaces the last")                                          */
/* ---------------------------------------------------------------------- */

const STEPS = [
  {
    icon: ListChecks,
    title: "Tell us how you actually drive",
    body: "11 quick questions grouped into core requirements, your everyday driving, and what matters to you (no jargon, about 3 minutes).",
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
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce || !containerRef.current) return;
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".stack-card", containerRef.current!);
      const segments = cards.length - 1;

      // All cards sit absolutely stacked on the exact same rect (see the
      // JSX below), so there is nothing underneath to show through -- only
      // opacity/scale, driven directly off one master ScrollTrigger's
      // progress, decide what's visible. This replaces an earlier attempt
      // that chained each card's un-pin point to a sibling that was also
      // being dynamically pinned; that dependency chain never actually
      // activated any pin at all (verified live: computed `position` on
      // every card stayed "relative" through the whole scroll range).
      // Driving every card from one onUpdate callback has no such chain.
      cards.forEach((c, i) => gsap.set(c, { opacity: i === 0 ? 1 : 0, scale: 1 }));

      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top top+=64",
        end: () => `+=${segments * window.innerHeight}`,
        pin: true,
        scrub: 0.5,
        onUpdate: (self) => {
          const progress = self.progress * segments; // 0..segments
          cards.forEach((card, i) => {
            // A "tent" function: opacity peaks at 1 exactly when progress
            // reaches this card's own index, and falls off linearly toward
            // its neighbors on either side -- a clean crossfade with no
            // special-casing needed for the first or last card.
            const opacity = Math.max(0, 1 - Math.abs(progress - i));
            const overtaken = Math.min(Math.max(progress - i, 0), 1); // 0 until superseded, ramps to 1 after
            gsap.set(card, { opacity, scale: 1 - overtaken * 0.06 });
          });
        },
      });
    }, containerRef);
    return () => ctx.revert();
  }, [reduce]);

  return (
    <section id="how-it-works" className="bg-paper">
      <div className="mx-auto max-w-6xl px-6 pt-20 sm:pt-24">
        <RevealOnScroll className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-balance text-ink sm:text-4xl">
            From confused to confident, in four steps
          </h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            No dealer visits, no 20-tab browser research marathon. Just your actual driving life, matched against
            real evidence.
          </p>
        </RevealOnScroll>
      </div>

      <div ref={containerRef} className="relative mt-8 min-h-[62vh] sm:min-h-[68vh]">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="stack-card absolute inset-0 flex items-center bg-paper"
            style={{ zIndex: i + 1 }}
          >
            <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-[auto_1fr]">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-navy-900 font-mono text-2xl font-medium text-stage-ink sm:h-28 sm:w-28">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="max-w-xl">
                <step.icon className="mb-4 h-7 w-7 text-accent-gold" strokeWidth={1.75} />
                <p className="font-display text-2xl font-semibold text-ink sm:text-3xl">{step.title}</p>
                <p className="mt-3 text-base leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-20 sm:pb-24 pt-10">
        <button
          onClick={() => onStart("how_it_works")}
          className="flex items-center gap-2 rounded-full bg-navy-900 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-950 active:scale-[0.98]"
        >
          {PRIMARY_CTA}
          <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
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
  return (
    <section className="bg-paper py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <RevealOnScroll className="max-w-lg">
          <h2 className="font-display text-3xl font-bold text-balance text-ink sm:text-4xl">
            This is what &ldquo;evidence-backed&rdquo; actually looks like
          </h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Every reason on a CarDhoondo result links back to a real claim like this one, with a plain-language
            verdict, an honest confidence level, and the actual quote it came from. Not a mystery score.
          </p>
        </RevealOnScroll>

        <TiltCard className="rounded-[20px] border border-border bg-paper-raised p-7 shadow-card sm:p-8">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Kia Seltos · Ride quality over rough roads</p>

          <div className="mt-4 flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-positive" aria-hidden />
            <p className="font-display text-lg font-semibold text-ink">Strongly positive</p>
          </div>
          <p className="mt-1.5 text-sm text-ink-soft">High confidence, based on 11 independent reviews.</p>

          <div className="mt-6 flex gap-3 rounded-[14px] bg-positive-bg p-5">
            <Quote className="mt-0.5 h-5 w-5 shrink-0 text-positive" strokeWidth={1.75} />
            <p className="text-sm leading-relaxed text-ink">
              &ldquo;Ride quality is very impressive. It gobbles up the worst bumps in its stride without hesitation;
              the earlier Seltos was on the stiffer side, this one is really smooth and nice.&rdquo;
              <span className="mt-1.5 block text-xs font-medium text-ink-soft">
                From an independent expert review in our database
              </span>
            </p>
          </div>
        </TiltCard>
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
    <section id="why-cardhoondo" className="bg-paper-raised py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <RevealOnScroll className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-balance text-ink sm:text-4xl">
            Car buying in India is broken by too many opinions
          </h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Here&apos;s the honest comparison: what researching a car normally feels like, and what we built instead.
          </p>
        </RevealOnScroll>

        <div className="mt-14 flex flex-col items-stretch gap-6 lg:flex-row lg:items-center">
          <div className="flex-1 rounded-[20px] border border-border bg-negative-bg p-8">
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
            <motion.div
              initial={reduce ? false : { rotate: -20, scale: 0.7, opacity: 0 }}
              whileInView={{ rotate: 0, scale: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.3 }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-gold shadow-card"
            >
              <ArrowRight className="h-5 w-5 rotate-90 text-stage lg:rotate-0" strokeWidth={2.5} />
            </motion.div>
          </div>

          <div className="flex-1 rounded-[20px] border border-accent-gold/40 bg-paper-raised p-8 shadow-card">
            <p className="mb-6 font-display text-sm font-semibold uppercase tracking-wide text-navy-700">
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
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" strokeWidth={2.5} />
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
    <section id="faq" className="bg-paper py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <RevealOnScroll>
          <h2 className="text-center font-display text-3xl font-bold text-balance text-ink sm:text-4xl">
            Common questions about how CarDhoondo works
          </h2>
        </RevealOnScroll>

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
    <section id="contact" className="border-t border-border bg-navy-50 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <RevealOnScroll>
          <h2 className="font-display text-3xl font-bold text-ink text-balance sm:text-4xl">
            Questions, feedback, or found a bug? We read everything.
          </h2>
          <p className="mt-4 text-ink-soft">
            CarDhoondo is early and actively being built. If something felt off, you&apos;re
            interested in collaborating or partnering with us, or you just want to say hi, reach out
            directly.
          </p>
        </RevealOnScroll>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:mycardhoondo@gmail.com"
            className="flex items-center gap-2 rounded-full border border-navy-800 px-6 py-3 text-sm font-medium text-navy-800 transition hover:bg-navy-100"
          >
            <Mail className="h-4 w-4" strokeWidth={1.75} />
            mycardhoondo@gmail.com
          </a>
          <MagneticButton
            onClick={() => onStart("contact")}
            className="rounded-full bg-accent-gold px-6 py-3 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105"
          >
            {PRIMARY_CTA}
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Footer (light -- matches the page canvas, no contrast inversion, per    */
/* the Airbnb reference's own footer-light treatment)                     */
/* ---------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-border bg-paper-raised py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div>
          <div className="flex items-center justify-center gap-2.5 sm:justify-start">
            <Image src="/cardhoondo-icon.png" alt="" width={237} height={237} className="h-7 w-7" />
            <p className="font-display text-base font-bold text-ink">CarDhoondo</p>
          </div>
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
          &copy; {new Date().getFullYear()} CarDhoondo · Made for car buyers across India
        </p>
      </div>
    </footer>
  );
}
