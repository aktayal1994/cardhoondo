export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return "Price unavailable";
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** "₹9,56,605 on-road in Indore" -- the city is shown so a buyer outside
 * Delhi knows whose price it is. Results saved before 3 Oct 2026 carry no
 * city and show the bare price. */
export function formatOnRoad(
  amount: number | null | undefined,
  city?: string | null,
  basis?: "city" | "estimate" | "delhi" | null,
): string {
  const price = formatINR(amount);
  if (amount == null || !city) return price;
  return `${price} on-road in ${city}${basis === "estimate" ? " (estimated)" : ""}`;
}

export function humanize(slug: string): string {
  return slug
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
