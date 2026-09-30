"use client";

import { useRouter } from "next/navigation";
import LandingScreen from "../components/LandingScreen";
import { trackEvent } from "../lib/analytics";

/**
 * The questionnaire itself now lives at real routes under /questionnaire/*
 * (core-requirements -> everyday-driving -> what-matters -> intro (name/
 * pincode/phone + consent, moved to last to cut first-touch friction --
 * see CLAUDE.md) -> /results) instead of being driven entirely by client
 * state on this page -- see app/questionnaire/*\/page.tsx. This page is just
 * the landing screen; every "Find my car" CTA navigates into the flow's
 * first real URL.
 */
export default function HomePage() {
  const router = useRouter();
  return (
    <LandingScreen
      onStart={(location) => {
        trackEvent("cta_click", { location });
        router.push("/questionnaire/core-requirements");
      }}
    />
  );
}
