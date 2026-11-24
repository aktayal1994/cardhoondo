/**
 * Pages already close to page one in Google (average position 1 to 20 in the
 * Search Console export of 24 Nov 2026, ordered by impressions). Sitewide links
 * to them (footers, home, the comparisons index) tell Google they matter most,
 * which is the cheapest push into the top results.
 *
 * Refresh after each Search Console check (account: mycardhoondo@gmail.com):
 * drop pages that reached the top 5, add new ones sitting at 6 to 20. A slug
 * that stops being published is skipped on the home page and /compare
 * (they filter by the published list); footers link to it as written, so
 * remove it here too.
 */
export const POPULAR_COMPARISONS: { slug: string; label: string }[] = [
  { slug: "toyota-urban-cruiser-hyryder-vs-maruti-grand-vitara", label: "Hyryder vs Grand Vitara" },
  { slug: "toyota-innova-hycross-vs-mahindra-xuv-7xo", label: "Innova Hycross vs XUV 7XO" },
  { slug: "skoda-slavia-vs-volkswagen-virtus", label: "Slavia vs Virtus" },
  { slug: "mahindra-thar-roxx-vs-mahindra-scorpio-n", label: "Thar Roxx vs Scorpio N" },
  { slug: "maruti-fronx-vs-maruti-brezza", label: "Fronx vs Brezza" },
  { slug: "mahindra-xuv-7xo-vs-tata-safari", label: "XUV 7XO vs Safari" },
  { slug: "maruti-brezza-vs-hyundai-venue", label: "Brezza vs Venue" },
  { slug: "hyundai-venue-vs-kia-sonet", label: "Venue vs Sonet" },
  { slug: "maruti-grand-vitara-vs-hyundai-creta", label: "Grand Vitara vs Creta" },
  { slug: "tata-harrier-vs-mahindra-xuv-7xo", label: "Harrier vs XUV 7XO" },
];

export const POPULAR_CARS: { slug: string; label: string }[] = [
  { slug: "maruti-jimny", label: "Maruti Jimny" },
  { slug: "mahindra-thar-roxx", label: "Mahindra Thar Roxx" },
  { slug: "force-gurkha", label: "Force Gurkha" },
  { slug: "mahindra-xev-9s", label: "Mahindra XEV 9S" },
  { slug: "toyota-fortuner", label: "Toyota Fortuner" },
  { slug: "maruti-fronx", label: "Maruti Fronx" },
  { slug: "tata-sierra-ev", label: "Tata Sierra EV" },
  { slug: "tata-safari", label: "Tata Safari" },
];
