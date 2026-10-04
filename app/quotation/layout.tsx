import type { Metadata } from "next";
import { pageMetadata, withBrand } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: withBrand("Check Your Car Dealer Quote for Hidden Charges"),
  description:
    "Enter a car dealer's quote and see where you can save on insurance, accessories, warranty and service add-ons and dealer charges, with what to ask.",
  path: "/quotation",
});

export default function QuotationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
