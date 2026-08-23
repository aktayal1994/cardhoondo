import type { Metadata } from "next";
import GuideLayout from "../../../components/GuideLayout";
import {
  VariantLadderVisual,
  QuoteBreakdownVisual,
  UrgencyVisual,
  EmiVsTotalVisual,
} from "../../../components/guides/DealerTricksVisuals";

const TITLE = "5 Car Dealer Tricks First-Time Buyers in India Should Know";
const DESCRIPTION =
  "5 real car dealer tricks first-time buyers in India run into — from variant pricing to EMI framing — plus practical car buying tips and exactly what to check before you sign.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guides/dealer-tricks-first-car" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "article",
    images: [{ url: "/guides-dealer-tricks-hero.jpg", width: 1536, height: 1024, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/guides-dealer-tricks-hero.jpg"],
  },
};

export default function Page() {
  return (
    <GuideLayout
      eyebrow="Before you sign"
      title={TITLE}
      slug="dealer-tricks-first-car"
      heroImage={{
        src: "/guides-dealer-tricks-hero.jpg",
        alt: "A first-time car buyer studies a dealership quotation with a salesperson across the desk — 5 Dealer Tricks First-Time Buyers in India Should Know",
        width: 1536,
        height: 1024,
      }}
      dek="Buying your first car is exciting — and that excitement is exactly what a well-run showroom is built around. None of what follows means dealers are out to get you; it means the process has a structure, and knowing that structure is what actually protects you."
    >
      <p>
        You&rsquo;ve compared models online for weeks. You&rsquo;ve picked the one you want. You
        walk into the showroom feeling ready — and forty minutes later you&rsquo;re staring at a
        quotation with line items you didn&rsquo;t ask for, a salesperson mentioning a
        &ldquo;today only&rdquo; discount, and a growing urge to just sign and get it over with.
        If that sounds familiar, you&rsquo;re not bad at negotiating — you just walked in without
        knowing how the process is designed to work. A handful of patterns show up across almost
        every Indian dealership, for almost every brand, and once you know them, they stop being
        confusing.
      </p>
      <p>
        These aren&rsquo;t really &ldquo;first-time car buyer mistakes&rdquo; so much as a process
        nobody explains to you upfront. This isn&rsquo;t a takedown of car dealers either —
        showrooms run on real, thin margins, and every business nudges customers toward
        higher-margin choices somewhere. The goal here is simple: understand how car buying
        actually works in India, so every rupee you spend is one you meant to spend.
      </p>

      <h2>1. The variant ladder</h2>
      <p>
        Every model you&rsquo;re considering comes in a base, mid, and top variant — and the base
        variant is often built to feel like the compromise option, sometimes missing things that
        cost very little to include, like a touchscreen or alloy wheels. That&rsquo;s a common
        industry pricing pattern, not something specific to any one dealer: make the entry price
        look attractive on paper, then make the next step up feel like the &ldquo;real&rdquo;
        version of the car. It&rsquo;s a big part of why so many walk-in buyers end up leaving
        with something above the base variant.
      </p>
      <p>
        <strong>What to actually do:</strong>
      </p>
      <ul>
        <li>Before you go in, list your non-negotiable features (just 3–4) separately from nice-to-haves.</li>
        <li>Ask for the on-road price of every variant, not just the one you&rsquo;re leaning toward.</li>
        <li>Do the variant comparison math yourself: extra cost ÷ features you actually asked for. If a ₹70,000 jump buys two features you don&rsquo;t care about, that&rsquo;s your answer.</li>
      </ul>

      <VariantLadderVisual />

      <h2>2. The quotation with line items you didn&rsquo;t ask for</h2>
      <p>
        The final &ldquo;on-road price&rdquo; you&rsquo;re quoted is rarely just the car&rsquo;s
        ex-showroom price. It typically bundles RTO registration and insurance with — this is the
        part worth double-checking — dealer-arranged accessories or an extended warranty you may
        not have asked for. Dealer-fitted car dealer insurance and accessory packages can be
        priced higher than what you&rsquo;d pay going directly to an insurer or an aftermarket
        shop. That isn&rsquo;t true of every dealer, but it&rsquo;s common enough to be worth
        checking every single time.
      </p>
      <p>
        <strong>What to actually do:</strong>
      </p>
      <ul>
        <li>Ask for the full quotation broken down line by line before agreeing to anything.</li>
        <li>Get an independent insurance quote — even a 5-minute one online — before accepting the dealer&rsquo;s.</li>
        <li>Ask directly: &ldquo;Which of these are mandatory, and which are optional?&rdquo; Anything the dealer can&rsquo;t clearly justify as mandatory, you&rsquo;re allowed to decline.</li>
      </ul>

      <QuoteBreakdownVisual />

      <h2>3. The &ldquo;only today&rdquo; discount</h2>
      <p>
        A discount that expires &ldquo;today&rdquo; is one of the oldest tools in retail, not just
        car sales — and it works by removing your ability to compare before deciding. Sometimes
        it&rsquo;s genuinely tied to a month-end sales target and really is time-bound. Often,
        though, a similar number is available again next week, or at the next showroom down the
        road.
      </p>
      <p>
        <strong>What to actually do:</strong>
      </p>
      <ul>
        <li>Ask the dealer to put any real discount in writing — a quotation with a validity date — rather than relying on a verbal promise.</li>
        <li>Call or visit one more dealership for the same model before deciding. A five-minute comparison costs you nothing.</li>
        <li>Treat &ldquo;I need an answer right now&rdquo; as a signal to slow down, not speed up.</li>
      </ul>

      <UrgencyVisual />

      <h2>4. &ldquo;It&rsquo;s only ₹2,000 more a month&rdquo;</h2>
      <p>
        This is one of the most relatable pressure points in the entire process, especially if
        you&rsquo;re financing your first car. Reframing a bigger, better-equipped variant as
        &ldquo;only ₹2,000 more per month&rdquo; sounds small — but stretched across a 5-year
        loan, that&rsquo;s ₹1,20,000 more, before interest. EMI framing is designed to make a
        decision feel smaller than it is, because a monthly number is easier to say yes to than a
        total one.
      </p>
      <p>
        <strong>What to actually do:</strong>
      </p>
      <ul>
        <li>Always ask for the total amount payable over the full loan tenure, not just the EMI, before comparing two variants or two loan offers.</li>
        <li>Run the same loan amount through two or three lenders, your own bank included — dealer-arranged financing isn&rsquo;t always the cheapest option available to you.</li>
        <li>If a bigger variant barely changes the EMI, ask why. Sometimes it&rsquo;s a longer tenure, not a better deal.</li>
      </ul>

      <EmiVsTotalVisual />

      <h2>5. Confident claims that are hard to check in the room</h2>
      <p>
        &ldquo;Best-in-class,&rdquo; &ldquo;most reliable in this segment,&rdquo;
        &ldquo;everyone&rsquo;s buying this one this month&rdquo; — these get said often, and some
        of them may even be true. The issue isn&rsquo;t that they&rsquo;re lies; it&rsquo;s that a
        showroom floor is a hard place to fact-check anything, which is exactly when they get
        said.
      </p>
      <p>
        <strong>What to actually do — the core of dealership negotiation:</strong>
      </p>
      <ul>
        <li>Write down any specific factual claim (mileage, reliability, safety rating) and verify it independently — a two-minute search is enough for most of these.</li>
        <li>Prioritise real ownership reviews and independent expert test drives over anything said inside the showroom.</li>
        <li>If a claim is genuinely true, it&rsquo;ll still be true after you&rsquo;ve checked it — there&rsquo;s no cost to confirming it, and it&rsquo;s the simplest way to negotiate with car dealers from a position of knowing more, not less.</li>
      </ul>

      <h2>Things to check before buying a new car: a quick checklist</h2>
      <ul>
        <li>Your top 3–4 non-negotiable features, decided in advance</li>
        <li>The on-road price for at least 2 variants, not just the one you want</li>
        <li>One independent insurance quote</li>
        <li>The total amount payable, not just the EMI, from at least one other lender</li>
        <li>A second dealership&rsquo;s quote for the same model, for comparison</li>
      </ul>
      <p>
        Bookmark this list — it&rsquo;s meant to be reopened the day you actually walk into a
        showroom, not just read once.
      </p>

      <h2>How CarDhoondo fits in</h2>
      <p>
        Most of the pressure inside a dealership shows up in the gap between what you&rsquo;re
        fairly sure you want and what you&rsquo;re actually sure you need. CarDhoondo is built to
        close that gap before you ever walk in: answer a few questions about how you actually
        drive and live, and we match that against real ownership and expert review evidence to
        tell you which 2–3 cars — and realistically, which variant — genuinely fit you. Walking in
        already knowing your answer is the single biggest advantage you can have in that
        conversation.
      </p>
    </GuideLayout>
  );
}
