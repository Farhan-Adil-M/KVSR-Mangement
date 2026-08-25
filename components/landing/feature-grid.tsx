"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Calendar, Users, BookOpen, GraduationCap } from "lucide-react";

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Calendar,
    title: "Smart Timetables",
    description:
      "Section-wise schedules with faculty, room, and lab assignments updated in real time.",
  },
  {
    icon: Users,
    title: "Attendance",
    description:
      "Track sessions, view summaries, and spot patterns across sections and subjects.",
  },
  {
    icon: BookOpen,
    title: "Faculty Operations",
    description:
      "Manage teaching assignments, workloads, and departmental responsibilities.",
  },
  {
    icon: GraduationCap,
    title: "Academic Records",
    description:
      "Keep student, course, and session data organized and accessible in one place.",
  },
];

function FeatureCard({
  feature,
  index,
  featured,
}: {
  feature: Feature;
  index: number;
  featured: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -3 }}
      className={`group relative p-6 rounded-2xl border border-white/10 transition-colors duration-300 focus-within:ring-1 focus-within:ring-kvsr-gold/50 ${
        featured
          ? "bg-gradient-to-br from-kvsr-cta/20 to-kvsr-cta/5 lg:row-span-2"
          : "bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      {featured && (
        <div className="absolute top-0 left-6 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-kvsr-gold text-kvsr-deep text-[10px] font-bold uppercase tracking-wide">
          Featured
        </div>
      )}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
          featured ? "bg-kvsr-gold/20" : "bg-white/10 group-hover:bg-kvsr-gold/10"
        } transition-colors`}
      >
        <Icon
          className={`w-5 h-5 ${
            featured ? "text-kvsr-gold" : "text-white/80"
          }`}
        />
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
      <p className="text-kvsr-muted text-sm leading-relaxed">
        {feature.description}
      </p>
      {featured && (
        <div className="mt-5 pt-5 border-t border-white/10">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-semibold text-white">6</div>
              <div className="text-xs text-kvsr-muted">Days / week</div>
            </div>
            <div className="p-3 rounded-xl bg-white/5">
              <div className="text-lg font-semibold text-white">13</div>
              <div className="text-xs text-kvsr-muted">Sections</div>
            </div>
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-kvsr-gold/0 to-transparent group-hover:via-kvsr-gold/60 transition-all duration-300 rounded-b-2xl" />
    </motion.div>
  );
}

export function FeatureGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5 }}
          className="mb-10 sm:mb-12"
        >
          <p className="text-xs font-medium text-kvsr-gold uppercase tracking-[0.15em] mb-3">
            Capabilities
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">
            Everything campus operations needs
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              featured={index === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
