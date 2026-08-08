export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return "Price unavailable";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function humanize(slug: string): string {
  return slug
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
