import type { Metadata } from "next";
import { pageMetadata, withBrand } from "../../lib/seo";
import LegalPage from "../../components/LegalPage";

export const metadata: Metadata = pageMetadata({
  title: withBrand("Privacy Policy"),
  description:
    "What personal data CarDhoondo collects, why, who it is shared with, how long we keep it, and how you can access, correct or delete it.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" file="privacy.md" other={{ href: "/terms", label: "Terms of Use" }} />;
}
