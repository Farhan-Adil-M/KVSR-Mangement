"use client";

import Link from "next/link";
import {
  GraduationCap,
  Presentation,
  ShieldCheck,
  ScanFace,
  CalendarDays,
  ClipboardCheck,
  BellRing,
  Users,
  Building2,
  MapPin,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Reveal, SectionHeading } from "./primitives";

interface Audience {
  icon: LucideIcon;
  title: string;
  tagline: string;
  points: { icon: LucideIcon; text: string }[];
}

const AUDIENCES: Audience[] = [
  {
    icon: GraduationCap,
    title: "For Students",
    tagline: "Your schedule, attendance and marks — always current.",
    points: [
      { icon: ScanFace, text: "Face check-in to every class" },
      { icon: CalendarDays, text: "Today's timetable at a glance" },
      { icon: ClipboardCheck, text: "Marks as they're published" },
      { icon: BellRing, text: "Assignment & exam alerts" },
    ],
  },
  {
    icon: Presentation,
    title: "For Faculty",
    tagline: "Teach, mark and track — without the paperwork.",
    points: [
      { icon: ScanFace, text: "Mark a full section in under a minute" },
      { icon: CalendarDays, text: "Timetable & workload" },
      { icon: ClipboardCheck, text: "Internal marks & evaluations" },
      { icon: BellRing, text: "Notices to your classes" },
    ],
  },
  {
    icon: ShieldCheck,
    title: "For HOD & Admin",
    tagline: "Run your department on real numbers.",
    points: [
      { icon: Users, text: "Faculty attendance & workload" },
      { icon: Building2, text: "Departments & programs" },
      { icon: MapPin, text: "Geofence & enrollment control" },
      { icon: BellRing, text: "Campus-wide notifications" },
    ],
  },
];

export function AudienceSection() {
  return (
    <section id="roles" className="scroll-mt-16 bg-white py-20 sm:py-24 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Built for your role"
            title="Students, faculty and HODs — each with their own dashboard."
          />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          {AUDIENCES.map((audience, index) => {
            const Icon = audience.icon;
            return (
              <Reveal key={audience.title} delay={index * 0.08}>
                <div className="flex flex-col h-full rounded-2xl border border-kvsr-soft bg-kvsr-paper p-6 sm:p-7">
                  <div className="w-12 h-12 rounded-xl bg-kvsr-navy text-kvsr-gold flex items-center justify-center mb-5">
                    <Icon size={24} aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-kvsr-ink">
                    {audience.title}
                  </h3>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {audience.tagline}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {audience.points.map((point) => {
                      const PointIcon = point.icon;
                      return (
                        <li
                          key={point.text}
                          className="flex items-start gap-2.5 text-sm text-slate-700"
                        >
                          <span className="w-5 h-5 rounded-full bg-kvsr-cta/10 text-kvsr-cta flex items-center justify-center shrink-0 mt-0.5">
                            <PointIcon size={12} aria-hidden="true" />
                          </span>
                          {point.text}
                        </li>
                      );
                    })}
                  </ul>
                  <Link
                    href="/identify"
                    className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-kvsr-cta text-white text-sm font-semibold hover:bg-kvsr-cta/90 transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-cta focus-visible:ring-offset-2"
                  >
                    Open Dashboard
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
