"use client";

import {
  ScanFace,
  MapPin,
  CalendarDays,
  ClipboardCheck,
  Fingerprint,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { Reveal, SectionHeading, SpotlightCard } from "./primitives";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  featured?: boolean;
}

const FEATURES: Feature[] = [
  {
    icon: ScanFace,
    title: "Face-Recognition Attendance",
    description:
      "Students check in by face as they walk in. Attendance is captured in seconds, verified against the roster, and logged — no roll-calls, no proxies.",
    featured: true,
  },
  {
    icon: MapPin,
    title: "Geofenced Check-ins",
    description:
      "Check-in is only accepted inside the campus radius, so “present” always means present.",
  },
  {
    icon: CalendarDays,
    title: "Live Timetables",
    description:
      "Section-wise schedules with faculty, room and lab assignments, updated in real time.",
  },
  {
    icon: ClipboardCheck,
    title: "Marks & Evaluations",
    description:
      "Internal marks and evaluations entered once, published securely to students and parents.",
  },
  {
    icon: Fingerprint,
    title: "Biometric Enrollment",
    description:
      "One-time enrollment that unlocks face check-in for every class after that.",
  },
  {
    icon: Building2,
    title: "HOD & Department Tools",
    description:
      "Faculty workloads, teaching assignments and departmental responsibilities in one view.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-16 bg-kvsr-paper py-20 sm:py-24 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Capabilities"
            title="Everything a campus runs on, in one platform."
          />
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={index * 0.06}>
                <SpotlightCard
                  className={
                    feature.featured
                      ? "lg:col-span-2 lg:row-span-2 h-full"
                      : "h-full"
                  }
                >
                  <article
                    className={`flex flex-col h-full p-6 sm:p-7 ${
                      feature.featured ? "lg:p-10" : ""
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                        feature.featured
                          ? "bg-kvsr-navy text-kvsr-gold"
                          : "bg-kvsr-navy/[0.06] text-kvsr-navy"
                      }`}
                    >
                      <Icon
                        size={feature.featured ? 24 : 22}
                        aria-hidden="true"
                      />
                    </div>
                    <h3
                      className={`font-semibold text-kvsr-ink ${
                        feature.featured
                          ? "font-display text-2xl lg:text-3xl"
                          : "text-lg"
                      } mb-2`}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className={`text-slate-700 leading-relaxed ${
                        feature.featured ? "text-base lg:text-lg" : "text-sm"
                      }`}
                    >
                      {feature.description}
                    </p>
                  </article>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
