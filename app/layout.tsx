import "./globals.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import GAPageTracker from "../components/GAPageTracker";
import CookieBanner from "../components/CookieBanner";
import BottomTabBar from "../components/BottomTabBar";

// Self-hosted (latin subset, downloaded from Google Fonts on 4 Oct 2026) since
// next/font/google started failing Vercel builds when Google sent it a font URL
// it could not parse. Same files the Google loader used to fetch.
const displayFont = localFont({
  src: [
    { path: "./fonts/SourceSerif4-variable-normal.woff2", weight: "500 700", style: "normal" },
    { path: "./fonts/SourceSerif4-variable-italic.woff2", weight: "500 700", style: "italic" },
  ],
  variable: "--font-display-face",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const bodyFont = localFont({
  src: [
    { path: "./fonts/BeVietnamPro-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/BeVietnamPro-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/BeVietnamPro-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

const dataFont = localFont({
  src: [{ path: "./fonts/JetBrainsMono-variable.woff2", weight: "400 500", style: "normal" }],
  variable: "--font-data",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

const SITE_URL = "https://cardhoondo.com";

export const viewport: Viewport = {
  themeColor: "#0a0908",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Google Search Console ownership proof for cardhoondo.com (also needed for Google sign-in brand verification).
  verification: { google: "7jFmUAnTrIx8Lmzyk9pjStao0eoRcBWBiu-8FqOfvG8" },
  title: {
    default: "Which Car to Buy in India? Unbiased Advice | CarDhoondo",
    template: "%s | CarDhoondo",
  },
  description:
    "Confused which car to buy in India? Answer 11 quick questions, get 2-3 evidence-backed car recommendations. No dealer commissions, no sponsored results.",
  keywords: [
    "which car to buy in India",
    "car recommendation India",
    "best car for first time buyer India",
    "unbiased car buying advice India",
    "car buying guide India",
    "confused which car to buy",
    "AI car recommendation India",
    "best car for family of 4 India",
    "EV or petrol which car to buy",
    "car finder India",
    "car suggestion tool India",
    "no dealer commission car advice",
    "first car India",
    "second car India",
    "SUV vs sedan India which to buy",
    "base model vs top variant car India",
    "how much car can I afford India",
    "best car for bad roads India",
  ],
  authors: [{ name: "CarDhoondo" }],
  creator: "CarDhoondo",
  applicationName: "CarDhoondo",
  appleWebApp: { capable: true, title: "CarDhoondo", statusBarStyle: "black-translucent" },
  category: "Automotive",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "CarDhoondo",
    title: "CarDhoondo - Which Car Should You Buy? Honest, Unbiased Car Recommendations",
    description:
      "Asked chacha. Asked colleagues. Watched 15 YouTube videos. Still confused which car to buy? Answer 11 quick questions and get 2-3 cars backed by real review evidence. No dealer commissions, no sponsored results.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "CarDhoondo - Your Perfect Car Found" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CarDhoondo - Honest, Unbiased Car Recommendations for India",
    description:
      "Answer 11 quick questions about how you drive and live. Get 2-3 cars backed by real review evidence. No dealer commissions, no sponsored results.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CarDhoondo",
    url: SITE_URL,
    logo: `${SITE_URL}/cardhoondo-logo.png`,
    description:
      "AI-powered car recommendation platform for first and second-time car buyers in India. Honest, unbiased recommendations backed by real review evidence. No dealer commissions, no sponsored results.",
    areaServed: {
      "@type": "Country",
      name: "India",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CarDhoondo",
    url: SITE_URL,
    description: "Honest, unbiased car recommendations for first and second-time buyers in India.",
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${displayFont.variable} ${bodyFont.variable} ${dataFont.variable}`}>
      <head>
        {/* Marks <html> when this browser recently had a session, so the "welcome back"
            space is reserved before the page hydrates (no layout jump, no request for
            everyone else). The cookie carries no identity. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: "try{if(document.cookie.indexOf('ch_hint=1')>-1)document.documentElement.setAttribute('data-auth','1')}catch(e){}",
          }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <BottomTabBar />
        <GAPageTracker />
        {/* Google Analytics is loaded by CookieBanner on every visit unless the
            visitor turned it off in "Cookie settings" (lib/cookieConsent.ts). */}
        <CookieBanner />
      </body>
    </html>
  );
}
