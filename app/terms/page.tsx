import type { Metadata } from "next";
import { pageMetadata, withBrand } from "../../lib/seo";
import LegalPage from "../../components/LegalPage";

export const metadata: Metadata = pageMetadata({
  title: withBrand("Terms of Use"),
  description:
    "The terms for using CarDhoondo: what the service does, what it does not promise, acceptable use, and how to reach us.",
  path: "/terms",
});

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms of Use" file="terms.md" other={{ href: "/privacy", label: "Privacy Policy" }} />;
}
