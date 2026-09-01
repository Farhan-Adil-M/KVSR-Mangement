"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useReducedMotion, animate } from "motion/react";

export function Reveal({
  children,
  delay = 0,
  y = 20,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Counter({
  value,
  delay = 0,
}: {
  value: number;
  suffix?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!isInView || !ref.current) return;
    if (reduce) {
      ref.current.textContent = String(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.5,
      delay,
      ease: "easeOut",
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [isInView, value, reduce, delay]);

  return (
    <span ref={ref} className="tabular-nums">
      0
    </span>
  );
}

export function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
  };
  return (
    <div
      onMouseMove={reduce ? undefined : onMove}
      className={`group relative overflow-hidden rounded-2xl border border-kvsr-soft bg-white ${className ?? ""}`}
    >
      {!reduce && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(240px circle at var(--x, 50%) var(--y, 50%), rgba(212,115,20,0.12), transparent 70%)",
          }}
        />
      )}
      <div className="relative h-full">{children}</div>
    </div>
  );
}

export function Marquee({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}
    >
      <div className="flex w-max gap-10 animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused]">
        {children}
      </div>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  dark = false,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={`mb-10 sm:mb-12 ${className ?? ""}`}>
      <p
        className={`text-xs font-semibold uppercase tracking-[0.15em] mb-3 ${
          dark ? "text-kvsr-gold" : "text-kvsr-cta"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`font-display text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight ${
          dark ? "text-white" : "text-kvsr-ink"
        }`}
      >
        {title}
      </h2>
    </div>
  );
}
