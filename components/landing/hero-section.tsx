"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoAnimation } from "@/components/logo-animation";
import { ProductPreview } from "./product-preview";
import { StatsStrip } from "./stats-strip";

export function HeroSection() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left: copy */}
        <div className="order-2 lg:order-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-kvsr-gold" />
            <span className="text-[11px] sm:text-xs font-medium text-kvsr-muted tracking-[0.15em] uppercase">
              KVSRIT Operations Platform
            </span>
          </motion.div>

          <div className="overflow-hidden mb-5">
            <motion.h1
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="text-[44px] sm:text-5xl lg:text-6xl xl:text-[72px] font-semibold text-white leading-[1.08] tracking-tight"
            >
              One clear view of{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-kvsr-gold to-kvsr-orange">
                campus operations
              </span>
              .
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.42 }}
            className="text-base sm:text-lg text-kvsr-muted leading-[1.65] max-w-xl mb-8"
          >
            Timetables, attendance, faculty, and academic records—organized for
            the people who keep KVSRIT moving.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.52 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-10"
          >
            <Link
              href="/login"
              className="group px-6 py-3 bg-kvsr-cta text-white font-medium rounded-full hover:bg-kvsr-cta/90 transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold focus-visible:ring-offset-2 focus-visible:ring-offset-kvsr-deep min-h-[44px]"
            >
              Open Dashboard
              <ArrowRight
                size={16}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 text-white/80 font-medium hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold/50 rounded-full min-h-[44px]"
            >
              View Timetable →
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.62 }}
          >
            <StatsStrip />
          </motion.div>
        </div>

        {/* Right: product preview */}
        <div className="order-1 lg:order-2 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mb-8 lg:hidden"
          >
            <LogoAnimation size={100} variant="hero" />
          </motion.div>
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
