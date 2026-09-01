import { SiteHeader } from "./site-header";
import { HeroSection } from "./hero-section";
import { MarqueeSection } from "./marquee-section";
import { StatsSection } from "./stats-section";
import { FeatureGrid } from "./feature-grid";
import { AudienceSection } from "./audience-section";
import { TestimonialsSection } from "./testimonials-section";
import { CtaSection } from "./cta-section";
import { Footer } from "./footer";

export function LandingPage() {
  return (
    <div id="top" className="min-h-screen bg-kvsr-deep">
      <SiteHeader />
      <main>
        <HeroSection />
        <MarqueeSection />
        <StatsSection />
        <FeatureGrid />
        <AudienceSection />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
