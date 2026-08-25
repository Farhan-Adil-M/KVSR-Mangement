"use client";

import { motion, useInView, useSpring, useTransform } from "motion/react";
import { useRef, useEffect } from "react";

interface StatItemProps {
  value: number;
  label: string;
  suffix?: string;
  delay?: number;
}

function StatItem({ value, label, suffix = "", delay = 0 }: StatItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const springValue = useSpring(0, {
    duration: 1500,
    bounce: 0,
  });
  const displayValue = useTransform(springValue, (latest) =>
    Math.round(latest)
  );

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        springValue.set(value);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isInView, value, springValue, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.5, delay: delay / 1000 }}
      className="text-center px-6 sm:px-10"
    >
      <div className="text-3xl sm:text-4xl font-semibold text-white tabular-nums">
        <motion.span>{displayValue}</motion.span>
        {suffix}
      </div>
      <div className="text-sm text-kvsr-muted mt-1.5">{label}</div>
    </motion.div>
  );
}

const stats = [
  { value: 843, label: "Students" },
  { value: 41, label: "Faculty" },
  { value: 530, label: "Weekly Slots" },
];

export function StatsStrip() {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-0">
      {stats.map((stat, index) => (
        <div key={stat.label} className="flex items-center">
          <StatItem
            value={stat.value}
            label={stat.label}
            delay={index * 120}
          />
          {index < stats.length - 1 && (
            <div className="hidden sm:block w-px h-12 bg-white/15 mx-4 sm:mx-8" />
          )}
        </div>
      ))}
    </div>
  );
}
