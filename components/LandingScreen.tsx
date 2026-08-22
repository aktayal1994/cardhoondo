"use client";

import Image from "next/image";
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
} from "lucide-react";

const FAQS = [
  {
    q: "How does CarDhoondo recommend a car?",
    a: "You answer 13 quick questions about how you actually drive — road conditions, family size, budget, and what matters most to you. We match your answers against a database of facts extracted from real ownership and expert car reviews, and recommend the 2–3 cars with the strongest evidence behind them for your specific situation.",
  },
  {
    q: "Is CarDhoondo really free? How do you make money?",
    a: "Yes — using CarDhoondo to find your car is free, with no signup required. We don't take commissions from dealers or manufacturers for a recommendation, that's the whole point. Once we're bigger, we may earn a small, clearly-disclosed referral fee on things like financing or insurance you choose to buy afterward — never on which car gets recommended to you.",
  },
  {
    q: "How is this different from CarDekho or CarWale?",
    a: "CarDekho and CarWale are catalogs — great for browsing specs, but they show you hundreds of cars and leave the choosing to you. CarDhoondo asks about your life first and narrows it down to 2–3 cars, with the actual review evidence for why each one fits, not just a spec sheet.",
  },
  {
    q: "Do I need to sign up or share my number to get a recommendation?",
    a: "No. Getting your recommendation takes about 3 minutes and doesn't require creating an account.",
  },
  {
    q: "What if a recommended car doesn't have enough review data?",
    a: "We say so, honestly. If a car doesn't have enough real review evidence yet, we tell you that directly instead of guessing — we'd rather admit a gap than fake confidence.",
  },
];

export default function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen bg-paper">
      {/* nav + hero are budgeted to fit one screen (min-h-dvh) so the CTA band
          is visible without scrolling on first load -- if content ever needs
          more room (e.g. large system font settings), min-h lets it grow
          rather than clipping anything. */}
      <div className="flex min-h-dvh flex-col">
        <Nav onStart={onStart} />
        <Hero onStart={onStart} />
      </div>
      <TrustBar />
      <HowItWorks onStart={onStart} />
      <WhyCarDhoondo />
      <Faq />
      <Contact onStart={onStart} />
      <Footer />
    </main>
  );
}

/* ---------------------------------------------------------------------- */
/* Nav                                                                     */
/* ---------------------------------------------------------------------- */

function Nav({ onStart }: { onStart: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center" aria-label="CarDhoondo home">
          <Image
            src="/cardhoondo-logo.png"
            alt="CarDhoondo — Your Perfect Car Found"
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
          <a href="#contact" className="transition hover:text-ink">
            Contact
          </a>
        </nav>
        <button
          onClick={onStart}
          className="rounded-full bg-accent-gold px-5 py-2.5 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
        >
          Find my car
        </button>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------------- */
/* Hero                                                                    */
/* ---------------------------------------------------------------------- */

const HERO_ALT =
  "A couple stands on a coastal road as CarDhoondo highlights one clear, confidently recommended car.";

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section id="top" className="flex flex-1 flex-col bg-paper">
      {/* One clean photo (no baked-in text), so headline placement/size is
          fully our own CSS -- fluid (clamp-based), not just breakpoint jumps,
          so it holds up while a window is being resized, not only at fixed
          device presets. Fills whatever room is left after the CTA band
          below; object-position leans toward the people/car (the photo's
          real subject) since cropping is purely aesthetic now -- nothing in
          the photo itself needs protecting from a crop anymore. */}
      <div className="relative min-h-[max(320px,34vw)] flex-1 overflow-hidden">
        <Image src="/hero-banner.jpg" alt={HERO_ALT} fill priority sizes="100vw" className="object-cover object-[91%_86%]" />

        {/* legibility scrim -- a fixed dark zone independent of the photo's
            own crop, so headline text stays readable no matter which part
            of the photo ends up behind it at a given width */}
        <div className="absolute inset-0 bg-gradient-to-b from-stage/90 via-stage/72 to-stage/30 sm:bg-gradient-to-r sm:from-stage/95 sm:via-stage/78 sm:to-stage/20" />

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
          image's share of the screen */}
      <div className="shrink-0 bg-stage stage-glow">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-5 text-center sm:flex-row sm:justify-between sm:gap-4 sm:py-6 sm:text-left">
          <p className="font-display text-lg font-semibold text-stage-ink sm:text-xl lg:text-2xl">
            CarDhoondo is the one clear answer to all of that.
          </p>
          <div className="flex flex-col items-center gap-1.5 sm:items-end">
            <button
              onClick={onStart}
              className="group flex items-center gap-2 rounded-full bg-accent-gold px-6 py-3 text-sm font-semibold text-stage shadow-lg shadow-black/30 transition hover:brightness-105 active:scale-[0.98] sm:px-8 sm:py-4 sm:text-base"
            >
              Find My Car
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" strokeWidth={2.25} />
            </button>
            <p className="text-xs text-stage-ink-soft sm:text-sm">13 questions · ~3 minutes · No signup required</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Trust bar                                                               */
/* ---------------------------------------------------------------------- */

function TrustBar() {
  return (
    <section className="border-b border-border bg-paper">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-6 py-16 sm:grid-cols-3">
        <TrustPoint
          icon={Ban}
          title="No dealer commissions"
          body="We don't take a cut from any dealer or manufacturer for a recommendation."
        />
        <TrustPoint
          icon={MessageCircleQuestion}
          title="No sponsored results"
          body="Every car shown is ranked purely on how well it fits your answers — never on who paid us."
        />
        <TrustPoint
          icon={ShieldCheck}
          title="Evidence, not opinion"
          body="Every reason we give is backed by a real ownership or expert review — you can see the quote."
        />
      </div>
    </section>
  );
}

function TrustPoint({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[20px] border border-border bg-paper-raised p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-navy-50">
        <Icon className="h-5 w-5 text-navy-700" strokeWidth={1.75} />
      </div>
      <p className="font-display font-semibold text-ink">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* How it works                                                            */
/* ---------------------------------------------------------------------- */

const STEPS = [
  {
    icon: ListChecks,
    title: "Tell us how you actually drive",
    body: "13 quick questions grouped into your drives, who it's for, and what matters — no jargon, about 3 minutes.",
  },
  {
    icon: ScanSearch,
    title: "We weigh real review evidence",
    body: "Your answers are matched against facts extracted from real ownership and expert reviews — not marketing copy.",
  },
  {
    icon: Sparkles,
    title: "Get 2–3 cars, with reasons shown",
    body: "See exactly why each car fits, backed by real quotes and claim counts — not a black-box score.",
  },
  {
    icon: PhoneCall,
    title: "Talk to a real human, if you want",
    body: "No pressure, no automatic dealer handoff. Reach out only when you're ready.",
  },
];

function HowItWorks({ onStart }: { onStart: () => void }) {
  return (
    <section id="how-it-works" className="bg-paper py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="How it works"
          title="From confused to confident, in four steps"
          body="No dealer visits, no 20-tab browser research marathon. Just your actual driving life, matched against real evidence."
        />

        <div className="relative mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <svg
            className="pointer-events-none absolute left-0 right-0 top-6 hidden w-full lg:block"
            height="2"
            preserveAspectRatio="none"
            aria-hidden
          >
            <line x1="8%" y1="1" x2="92%" y2="1" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="1 10" />
          </svg>
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 font-mono text-sm font-medium text-stage-ink">
                {String(i + 1).padStart(2, "0")}
              </div>
              <step.icon className="mb-3 h-5 w-5 text-accent-gold" strokeWidth={1.75} />
              <p className="font-display font-semibold text-ink">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          className="mt-14 flex items-center gap-2 rounded-full bg-navy-900 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-950 active:scale-[0.98]"
        >
          Start the 13 questions
          <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Why CarDhoondo (pain points vs. our approach)                           */
/* ---------------------------------------------------------------------- */

const OLD_WAY = [
  "Conflicting advice everywhere — chacha, colleagues, YouTube, and Reddit all say something different, and the more you research, the more confused you get.",
  "Dealer pressure and hidden charges — inflated insurance, forced accessories, and upsells you never asked for.",
  "The variant trap — base models stripped of essentials to push you toward a pricier top trim.",
  "EV or petrol? Diesel or hybrid? — generic articles, no answer for your specific life.",
];

const NEW_WAY = [
  "One clear recommendation, not fifty opinions to reconcile yourself.",
  "No dealer commissions, no sponsored results — every ranking is answer-driven, not paid for.",
  "Every reason is backed by a real review quote you can read yourself.",
  "Matched to how you actually drive and live — not a generic buyer segment.",
];

function WhyCarDhoondo() {
  return (
    <section id="why-cardhoondo" className="bg-stage stage-glow py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Why CarDhoondo"
          title="Car buying in India is broken by too many opinions"
          body="Here's the honest comparison — what researching a car normally feels like, and what we built instead."
          dark
        />

        <div className="mt-14 flex flex-col items-stretch gap-6 lg:flex-row lg:items-center">
          <div className="flex-1 rounded-[20px] border border-stage-border bg-stage-raised p-8">
            <p className="mb-6 font-display text-sm font-semibold uppercase tracking-wide text-stage-ink-soft">
              The usual way
            </p>
            <ul className="space-y-5">
              {OLD_WAY.map((point) => (
                <li key={point} className="flex gap-3 text-sm leading-relaxed text-stage-ink-soft">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-negative" strokeWidth={2.5} />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-center self-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-gold shadow-lg shadow-black/30">
              <ArrowRight className="h-5 w-5 rotate-90 text-stage lg:rotate-0" strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex-1 rounded-[20px] border border-accent-gold/30 bg-stage-raised p-8">
            <p className="mb-6 font-display text-sm font-semibold uppercase tracking-wide text-accent-gold-soft">
              The CarDhoondo way
            </p>
            <ul className="space-y-5">
              {NEW_WAY.map((point) => (
                <li key={point} className="flex gap-3 text-sm leading-relaxed text-stage-ink">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" strokeWidth={2.5} />
                  {point}
                </li>
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
        <SectionHeading
          eyebrow="FAQ"
          title="Common questions about how CarDhoondo works"
          body=""
          center
        />

        <dl className="mt-12 divide-y divide-border">
          {FAQS.map((f) => (
            <div key={f.q} className="py-6">
              <dt className="font-display font-semibold text-ink">{f.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink-soft">{f.a}</dd>
            </div>
          ))}
        </dl>
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

function Contact({ onStart }: { onStart: () => void }) {
  return (
    <section id="contact" className="border-t border-border bg-navy-50 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-navy-600">
          Contact us
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold text-ink text-balance sm:text-4xl">
          Questions, feedback, or found a bug? We read everything.
        </h2>
        <p className="mt-4 text-ink-soft">
          CarDhoondo is early and actively being built. If something felt off, or you just want to
          say hi, reach out directly.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:hello@cardhoondo.com"
            className="flex items-center gap-2 rounded-full border border-navy-800 px-6 py-3 text-sm font-medium text-navy-800 transition hover:bg-navy-100"
          >
            <Mail className="h-4 w-4" strokeWidth={1.75} />
            hello@cardhoondo.com
          </a>
          <button
            onClick={onStart}
            className="rounded-full bg-accent-gold px-6 py-3 text-sm font-semibold text-stage shadow-sm transition hover:brightness-105 active:scale-[0.98]"
          >
            Or just find my car
          </button>
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
    <footer className="bg-stage py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <div className="flex items-center justify-center gap-2.5 sm:justify-start">
            <Image src="/cardhoondo-icon.png" alt="" width={237} height={237} className="h-7 w-7" />
            <p className="font-display text-base font-bold text-stage-ink">CarDhoondo</p>
          </div>
          <p className="mt-2 text-sm text-stage-ink-soft">
            No dealer commissions. No sponsored results. Just the car that fits your life.
          </p>
        </div>
        <p className="text-xs text-stage-ink-soft">
          &copy; {new Date().getFullYear()} CarDhoondo · Made for car buyers across India
        </p>
      </div>
    </footer>
  );
}

/* ---------------------------------------------------------------------- */
/* Shared section heading                                                  */
/* ---------------------------------------------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  body,
  dark = false,
  center = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  dark?: boolean;
  center?: boolean;
}) {
  return (
    <div className={center ? "text-center" : "max-w-2xl"}>
      <p
        className={`font-display text-sm font-semibold uppercase tracking-wide ${
          dark ? "text-accent-gold-soft" : "text-navy-600"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 font-display text-3xl font-bold text-balance sm:text-4xl ${
          dark ? "text-stage-ink" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {body && (
        <p className={`mt-4 leading-relaxed ${dark ? "text-stage-ink-soft" : "text-ink-soft"}`}>
          {body}
        </p>
      )}
    </div>
  );
}
