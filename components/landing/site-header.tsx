import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoAnimation } from "@/components/logo-animation";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#roles", label: "Roles" },
  { href: "#stories", label: "Stories" },
  { href: "#contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-kvsr-deep/70 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold rounded-lg"
        >
          <LogoAnimation size={36} variant="nav" />
          <span className="font-display text-lg font-semibold text-white tracking-wide">
            KVSRIT
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/identify"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-kvsr-cta text-white text-sm font-semibold hover:bg-kvsr-cta/90 transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold focus-visible:ring-offset-2 focus-visible:ring-offset-kvsr-deep"
        >
          Open Dashboard
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
