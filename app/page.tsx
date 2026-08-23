"use client";

import { useRouter } from "next/navigation";
import LandingScreen from "../components/LandingScreen";

/**
 * The questionnaire itself now lives at real routes under /questionnaire/*
 * (intro -> core-requirements -> everyday-driving -> what-matters -> /results)
 * instead of being driven entirely by client state on this page -- see
 * app/questionnaire/*\/page.tsx. This page is just the landing screen; every
 * "Find my car" CTA navigates into the flow's first real URL.
 */
export default function HomePage() {
  const router = useRouter();
  return <LandingScreen onStart={() => router.push("/questionnaire/intro")} />;
}
