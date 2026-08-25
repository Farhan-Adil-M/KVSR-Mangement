"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, Calendar, Users, BookOpen } from "lucide-react";
import { LogoAnimation } from "./logo-animation";
import { DashboardPreview } from "./dashboard-preview";

const features = [
  {
    icon: Calendar,
    title: "Timetables",
    description: "Section-wise schedules with faculty and room assignments.",
    featured: false,
  },
  {
    icon: Users,
    title: "Attendance",
    description: "Track sessions, view summaries, and identify patterns.",
    featured: true,
  },
  {
    icon: BookOpen,
    title: "Academic Operations",
    description: "Students, faculty, and records in one organized system.",
    featured: false,
  },
];

const stats = [
  { value: "843", label: "Students" },
  { value: "41", label: "Faculty" },
  { value: "530", label: "Weekly Slots" },
];

export function Hero() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-kvsr-deep">
      {/* Simplified background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[70vw] h-[70vw] rounded-full bg-kvsr-cta/10 blur-[120px] -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] rounded-full bg-kvsr-navy/40 blur-[100px] translate-y-1/3 -translate-x-1/4" />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
        }}
      />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative z-20 px-4 sm:px-6 py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9">
              <LogoAnimation size={36} variant="nav" />
            </div>
            <span className="font-semibold text-white text-base sm:text-lg tracking-tight">
              KVSRIT
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="px-4 sm:px-5 py-2 bg-kvsr-cta text-white text-sm font-medium rounded-full hover:bg-kvsr-cta/90 transition-colors flex items-center gap-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-kvsr-gold focus:ring-offset-2 focus:ring-offset-kvsr-deep"
          >
            <span className="hidden sm:inline">Open Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
            <ArrowRight size={15} className="hidden sm:block" />
          </Link>
        </div>
      </motion.nav>

      {/* Hero content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-140px)]">
          {/* Left: copy */}
          <div className="order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-kvsr-gold" />
              <span className="text-xs font-medium text-kvsr-muted tracking-wide uppercase">
                KVSR Management
              </span>
            </motion.div>

            <div className="overflow-hidden mb-5">
              <motion.h1
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-[72px] font-semibold text-white leading-[1.1] tracking-tight"
              >
                One clear view of{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-kvsr-gold to-kvsr-orange">
                  campus operations
                </span>
                .
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="text-base sm:text-lg text-kvsr-muted leading-relaxed max-w-xl mb-8"
            >
              Timetables, attendance, faculty, and academic records—organized
              for the people who keep KVSRIT moving.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-10"
            >
              <Link
                href="/dashboard"
                className="group px-6 py-3 bg-kvsr-cta text-white font-semibold rounded-full hover:bg-kvsr-cta/90 transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-kvsr-gold focus:ring-offset-2 focus:ring-offset-kvsr-deep"
              >
                Open Dashboard
                <ArrowRight
                  size={17}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
              <Link
                href="/timetable"
                className="px-6 py-3 text-white/80 font-medium hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-kvsr-gold/50 rounded-full"
              >
                View Timetable →
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="flex items-center gap-8 sm:gap-10"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.75 + index * 0.08 }}
                >
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-xs text-kvsr-muted mt-0.5">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right: product preview */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <DashboardPreview />
          </div>
        </div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85 }}
          className="mt-16 lg:mt-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.95 + index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className={`relative p-6 rounded-2xl border border-white/10 transition-all duration-300 group focus-within:ring-2 focus-within:ring-kvsr-gold/50 ${
                    feature.featured
                      ? "bg-gradient-to-br from-kvsr-cta/20 to-kvsr-cta/5 md:scale-105 md:-my-2"
                      : "bg-white/5 hover:bg-white/[0.07]"
                  }`}
                >
                  {feature.featured && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-kvsr-gold text-kvsr-deep text-[10px] font-bold uppercase tracking-wide">
                      Core
                    </div>
                  )}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                      feature.featured
                        ? "bg-kvsr-gold/20"
                        : "bg-white/10 group-hover:bg-kvsr-gold/10"
                    } transition-colors`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        feature.featured ? "text-kvsr-gold" : "text-white/80"
                      }`}
                    />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-1.5">
                    {feature.title}
                    {feature.featured && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-kvsr-gold ml-2 align-middle" />
                    )}
                  </h3>
                  <p className="text-kvsr-muted text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-16 pt-8 border-t border-white/10"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-center">
            <span className="text-xs text-kvsr-muted uppercase tracking-wider">
              Trusted by KVSRIT
            </span>
            <div className="flex items-center gap-6 text-xs text-white/50">
              <span>NAAC A+ Accredited</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>JNTUA Affiliated</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>AICTE Approved</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
