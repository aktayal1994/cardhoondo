"use client";

import { useRouter } from "next/navigation";
import LandingScreen from "./LandingScreen";
import type { HomeCar, HomeComparison } from "./AppHome";
import { trackEvent } from "../lib/analytics";

/**
 * The questionnaire itself lives at real routes under /questionnaire/*
 * (core-requirements -> everyday-driving -> what-matters -> intro (name/
 * pincode/phone + consent, last to cut first-touch friction) -> /results).
 * This is just the landing screen; every "Find my car" CTA navigates into
 * the flow's first real URL.
 */
export default function HomePageClient({ cars, comparisons }: { cars: HomeCar[]; comparisons: HomeComparison[] }) {
  const router = useRouter();
  return (
    <LandingScreen
      cars={cars}
      comparisons={comparisons}
      onStart={(location) => {
        trackEvent("cta_click", { location });
        router.push("/questionnaire/core-requirements");
      }}
    />
  );
}
