"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Car, Home, ReceiptIndianRupee, Sparkles } from "lucide-react";
import { trackEvent } from "../lib/analytics";

/**
 * Phone-only bottom tab bar, the thing that makes the site feel like an app
 * (and the Android TWA wrapper). "Find my car" is the raised centre button,
 * since it is the product; the other tabs are the supporting features.
 * Hidden inside the questionnaire/results flow, which has its own bottom
 * buttons and should not be interrupted.
 */
const HIDE_ON = ["/questionnaire", "/results", "/saved", "/auth"];

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/cars", label: "Reviews", icon: Car, match: (p: string) => p.startsWith("/cars") || p.startsWith("/compare") },
  null, // the centre "Find my car" button
  { href: "/quotation", label: "Quote", icon: ReceiptIndianRupee, match: (p: string) => p.startsWith("/quotation") },
  { href: "/guides", label: "Guides", icon: BookOpen, match: (p: string) => p.startsWith("/guides") },
];

export default function BottomTabBar() {
  const pathname = usePathname() ?? "/";
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      {/* Spacer so the last bit of every page can scroll clear of the bar. */}
      <div aria-hidden className="tabbar-spacer sm:hidden" />
      <nav aria-label="Main" className="tabbar fixed inset-x-0 bottom-0 z-50 sm:hidden">
        <div className="relative mx-auto grid max-w-md grid-cols-5 items-end px-2">
          {TABS.map((tab) =>
            tab ? (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={tab.match(pathname) ? "page" : undefined}
                className={`group flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium transition active:scale-90 ${
                  tab.match(pathname) ? "text-accent-rust" : "text-ink-faint"
                }`}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition ${
                    tab.match(pathname) ? "bg-accent-rust/15" : ""
                  }`}
                >
                  <tab.icon className="h-[22px] w-[22px]" strokeWidth={tab.match(pathname) ? 2.25 : 1.75} />
                </span>
                {tab.label}
              </Link>
            ) : (
              <Link
                key="find"
                href="/questionnaire/core-requirements"
                onClick={() => trackEvent("cta_click", { location: "tabbar" })}
                className="flex flex-col items-center pb-2 text-[11px] font-semibold text-accent-rust-soft active:scale-95"
              >
                <span className="tabbar-fab relative -mt-7 mb-1 flex h-16 w-16 items-center justify-center rounded-full bg-accent-rust text-charcoal-950">
                  <Sparkles className="h-7 w-7" strokeWidth={2} />
                </span>
                Find my car
              </Link>
            ),
          )}
        </div>
      </nav>
    </>
  );
}
