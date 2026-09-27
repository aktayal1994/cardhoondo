"use client";

import { useSearchParams } from "next/navigation";
import QuoteCheckFlow from "./QuoteCheckFlow";

/** The only part of /quotation that needs the browser's query string
 * (?car=&variant= deep links from a shortlisted car). Kept as its own client
 * component so the rest of the page can be server-rendered and crawlable. */
export default function QuotationFlowWithParams() {
  const searchParams = useSearchParams();
  const car = searchParams.get("car") ?? undefined;
  const variant = searchParams.get("variant") ?? undefined;
  return <QuoteCheckFlow initialCarId={car} initialVariantId={variant} />;
}
