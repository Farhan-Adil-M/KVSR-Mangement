import { SiteHeader } from "./site-header";
import { HeroSection } from "./hero-section";
import { MarqueeSection } from "./marquee-section";
import { StatsSection } from "./stats-section";
import { FeatureGrid } from "./feature-grid";
import { AudienceSection } from "./audience-section";
import { TestimonialsSection } from "./testimonials-section";
import { CtaSection } from "./cta-section";
import { Footer } from "./footer";
import { getAppConfig } from "@/lib/app-config";

/**
 * Server component: loads institution identity once and passes it down as
 * props to the client landing sections (spec I6 note — config values are
 * never re-hardcoded in client components).
 */
export async function LandingPage() {
  const config = await getAppConfig();

  return (
    <div id="top" className="min-h-screen bg-kvsr-deep">
      <SiteHeader institutionShortName={config.institutionShortName} />
      <main>
        <HeroSection
          institutionName={config.institutionName}
          institutionShortName={config.institutionShortName}
        />
        <MarqueeSection />
        <StatsSection />
        <FeatureGrid />
        <AudienceSection />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <Footer
        institutionName={config.institutionName}
        institutionShortName={config.institutionShortName}
        institutionPhone={config.institutionPhone}
        institutionEmail={config.institutionEmail}
      />
    </div>
  );
}
