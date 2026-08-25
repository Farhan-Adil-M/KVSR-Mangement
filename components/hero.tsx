"use client";

import { SiteHeader } from "./landing/site-header";
import { HeroSection } from "./landing/hero-section";
import { FeatureGrid } from "./landing/feature-grid";
import { TrustBar } from "./landing/trust-bar";

export function Hero() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-kvsr-deep">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[65vw] h-[65vw] rounded-full bg-kvsr-cta/10 blur-[120px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[35vw] h-[35vw] rounded-full bg-kvsr-navy/50 blur-[100px] translate-y-1/3 -translate-x-1/4" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <SiteHeader />
      <HeroSection />
      <FeatureGrid />
      <TrustBar />
    </div>
  );
}
