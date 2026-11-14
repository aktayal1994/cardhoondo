"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * Small looping vector animations for the redesigned home page, drawn in code
 * (SVG + CSS keyframes in app/redesign/redesign.css) in the style of Rive
 * pieces. They only play while on screen, and hold still for visitors who ask
 * their device for reduced motion.
 */

/** Adds `is-in` while the element is on screen, so loops pause off screen. */
function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setOn(entry.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, on };
}

export type StepAnimKind = "checklist" | "scale" | "car" | "phone";

/** The animated picture for one of the four "how it works" steps. */
export function StepAnim({ kind }: { kind: StepAnimKind }) {
  const { ref, on } = useOnScreen<HTMLSpanElement>();
  return (
    <span
      ref={ref}
      aria-hidden
      className={`rd-anim flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--rd-wash)] text-[var(--rd-denim)] ${on ? "is-in" : ""}`}
    >
      <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {kind === "checklist" && (
          <>
            {[13, 24, 35].map((y, i) => (
              <g key={y}>
                <path className="rd-tick" style={{ animationDelay: `${i * 0.45}s` }} d={`M7 ${y} l3.5 3.5 l6 -7`} />
                <path d={`M23 ${y} h18`} opacity="0.45" />
              </g>
            ))}
          </>
        )}
        {kind === "scale" && (
          <>
            <path d="M24 9 v29 M15 39 h18" />
            <g className="rd-beam">
              <path d="M8 14 h32" />
              <path d="M8 14 l-4.5 11 a4.6 4.6 0 0 0 9 0 z" fill="var(--rd-wash)" />
              <path d="M40 14 l-4.5 11 a4.6 4.6 0 0 0 9 0 z" fill="var(--rd-wash)" />
            </g>
            <circle cx="24" cy="9" r="1.6" fill="currentColor" />
          </>
        )}
        {kind === "car" && (
          <>
            <g className="rd-bob">
              <path d="M5 30 v-5.5 l6 -2 l5 -8.5 h15 l6 8.5 l6 2 v5.5 z" fill="var(--rd-wash)" />
              <path d="M18 22 h13" opacity="0.45" />
              <circle cx="14.5" cy="31" r="4" fill="#fff" />
              <circle cx="33.5" cy="31" r="4" fill="#fff" />
            </g>
            <path className="rd-road" d="M2 41 h44" strokeDasharray="6 6" opacity="0.55" />
          </>
        )}
        {kind === "phone" && (
          <>
            <g className="rd-ring">
              <rect x="16" y="7" width="16" height="34" rx="3.5" fill="var(--rd-wash)" />
              <path d="M22 36 h4" />
            </g>
            <path className="rd-wave" d="M9 18 a10 10 0 0 0 0 12" />
            <path className="rd-wave" d="M39 18 a10 10 0 0 1 0 12" />
            <path className="rd-wave rd-wave-2" d="M4.5 14 a16 16 0 0 0 0 20" />
            <path className="rd-wave rd-wave-2" d="M43.5 14 a16 16 0 0 1 0 20" />
          </>
        )}
      </svg>
    </span>
  );
}

/** A little car that drives along a dashed road as the section scrolls past. */
export function RoadCar() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "start 0.25"] });
  const left = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const trail = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return (
    <div ref={ref} aria-hidden className="relative mt-8 h-9 pr-12">
      <div className="relative h-full">
        <div className="absolute inset-x-0 bottom-1 border-t-2 border-dashed border-white/35" />
        <motion.div className="absolute bottom-1 left-0 border-t-2 border-white" style={{ width: reduce ? "100%" : trail }} />
        <motion.div className="absolute bottom-[5px]" style={{ left: reduce ? "100%" : left }}>
          <svg viewBox="0 0 48 26" className="h-7 w-12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 19 v-5.5 l6 -2 l5 -8.5 h15 l6 8.5 l8 2 v5.5 z" fill="var(--rd-denim)" />
            <circle cx="13" cy="20" r="4" fill="var(--rd-denim)" />
            <circle cx="34" cy="20" r="4" fill="var(--rd-denim)" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}

/** Counts up to `value` the first time it scrolls into view. */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = (n: number) => {
      el.textContent = Math.round(n).toLocaleString("en-IN");
    };
    if (reduce || !inView || done.current) {
      show(value);
      return;
    }
    done.current = true;
    const controls = animate(0, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: show });
    return () => controls.stop();
  }, [inView, reduce, value]);
  // The real number is in the server HTML; the count only replaces it once seen.
  return <span ref={ref}>{value.toLocaleString("en-IN")}</span>;
}

/** Content rises gently into place the first time it is scrolled to. */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
