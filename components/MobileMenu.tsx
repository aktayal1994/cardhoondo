"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Car, HelpCircle, Menu, ReceiptIndianRupee, Search, ShieldCheck, X } from "lucide-react";

/**
 * Phone-only menu button for the top bar. The desktop nav links are hidden
 * below `sm`, so without this the quote check, car reviews and guides were
 * unreachable from the header on phones (and in the Android app).
 * `onStart`: pass the landing page's start handler so "Find my car" keeps its
 * analytics; elsewhere it is a plain link to the questionnaire.
 */
const ITEMS = [
  { href: "/quotation", icon: ReceiptIndianRupee, title: "Check a dealer quote", sub: "See where you can save on the quote a dealer gave you" },
  { href: "/cars", icon: Car, title: "Car reviews", sub: "What owners and experts say, car by car" },
  { href: "/guides", icon: BookOpen, title: "Buying guides", sub: "Plain-language help for first-time buyers" },
  { href: "/#why-cardhoondo", icon: ShieldCheck, title: "Why CarDhoondo", sub: "No dealer commissions, no sponsored results" },
  { href: "/#faq", icon: HelpCircle, title: "FAQ", sub: "How recommendations work, data and privacy" },
];

export default function MobileMenu({ onStart }: { onStart?: (location: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const rowClass = "flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-paper-raised active:bg-paper-raised";

  return (
    <div ref={wrapRef} className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition hover:text-ink"
      >
        {open ? <X className="h-6 w-6" strokeWidth={1.75} /> : <Menu className="h-6 w-6" strokeWidth={1.75} />}
      </button>
      {open && (
        <nav
          aria-label="All features"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-paper px-3 pb-4 pt-2 shadow-card"
        >
          {onStart ? (
            <button type="button" onClick={() => { close(); onStart("menu"); }} className={`${rowClass} w-full text-left`}>
              <MenuRow icon={Search} title="Find my car" sub="11 quick questions, 2–3 cars that fit you" accent />
            </button>
          ) : (
            <Link href="/questionnaire/core-requirements" onClick={close} className={rowClass}>
              <MenuRow icon={Search} title="Find my car" sub="11 quick questions, 2–3 cars that fit you" accent />
            </Link>
          )}
          {ITEMS.map((it) => (
            <Link key={it.href} href={it.href} onClick={close} className={rowClass}>
              <MenuRow icon={it.icon} title={it.title} sub={it.sub} />
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

function MenuRow({ icon: Icon, title, sub, accent }: { icon: typeof Menu; title: string; sub: string; accent?: boolean }) {
  return (
    <>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${accent ? "text-accent-rust" : "text-ink-soft"}`} strokeWidth={1.75} />
      <span>
        <span className={`block text-base font-semibold ${accent ? "text-accent-rust" : "text-ink"}`}>{title}</span>
        <span className="block text-sm text-ink-soft">{sub}</span>
      </span>
    </>
  );
}
