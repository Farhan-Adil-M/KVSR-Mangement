"use client";

import Link from "next/link";
import { ArrowRight, ArrowDown, ScanFace, Fingerprint, BellRing } from "lucide-react";
import { Reveal } from "./primitives";
import { ProductPreview } from "./product-preview";

const TRUST_CHIPS = [
  { icon: ScanFace, label: "Geofenced attendance" },
  { icon: Fingerprint, label: "Biometric enrollment" },
  { icon: BellRing, label: "Real-time notifications" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-kvsr-deep">
      {/* Background texture + glows */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-kvsr-cta/10 blur-[120px] -translate-y-1/3 translate-x-1/4 transform-gpu" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-kvsr-navy/50 blur-[100px] translate-y-1/3 -translate-x-1/4 transform-gpu" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-20">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* Copy — leads on mobile */}
          <div className="lg:col-span-7 order-1">
            <Reveal delay={0.05}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-kvsr-gold" />
                <span className="text-[11px] sm:text-xs font-medium text-slate-300 tracking-[0.15em] uppercase">
                  KVSRIT · Kurnool — Operations Platform
                </span>
              </span>
            </Reveal>

            <Reveal delay={0.15}>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-[1.08] tracking-tight pb-1">
                Run the{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-kvsr-gold to-kvsr-orange">
                  whole
                </span>{" "}
                campus from one screen.
              </h1>
            </Reveal>

            <Reveal delay={0.25}>
              <p className="text-base sm:text-lg text-slate-300 leading-[1.65] max-w-xl mt-5">
                Face-recognition attendance with geofenced check-ins, live
                timetables, marks and evaluations, biometric enrollment and
                department tools — built for the students, faculty and HODs of
                Dr. K.V. Subba Reddy Institute of Technology.
              </p>
            </Reveal>

            <Reveal delay={0.35}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-8">
                <Link
                  href="/identify"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-kvsr-cta text-white font-semibold hover:bg-kvsr-cta/90 transition-colors min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold focus-visible:ring-offset-2 focus-visible:ring-offset-kvsr-deep"
                >
                  Open Dashboard
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-slate-200 font-medium hover:text-white transition-colors min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold/60"
                >
                  Explore features
                  <ArrowDown size={15} aria-hidden="true" />
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.45}>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 mt-8">
                {TRUST_CHIPS.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <li key={chip.label} className="flex items-center gap-2 text-sm text-slate-300">
                      <Icon size={16} className="text-kvsr-gold shrink-0" aria-hidden="true" />
                      {chip.label}
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </div>

          {/* Product preview */}
          <div className="lg:col-span-5 order-2 flex flex-col items-center lg:items-end">
            <Reveal delay={0.2} className="w-full max-w-sm lg:max-w-none">
              <ProductPreview />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
