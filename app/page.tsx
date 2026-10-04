import HomePageClient from "../components/HomePageClient";
import type { HomeCar, HomeComparison } from "../components/AppHome";
import { fetchFeaturedCarSummaries } from "../lib/data/fetchCarPage";
import { fetchPublishedComparisons } from "../lib/data/fetchComparisons";
import { carIdToSlug } from "../lib/cars/featured";
import { fuelLabel, priceRangeText } from "../lib/cars/format";

export const revalidate = 86400;

const FUEL_ORDER = ["Petrol", "Diesel", "CNG", "Hybrid", "Electric"];

/** Real cars for the phone home screen's swipeable rows. If the data is
 * unreachable the rows are simply left out; the page still works. */
async function loadHomeData(): Promise<{ cars: HomeCar[]; comparisons: HomeComparison[] }> {
  try {
    const [summaries, pairs] = await Promise.all([fetchFeaturedCarSummaries(), fetchPublishedComparisons()]);
    const cars = summaries
      .filter((c) => c.onSale)
      .sort((a, b) => b.sourceCount - a.sourceCount)
      .slice(0, 10)
      .map((c) => ({
        slug: carIdToSlug(c.carId),
        name: c.name,
        brand: c.brand,
        price: priceRangeText(c.priceMin, c.priceMax),
        fuels: Array.from(new Set(c.fuels.map(fuelLabel))).sort((x, y) => FUEL_ORDER.indexOf(x) - FUEL_ORDER.indexOf(y)),
        sourceCount: c.sourceCount,
      }));
    const comparisons = pairs.slice(0, 8).map((p) => ({ slug: p.slug, label: `${p.a.model} vs ${p.b.model}` }));
    return { cars, comparisons };
  } catch {
    return { cars: [], comparisons: [] };
  }
}

export default async function HomePage() {
  const { cars, comparisons } = await loadHomeData();
  return <HomePageClient cars={cars} comparisons={comparisons} />;
}
