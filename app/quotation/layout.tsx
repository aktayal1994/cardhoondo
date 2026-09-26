import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check your car dealer quote: find hidden charges and save money",
  description:
    "Got a quote from a car dealer? Enter it and see where you can save: overpriced insurance, unnecessary accessories, extended warranty and service add-ons, and dealer charges, with the exact words to ask.",
  alternates: { canonical: "/quotation" },
};

export default function QuotationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
