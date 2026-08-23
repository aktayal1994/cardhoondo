import type { Metadata } from "next";
import GuideLayout from "../../../components/GuideLayout";

const TITLE = "Why Does Everyone Have a Different Opinion on Which Car to Buy?";
const DESCRIPTION =
  "Asked chacha, asked colleagues, watched 15 YouTube videos — and everyone said something different. Here's why car advice in India always conflicts, and what actually helps.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guides/why-everyone-has-different-opinion" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "article" },
};

export default function Page() {
  return (
    <GuideLayout
      eyebrow="Decision paralysis"
      title={TITLE}
      slug="why-everyone-has-different-opinion"
      dek="You've asked around. You've watched the videos. And somehow you're more confused than when you started. That's not you being indecisive — it's how the advice is built."
    >
      <p>
        Almost every first-time car buyer in India goes through the same loop: ask a relative,
        ask a colleague, watch a dozen YouTube reviews, scroll a couple of Reddit threads — and
        end up with a pile of confident, contradictory opinions. &ldquo;Buy a Creta, it&rsquo;s
        never wrong.&rdquo; &ldquo;Skip the SUV craze, get a sedan for the same money.&rdquo;
        &ldquo;Diesel is dead, don&rsquo;t even consider it.&rdquo; &ldquo;My diesel has done
        90,000km with zero issues.&rdquo; None of these people are lying to you. The problem is
        what each of them is actually answering.
      </p>

      <h2>Everyone is answering a different question</h2>
      <p>
        Your chacha bought his car in a different city, for a different family size, at a
        different stage of life, and he&rsquo;s telling you what worked <em>for him</em>. Your
        colleague drives 15km a day on flat city roads; you might drive 40km including a stretch
        of broken highway. The YouTuber reviewing a car for &ldquo;driving enthusiasts&rdquo; is
        optimizing for something you may not care about at all. Every piece of advice is correct
        for the life it came from — it just rarely matches yours.
      </p>

      <h2>The advice you're getting is also structurally biased</h2>
      <p>
        This part rarely gets said out loud: a lot of the &ldquo;advice&rdquo; you encounter at
        the dealership isn&rsquo;t neutral. Dealers earn significantly more commission on
        higher-end variants, which is a large part of why base models keep getting stripped of
        basics like a stereo or alloy wheels — it nudges you up the price ladder. Even reviews and
        comparison articles online are frequently sponsored or built around affiliate/referral
        deals with manufacturers or dealer networks. None of this makes the advice worthless — it
        just means it isn&rsquo;t built around your situation, and sometimes it isn&rsquo;t even
        built around your interests.
      </p>

      <h2>More research often makes this worse, not better</h2>
      <p>
        The instinct when you&rsquo;re confused is to research more — one more video, one more
        forum thread, one more opinion to break the tie. In practice this usually adds more
        contradictory data points rather than resolving them, because you&rsquo;re still
        collecting opinions built for other people&rsquo;s lives. The fix isn&rsquo;t more
        research. It&rsquo;s starting from your own situation — how you actually drive, who rides
        with you, what you&rsquo;re actually worried about — and only then looking at what the
        evidence says for exactly that.
      </p>

      <h2>What actually helps</h2>
      <ul>
        <li>
          <strong>Start from your life, not the car.</strong> Road conditions, typical trip
          length, who&rsquo;s usually in the car, and where you park matter more to the right
          answer than any single spec.
        </li>
        <li>
          <strong>Weigh sources, don&rsquo;t just collect them.</strong> An owner&rsquo;s
          complaint after 40,000km carries different weight than a first-drive impression from a
          press event.
        </li>
        <li>
          <strong>Ask who&rsquo;s paid to tell you what.</strong> Not to be cynical — just to know
          which opinions are about your fit and which are about someone else&rsquo;s incentive.
        </li>
      </ul>

      <p>
        This is the exact problem CarDhoondo was built to solve. Instead of adding one more
        opinion to the pile, we ask about your actual driving life first, then match that against
        evidence pulled from real ownership reviews and expert test drives — and we don&rsquo;t
        take a commission from any dealer or manufacturer for what gets recommended. If a car
        doesn&rsquo;t have enough real evidence behind it yet, we say so, instead of guessing.
      </p>
    </GuideLayout>
  );
}
