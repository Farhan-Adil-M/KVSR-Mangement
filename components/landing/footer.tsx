"use client";

import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  AtSign,
  MessageCircle,
  Send,
  ArrowUp,
} from "lucide-react";
import { LogoAnimation } from "@/components/logo-animation";

const PLATFORM_LINKS = [
  { label: "Timetables", href: "/identify" },
  { label: "Attendance", href: "/identify" },
  { label: "Marks & Evaluations", href: "/identify" },
  { label: "Biometrics", href: "/identify" },
];

const ROLE_LINKS = [
  { label: "Students", href: "/identify" },
  { label: "Faculty", href: "/identify" },
  { label: "HOD & Admin", href: "/identify" },
];

const SOCIALS = [
  { label: "Website", icon: Globe, href: "#" },
  { label: "Instagram", icon: AtSign, href: "#" },
  { label: "WhatsApp", icon: MessageCircle, href: "#" },
  { label: "Telegram", icon: Send, href: "#" },
];

const ACCREDITATIONS = [
  "AICTE",
  'NAAC "A+"',
  "NBA",
  "NIRF",
  "UGC",
  "JNTUA",
];

interface FooterProps {
  institutionName: string;
  institutionShortName: string;
  institutionPhone: string;
  institutionEmail: string;
}

export function Footer({
  institutionName,
  institutionShortName,
  institutionPhone,
  institutionEmail,
}: FooterProps) {
  return (
    <footer id="contact" className="scroll-mt-16 bg-kvsr-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-10 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <LogoAnimation size={48} variant="nav" alt={`${institutionShortName} crest`} />
              <div>
                <p className="font-display text-lg font-semibold">
                  {institutionShortName} Management
                </p>
                <p className="text-xs text-slate-400">{institutionShortName} · Kurnool</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              The operations platform of {institutionName}, Kurnool.
            </p>
          </div>

          {/* Platform */}
          <nav aria-label="Platform">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Platform
            </h3>
            <ul className="space-y-2.5">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-block py-1.5 -my-1.5 text-sm text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Roles */}
          <nav aria-label="Roles">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Roles
            </h3>
            <ul className="space-y-2.5">
              {ROLE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-block py-1.5 -my-1.5 text-sm text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Contact
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-slate-400">
                <MapPin size={16} className="text-kvsr-gold shrink-0 mt-0.5" aria-hidden="true" />
                {institutionName}, Kurnool, Andhra Pradesh 518218
              </li>
              <li>
                <a
                  href={`tel:${institutionPhone}`}
                  className="inline-flex items-center gap-2.5 py-1.5 -my-1.5 text-sm text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold rounded"
                >
                  <Phone size={16} className="text-kvsr-gold shrink-0" aria-hidden="true" />
                  {institutionPhone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${institutionEmail}`}
                  className="inline-flex items-center gap-2.5 py-1.5 -my-1.5 text-sm text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold rounded"
                >
                  <Mail size={16} className="text-kvsr-gold shrink-0" aria-hidden="true" />
                  {institutionEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Accreditation row */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-xs text-slate-400 leading-relaxed">
            {ACCREDITATIONS.join(" · ")}
          </p>
        </div>

        {/* Social + legal */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {SOCIALS.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:border-white/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
                >
                  <Icon size={18} aria-hidden="true" />
                </a>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 text-center sm:text-right">
            © 2026 {institutionName}. All rights reserved.
          </p>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:border-white/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
          >
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
