import type { MetadataRoute } from "next";

// Makes cardhoondo.com installable ("Add to Home screen") and is the base for a Play Store (TWA) listing later.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CarDhoondo: Which Car to Buy",
    short_name: "CarDhoondo",
    description:
      "Honest car advice from real owner and expert reviews. Answer 11 questions, get 2-3 cars. No dealer commissions, no sponsored results.",
    id: "/",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0908",
    theme_color: "#0a0908",
    lang: "en-IN",
    categories: ["auto", "shopping", "lifestyle"],
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Find my car", url: "/questionnaire?source=app", icons: [{ src: "/app-icon-192.png", sizes: "192x192" }] },
      { name: "Check a dealer quote", url: "/quotation?source=app", icons: [{ src: "/app-icon-192.png", sizes: "192x192" }] },
    ],
  };
}
