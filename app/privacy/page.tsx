import type { Metadata } from "next";
import LegalPage from "../../components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What personal data CarDhoondo collects, why, who it is shared with, how long we keep it, and how you can access, correct or delete it.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" file="privacy.md" other={{ href: "/terms", label: "Terms of Use" }} />;
}
