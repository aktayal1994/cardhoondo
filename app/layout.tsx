import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Source_Serif_4, Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import GAPageTracker from "../components/GAPageTracker";

const GA_MEASUREMENT_ID = "G-YQ93EFYPEZ";

const displayFont = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display-face",
  display: "swap",
});

const bodyFont = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const dataFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-data",
  display: "swap",
});

const SITE_URL = "https://cardhoondo.com";

export const viewport: Viewport = {
  themeColor: "#0a0908",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    <html lang="en-IN" className={`${displayFont.variable} ${bodyFont.variable} ${dataFont.variable}`}>
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <GAPageTracker />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
          `}
        </Script>
      </body>
    </html>
  );
}
