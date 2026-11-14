"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Ban,
  BookOpenCheck,
  CarFront,
  Check,
  Clock,
  IndianRupee,
  ListChecks,
  Mail,
  MessagesSquare,
  PhoneCall,
  Plus,
  Quote,
  Scale,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import AccountMenu from "../AccountMenu";
import { CountUp, Reveal, RoadCar, StepAnim, type StepAnimKind } from "./Animations";
import MobileMenu from "../MobileMenu";
import WelcomeBackStrip from "../WelcomeBackStrip";
import { CookieSettingsButton } from "../CookieBanner";
import AppHome, { type HomeCar, type HomeComparison } from "../AppHome";
import { BRAND_LOGOS } from "../../lib/brandLogos";
import { JOURNEY, type JourneyTool } from "../../lib/journey";
import { trackEvent } from "../../lib/analytics";

/**
 * The home page. Panes alternate between a
 * denim block and plain white; type is one friendly sans at modest weights;
 * corners are soft (8px buttons, 14px cards) and there is one shadow tier.
 * No glows, gradients or scroll animation: the content does the work.
 */

interface SiteStats {
  claims: number;
  cars: number;
  videos: number;
}

const FALLBACK_STATS: SiteStats = { claims: 9400, cars: 81, videos: 565 };

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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return stats;
}

const num = (n: number) => n.toLocaleString("en-IN");

type Start = (location: string) => void;

export default function RedesignHome({ cars, comparisons }: { cars: HomeCar[]; comparisons: HomeComparison[] }) {
  const router = useRouter();
  const stats = useLiveStats();
  const onStart: Start = (location) => {
    trackEvent("cta_click", { location });
    router.push("/questionnaire/core-requirements");
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-paper text-ink">
      <Nav onStart={onStart} />
      {/* Space is reserved by CSS (.welcome-slot) only for browsers that recently had a session. */}
      <div className="welcome-slot">
        <WelcomeBackStrip onStart={onStart} />
      </div>
      {/* Phones (and the Android app wrapper) open on an app-style home screen
          that stands in for the hero, the journey and the car list. */}
      <AppHome onStart={onStart} stats={stats} cars={cars} comparisons={comparisons} />
      <div className="hidden sm:block">
        <Hero onStart={onStart} />
      </div>
      <OldWayNewWay stats={stats} onStart={onStart} />
      <div className="hidden sm:block">
        <Journey onStart={onStart} />
      </div>
      <Steps onStart={onStart} />
      <Evidence />
      <div className="hidden sm:block">
        <Cars cars={cars} comparisons={comparisons} carsCount={stats.cars} />
      </div>
      <Independence stats={stats} />
      <Faq />
      <Contact onStart={onStart} />
      <Footer />
    </main>
  );
}

const WRAP = "mx-auto max-w-[1120px] px-5 sm:px-8";

type IconType = typeof Check;

/** A soft square behind a line icon: pale wash on white panes, translucent white on denim. */
function IconTile({ icon: Icon, onDenim = false }: { icon: IconType; onDenim?: boolean }) {
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
        onDenim ? "bg-white/15 text-white" : "bg-[var(--rd-wash)] text-[var(--rd-denim)]"
      }`}
      aria-hidden
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
    </span>
  );
}

/** A photo that always fills its rounded frame, at any window width. */
function Photo({
  src,
  alt,
  sizes,
  className = "",
  position = "center",
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  position?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[14px] bg-[var(--rd-wash)] ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" style={{ objectPosition: position }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */

function Brandmark() {
  return (
    <span className="flex items-center gap-2.5">
      <Image src="/cardhoondo-icon.png" alt="" width={237} height={237} priority className="h-8 w-8" />
      <span className="text-[19px] font-bold tracking-tight text-ink">CarDhoondo</span>
    </span>
  );
}

function Nav({ onStart }: { onStart: Start }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper">
      <div className={`${WRAP} flex h-16 items-center justify-between sm:h-[72px]`}>
        <a href="#top" aria-label="CarDhoondo home">
          <Brandmark />
        </a>
        <nav className="hidden items-center gap-8 text-[15px] font-medium text-ink-soft lg:flex">
          <a href="#how-it-works" className="hover:text-ink">
            How it works
          </a>
          <Link href="/cars" className="hover:text-ink">
            Car reviews
          </Link>
          <Link href="/guides" className="hover:text-ink">
            Guides
          </Link>
          <Link href="/quotation" className="hover:text-ink">
            Check my quote
          </Link>
          <a href="#about" className="hover:text-ink">
            About
          </a>
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          <AccountMenu />
          <span className="hidden sm:block">
            <button type="button" onClick={() => onStart("nav")} className="rd-btn rd-btn-sm">
              Find my car
            </button>
          </span>
          <MobileMenu onStart={onStart} />
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero: denim pane, a real sample of the evidence on the right, and   */
/* a white bar that sits across the pane's bottom edge.                */
/* ------------------------------------------------------------------ */

const SAMPLE_VERDICTS = [
  {
    car: "Kia Seltos",
    topic: "Ride quality over rough roads",
    verdict: "Strongly positive",
    good: true,
    basis: "High confidence, based on 11 independent reviews",
  },
  {
    car: "Tata Sierra",
    topic: "Fit and finish",
    verdict: "Strongly negative",
    good: false,
    basis: "High confidence, based on 17 independent reviews",
  },
];

function VerdictDot({ good, pop = false }: { good: boolean; pop?: boolean }) {
  return (
    <span
      style={pop ? { animationDelay: good ? "0.5s" : "0.9s" } : undefined}
      className={`${pop ? "rd-pop " : ""}flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${good ? "bg-positive" : "bg-negative"}`}
      aria-hidden
    >
      {good ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : <X className="h-3 w-3 text-white" strokeWidth={3} />}
    </span>
  );
}

function Hero({ onStart }: { onStart: Start }) {
  return (
    <section id="top" className="relative">
      <div className="rd-denim pb-28 pt-10 sm:pb-32 sm:pt-16 lg:pt-20">
        <div className={`${WRAP} grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16`}>
          <div>
            <h1 className="max-w-[15ch] text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[44px] lg:text-[48px]">
              Still confused which car to buy in India?
            </h1>
            <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft sm:text-lg">
              Tell us how you drive. We match it against what real owners and expert reviewers have said, and give you 2
              or 3 cars with the reasons shown.
            </p>
            {/* Phones: the button must be on the first screen, before the sample card. */}
            <div className="mt-6 sm:hidden">
              <button type="button" onClick={() => onStart("hero")} className="rd-btn rd-btn-white w-full">
                Find my car
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
              </button>
              <p className="mt-2 text-center text-sm text-ink-soft">11 questions, about 3 minutes</p>
            </div>
            <p className="mt-6 flex items-center gap-2 text-[15px] font-medium">
              <Check className="h-[18px] w-[18px]" strokeWidth={2.5} />
              No dealer commissions. No sponsored results.
            </p>
          </div>

          <div>
            <Photo
              src="/redesign/showroom.webp"
              alt="A couple in a showroom full of new cars, unsure which one to pick"
              position="50% 25%"
              sizes="(min-width: 1024px) 500px, 100vw"
              className="aspect-[3/2]"
              priority
            />
          <div className="rd-card rd-float relative mx-3 -mt-10 p-5 sm:mx-6 sm:-mt-14 sm:p-6">
            <p className="text-sm font-medium text-ink-faint">Taken from real CarDhoondo results</p>
            <ul className="mt-1 divide-y divide-border">
              {SAMPLE_VERDICTS.map((v) => (
                <li key={v.car} className="py-4">
                  <p className="text-sm text-ink-soft">
                    <span className="font-semibold text-ink">{v.car}</span> · {v.topic}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
                    <VerdictDot good={v.good} pop />
                    {v.verdict}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{v.basis}</p>
                </li>
              ))}
            </ul>
            <p className="border-t border-border pt-4 text-sm text-ink-soft">
              Good or bad, you see it the way reviewers said it.
            </p>
          </div>
          </div>
        </div>
      </div>

      {/* The start bar: half on denim, half on white. */}
      <div className={`${WRAP} relative z-10 -mt-16 sm:-mt-12`}>
        <div className="rd-card rd-float flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-0 sm:!rounded-full sm:p-2 sm:pl-0">
          <dl className="grid flex-1 grid-cols-3 divide-x divide-border">
            {(
              [
                ["Questions", "11 quick ones", ListChecks],
                ["Time", "About 3 minutes", Clock],
                ["You get", "2 or 3 cars", CarFront],
              ] as [string, string, IconType][]
            ).map(([label, value, Icon]) => (
              <div key={label} className="flex items-center gap-3 px-3 md:px-7">
                <Icon className="hidden h-6 w-6 shrink-0 text-[var(--rd-denim)] md:block" strokeWidth={1.75} aria-hidden />
                <div>
                  <dt className="text-xs font-medium text-ink-faint">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold lg:text-base">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <button type="button" onClick={() => onStart("hero")} className="rd-btn w-full sm:w-auto sm:!rounded-full sm:px-8">
            Find my car
            <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The usual way vs CarDhoondo                                         */
/* ------------------------------------------------------------------ */

const COMPARE_ROWS = [
  {
    topic: "The advice",
    icon: MessagesSquare,
    usual: "Chacha says diesel. Your colleague says wait. YouTube has 15 different top 10 lists.",
    ours: "One shortlist of 2 or 3 cars, picked for how you drive.",
  },
  {
    topic: "The proof",
    icon: Quote,
    usual: "“Trust me, it’s a good car.”",
    ours: "Every reason comes with the review quote behind it.",
  },
  {
    topic: "Who gains",
    icon: IndianRupee,
    usual: "The showroom earns more when you stretch to a costlier variant.",
    ours: "No dealer commissions. Nobody can pay to be on your list.",
  },
  {
    topic: "The bad news",
    icon: TriangleAlert,
    usual: "You find out the flaws after you own the car.",
    ours: "A car’s weak spots are shown as plainly as its strengths.",
  },
  {
    topic: "Your time",
    icon: Clock,
    usual: "Weeks of browser tabs, videos and showroom visits.",
    ours: "About 3 minutes.",
  },
];

function OldWayNewWay({ stats, onStart }: { stats: SiteStats; onStart: Start }) {
  const last = COMPARE_ROWS.length - 1;
  return (
    <section id="why-cardhoondo" className="pb-16 pt-14 sm:pb-24 sm:pt-20">
      <div className={WRAP}>
        <div className="grid items-center gap-8 md:grid-cols-[1fr_0.8fr] md:gap-12">
          <div>
            <h2 className="rd-h2 max-w-[24ch]">Asking around gets you opinions. This gets you an answer.</h2>
            <p className="mt-3 max-w-[52ch] leading-relaxed text-ink-soft">
              Car buying in India is broken by too many opinions. Here is what researching a car usually looks like,
              next to what we built instead.
            </p>
          </div>
          <Photo
            src="/redesign/advice.webp"
            alt="A man looking overwhelmed at his phone while an older relative gives him advice over tea"
            sizes="(min-width: 768px) 440px, 100vw"
            className="aspect-[3/2]"
          />
        </div>

        <div className="mt-10">
          <div className="hidden grid-cols-[150px_1fr_1fr] md:grid">
            <span />
            <p className="px-6 pb-4 text-sm font-semibold text-ink-soft">The usual way</p>
            <p className="rounded-t-[14px] bg-[var(--rd-denim)] px-6 pb-2 pt-5 text-sm font-semibold text-white">
              With CarDhoondo
            </p>
          </div>
          {COMPARE_ROWS.map((row, i) => (
            <Reveal key={row.topic} delay={i * 0.05} className="mt-6 grid gap-2 md:mt-0 md:grid-cols-[170px_1fr_1fr] md:gap-0">
              <p className="flex items-center gap-2.5 text-sm font-semibold md:items-start md:border-t md:border-border md:py-5 md:text-[15px]">
                <row.icon className="h-5 w-5 shrink-0 text-[var(--rd-denim)]" strokeWidth={1.75} aria-hidden />
                {row.topic}
              </p>
              <p className="flex gap-3 leading-relaxed text-ink-soft md:border-t md:border-border md:px-6 md:py-5">
                <X className="mt-1 h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden />
                <span>
                  <span className="sr-only">The usual way: </span>
                  {row.usual}
                </span>
              </p>
              <p
                className={`flex gap-3 rounded-[10px] bg-[var(--rd-denim)] px-4 py-3 font-medium leading-relaxed text-white md:rounded-none md:px-6 md:py-5 ${
                  i === last ? "md:rounded-b-[14px] md:pb-7" : ""
                }`}
              >
                <Check className="mt-1 h-4 w-4 shrink-0" strokeWidth={2.75} aria-hidden />
                <span>
                  <span className="sr-only">With CarDhoondo: </span>
                  {row.ours}
                </span>
              </p>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-border pt-10 sm:mt-16 md:flex-row md:items-end md:justify-between">
          <p className="max-w-[26ch] text-[22px] font-semibold leading-snug tracking-[-0.01em] sm:text-[26px]">
            You could watch 15 review videos this weekend. We have already been through{" "}
            <span className="text-[var(--rd-denim)]">
              <CountUp value={stats.videos} />
            </span>, line by line.
          </p>
          <button type="button" onClick={() => onStart("compare")} className="rd-btn self-start md:self-auto">
            Find my car
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The buying journey                                                  */
/* ------------------------------------------------------------------ */

const STAGE_PHOTOS: Record<string, { src: string; alt: string }> = {
  exploring: { src: "/redesign/exploring.webp", alt: "A woman comparing cars on her laptop at home" },
  negotiating: { src: "/redesign/negotiating.webp", alt: "A buyer going through a price quote with a showroom salesperson" },
  delivery: { src: "/redesign/delivery.webp", alt: "A family checking over their new car on delivery day" },
};

function Journey({ onStart }: { onStart: Start }) {
  return (
    <section id="journey" className="rd-denim py-14 sm:py-20">
      <div className={WRAP}>
        <h2 className="rd-h2 max-w-[24ch]">From the first search to the keys in your hand</h2>
        <p className="mt-3 max-w-[58ch] leading-relaxed text-ink-soft">
          Choosing the car is only the start. The same reviews tell you what to check, what to ask and what to push back
          on at every step after it.
        </p>

        <RoadCar />

        <div className="mt-6 grid gap-8 md:grid-cols-3 md:gap-6">
          {JOURNEY.map((stage, i) => (
            <Reveal key={stage.id} delay={i * 0.1}>
              <Photo
                src={STAGE_PHOTOS[stage.id].src}
                alt={STAGE_PHOTOS[stage.id].alt}
                sizes="(min-width: 768px) 350px, 100vw"
                className="mb-5 aspect-[3/2]"
              />
              <div className="flex items-baseline gap-3 border-b border-border pb-3">
                <span className="text-[28px] font-bold leading-none">{Number(stage.step)}</span>
                <div>
                  <p className="font-semibold">{stage.label}</p>
                  <p className="text-sm text-ink-soft">{stage.question}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {stage.tools.map((tool) => (
                  <JourneyCard key={tool.id} tool={tool} onStart={onStart} />
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function JourneyCard({ tool, onStart }: { tool: JourneyTool; onStart: Start }) {
  const Icon = tool.icon;
  const live = tool.href !== null;
  const body = (
    <>
      <span className="flex items-center justify-between">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
        {live ? (
          <ArrowRight className="h-[18px] w-[18px] text-[var(--rd-denim)]" strokeWidth={2} />
        ) : (
          <span className="text-xs font-medium">Coming soon</span>
        )}
      </span>
      <span className="mt-3 block font-semibold">{tool.title}</span>
      <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{tool.sub}</span>
    </>
  );
  if (tool.hero) {
    return (
      <button type="button" onClick={() => onStart("journey")} className="rd-card block p-5 text-left">
        {body}
      </button>
    );
  }
  if (tool.href) {
    return (
      <Link href={tool.href} className="rd-card block p-5">
        {body}
      </Link>
    );
  }
  // Not built yet: an outline on the denim, not a white card, so it reads as "later".
  return <div className="rounded-[14px] border border-border p-5">{body}</div>;
}

/* ------------------------------------------------------------------ */
/* How it works, in four steps                                         */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    anim: "checklist" as StepAnimKind,
    title: "Tell us how you actually drive",
    body: "11 quick questions about your must-haves, your everyday driving and what matters to you. No jargon, about 3 minutes.",
  },
  {
    anim: "scale" as StepAnimKind,
    title: "We weigh real review evidence",
    body: "Your answers are matched against facts taken from real ownership and expert reviews, not marketing copy.",
  },
  {
    anim: "car" as StepAnimKind,
    title: "Get 2-3 cars, with reasons shown",
    body: "See exactly why each car fits, backed by real quotes and review counts, not a black-box score.",
  },
  {
    anim: "phone" as StepAnimKind,
    title: "Talk to a real human, if you want",
    body: "No pressure, no automatic dealer handoff. Reach out only when you're ready.",
  },
];

function Steps({ onStart }: { onStart: Start }) {
  return (
    <section id="how-it-works" className="py-14 sm:py-20">
      <div className={WRAP}>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="rd-h2 max-w-[24ch]">How to pick the right car in India, in four steps</h2>
            <p className="mt-3 max-w-[58ch] leading-relaxed text-ink-soft">
              No dealer visits, no 20-tab research marathon. Just your actual driving life, matched against real
              evidence.
            </p>
          </div>
          <button type="button" onClick={() => onStart("how_it_works")} className="rd-btn self-start md:self-auto">
            Find my car
          </button>
        </div>
        <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <StepAnim kind={step.anim} />
              <span className="mt-4 block text-sm font-semibold text-[var(--rd-denim)]">Step {i + 1}</span>
              <p className="mt-1.5 text-lg font-semibold leading-snug">{step.title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Evidence: two real claims, one flattering and one not               */
/* ------------------------------------------------------------------ */

const QUOTES = [
  {
    car: "Kia Seltos",
    topic: "Ride quality over rough roads",
    verdict: "Strongly positive",
    good: true,
    basis: "High confidence, based on 11 independent reviews.",
    quote:
      "Ride quality is very impressive. It gobbles up the worst bumps in its stride without hesitation; the earlier Seltos was on the stiffer side, this one is really smooth and nice.",
  },
  {
    car: "Tata Sierra",
    topic: "Fit and finish",
    verdict: "Strongly negative",
    good: false,
    basis: "High confidence, based on 17 independent reviews.",
    quote:
      "The steering wheel is not screwed on straight at the straight-ahead position... the moment you point it straight it starts pulling to the left. And this is another example of that fit and finish issue that Tata Motors just can't seem to get right.",
  },
];

function Evidence() {
  return (
    <section className="rd-denim py-14 sm:py-20">
      <div className={`${WRAP} grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16`}>
        <div>
          <h2 className="rd-h2">Car recommendations backed by real owner and expert reviews</h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Every reason on your result links back to a claim like these: a plain verdict, how sure we are, and the
            actual words it came from. That includes a car&apos;s flaws. No mystery score.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {QUOTES.map((q) => (
            <figure key={q.car} className="rd-card flex flex-col p-5 sm:p-6">
              <p className="text-sm text-ink-soft">
                <span className="font-semibold text-ink">{q.car}</span> · {q.topic}
              </p>
              <p className="mt-3 flex items-center gap-2 text-lg font-semibold">
                <VerdictDot good={q.good} />
                {q.verdict}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{q.basis}</p>
              <blockquote className="mt-4 border-l-2 border-[var(--rd-denim)] pl-4 text-[15px] leading-relaxed">
                &ldquo;{q.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-3 pl-4 text-xs text-ink-faint">An independent expert review in our database</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Numbers + the independence promise (also "About")                   */
/* ------------------------------------------------------------------ */

const PROMISES = [
  {
    icon: Ban,
    title: "No dealer money, no sponsored picks",
    body: "Nobody pays to be on your shortlist. The only thing that decides a recommendation is the evidence.",
  },
  {
    icon: BookOpenCheck,
    title: "Evidence, not opinions",
    body: "Each recommendation is built from what real owners and expert reviewers said, good and bad.",
  },
  {
    icon: ShieldCheck,
    title: "Honest about what we don’t know",
    body: "If a car doesn’t have enough review data yet, we say so instead of guessing.",
  },
];

const VISION_MISSION = [
  {
    label: "Our vision",
    headline: "Every car buyer in India knows which car is right for them, and why.",
    body: "A first-time buyer should be able to walk into a showroom confident, not confused, and not at the mercy of whoever is talking loudest.",
  },
  {
    label: "Our mission",
    headline: "Support you through your car-buying journey.",
    body: "We help you choose the car that fits your life, and avoid unnecessary spends along the way, like a variant, add-on or accessory you never needed.",
  },
];

function Independence({ stats }: { stats: SiteStats }) {
  const figures: [number, string][] = [
    [stats.claims, "points pulled from reviews, weighed one by one"],
    [stats.videos, "review videos gone through, start to finish"],
    [stats.cars, "cars covered so far, and counting"],
    [25, "cities with real on-road prices for the quote check"],
  ];
  return (
    <section id="about" className="rd-denim py-14 sm:py-20">
      <div className={WRAP}>
        <h2 className="rd-h2 max-w-[24ch]">An unbiased car advisor with no dealer commissions</h2>
        <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">
          CarDhoondo is an independent, India-first car recommender, built for first and second-time buyers who are
          tired of the noise. We&apos;re early, and we say so.
        </p>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {figures.map(([value, label]) => (
            <div key={label}>
              <dd className="text-[40px] font-bold leading-none tracking-[-0.02em] sm:text-[56px]">
                <CountUp value={value} />
              </dd>
              <dt className="mt-2 max-w-[22ch] text-sm leading-snug text-ink-soft">{label}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-12 grid gap-8 border-t border-border pt-10 md:grid-cols-3 md:gap-10">
          {PROMISES.map((p) => (
            <div key={p.title}>
              <IconTile icon={p.icon} onDenim />
              <p className="mt-4 font-semibold">{p.title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {VISION_MISSION.map((v) => (
            <div key={v.label} className="rd-card p-6 sm:p-7">
              <p className="text-sm font-semibold text-[var(--rd-denim)]">{v.label}</p>
              <p className="mt-2 text-xl font-semibold leading-snug">{v.headline}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cars: real cars from the database, listed like a marketplace        */
/* ------------------------------------------------------------------ */

function Cars({ cars, comparisons, carsCount }: { cars: HomeCar[]; comparisons: HomeComparison[]; carsCount: number }) {
  if (cars.length === 0) return null;
  return (
    <section className="py-14 sm:py-20">
      <div className={WRAP}>
        <div className="flex items-end justify-between gap-4">
          <h2 className="rd-h2">Read what owners say before you visit a showroom</h2>
          <Link href="/cars" className="hidden shrink-0 text-[15px] font-semibold underline underline-offset-4 sm:block">
            All {carsCount} cars
          </Link>
        </div>

        <div className="rd-scroll -mx-5 mt-8 flex snap-x gap-4 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-5 sm:gap-y-8 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {cars.map((car) => {
            const logo = BRAND_LOGOS[car.brand];
            return (
              <Link key={car.slug} href={`/cars/${car.slug}`} className="group w-[62%] shrink-0 snap-start sm:w-auto">
                <span className="relative flex aspect-[4/3] items-center justify-center rounded-[14px] bg-[var(--rd-wash)]">
                  <span className="rd-float absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold">
                    {car.sourceCount} reviews read
                  </span>
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className="h-12 w-20 object-contain" loading="lazy" />
                  ) : (
                    <span className="text-lg font-semibold text-ink-soft">{car.brand}</span>
                  )}
                </span>
                <span className="mt-3 block font-semibold group-hover:underline">{car.name}</span>
                <span className="block text-sm text-ink-soft">{car.fuels.join(", ")}</span>
                {car.price && <span className="mt-0.5 block text-sm font-medium">{car.price}</span>}
              </Link>
            );
          })}
        </div>
        <Link href="/cars" className="mt-6 inline-block text-[15px] font-semibold underline underline-offset-4 sm:hidden">
          All {carsCount} cars
        </Link>

        {comparisons.length > 0 && (
          <div className="mt-12 border-t border-border pt-8">
            <p className="font-semibold">Stuck between two?</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
              {comparisons.map((c) => (
                <li key={c.slug}>
                  <Link href={`/compare/${c.slug}`} className="block text-[15px] font-medium hover:underline">
                    {c.label}
                    <span className="block text-sm font-normal text-ink-soft">Head to head</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

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

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  // Carries every answer for search engines whether or not it is open on screen.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <section id="faq" className="py-14 sm:py-20">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className={`${WRAP} grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16`}>
        <div>
          <h2 className="rd-h2">Car buying FAQs: how CarDhoondo works</h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Something else on your mind? Write to us and a person will reply.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="rounded-[14px] border border-border">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold"
                >
                  {f.q}
                  <Plus
                    className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                    strokeWidth={1.75}
                  />
                </button>
                {isOpen && <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-soft">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Contact + footer                                                    */
/* ------------------------------------------------------------------ */

function Contact({ onStart }: { onStart: Start }) {
  return (
    <section id="contact" className="rd-denim py-14 sm:py-20">
      <div className={`${WRAP} flex flex-col gap-8 md:flex-row md:items-center md:justify-between`}>
        <div>
          <h2 className="rd-h2 max-w-[24ch]">Questions, feedback, or found a bug? We read everything.</h2>
          <p className="mt-3 max-w-[56ch] leading-relaxed text-ink-soft">
            CarDhoondo is early and still being built. If something felt off, or you want to work with us, write to us
            directly.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
          <a
            href="mailto:mycardhoondo@gmail.com"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white px-5 font-semibold"
          >
            <Mail className="h-[18px] w-[18px]" strokeWidth={1.75} />
            mycardhoondo@gmail.com
          </a>
          <button type="button" onClick={() => onStart("contact")} className="rd-btn rd-btn-white">
            Find my car
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const columns: { head: string; links: { label: string; href: string }[] }[] = [
    {
      head: "Buying a car",
      links: [
        { label: "Find my car", href: "/questionnaire/core-requirements" },
        { label: "Check my dealer quote", href: "/quotation" },
        { label: "Car reviews", href: "/cars" },
        { label: "Guides", href: "/guides" },
      ],
    },
    {
      head: "CarDhoondo",
      links: [
        { label: "About", href: "#about" },
        { label: "FAQ", href: "#faq" },
        { label: "Contact", href: "#contact" },
      ],
    },
    {
      head: "Legal",
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  ];
  return (
    <footer className="border-t border-border bg-[#f7f7f7] py-10 sm:py-12">
      <div className={WRAP}>
        <div className="grid gap-8 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.head}>
              <p className="font-semibold">{col.head}</p>
              <ul className="mt-3 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
                {col.head === "Legal" && (
                  <li>
                    <CookieSettingsButton className="hover:underline" />
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <Brandmark />
          <p>&copy; {new Date().getFullYear()} CarDhoondo. Made for car buyers across India.</p>
        </div>
      </div>
    </footer>
  );
}
