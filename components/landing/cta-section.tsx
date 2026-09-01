"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./primitives";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-kvsr-deep py-20 sm:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[600px] max-h-[600px] rounded-full bg-kvsr-gold/10 blur-[120px] transform-gpu" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <Reveal>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight pb-1">
            Attendance in seconds. Marks in minutes. Your campus,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-kvsr-gold to-kvsr-orange">
              in sync
            </span>
            .
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-slate-300 mt-4 text-base sm:text-lg">
            Open your dashboard with face or ID and pick up right where you
            left off.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/identify"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-kvsr-cta text-white font-semibold hover:bg-kvsr-cta/90 transition-colors min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold focus-visible:ring-offset-2 focus-visible:ring-offset-kvsr-deep"
            >
              Open Dashboard
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="#contact"
              className="inline-flex items-center px-8 py-3.5 rounded-full text-slate-200 font-medium hover:text-white transition-colors min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold/60"
            >
              Questions? Contact us
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
