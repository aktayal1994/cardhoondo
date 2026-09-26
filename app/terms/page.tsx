import type { Metadata } from "next";
import LegalPage from "../../components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The terms for using CarDhoondo: what the service does, what it does not promise, acceptable use, and how to reach us.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms of Use" file="terms.md" other={{ href: "/privacy", label: "Privacy Policy" }} />;
}
