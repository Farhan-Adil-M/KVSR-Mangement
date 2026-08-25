"use client";

import { motion } from "motion/react";
import { Clock, Users, Calendar, CheckCircle2 } from "lucide-react";

const timetableRows = [
  { time: "09:50", subject: "Environmental Science", faculty: "H Vinod", room: "A-101" },
  { time: "10:50", subject: "Digital Logic & Organization", faculty: "Vasanthi", room: "A-102" },
  { time: "11:50", subject: "Discrete Mathematics", faculty: "Dr. Bushra", room: "A-103" },
];

const stats = [
  { label: "Present", value: "92%", icon: CheckCircle2, color: "text-emerald-500" },
  { label: "Faculty", value: "41", icon: Users, color: "text-kvsr-orange" },
];

export function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
      className="relative w-full max-w-lg mx-auto lg:mx-0"
    >
      {/* Soft ambient glow behind preview */}
      <motion.div
        className="absolute -inset-8 rounded-3xl bg-kvsr-cta/20 blur-3xl"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Browser frame */}
      <div className="relative rounded-2xl overflow-hidden bg-kvsr-paper border border-kvsr-soft shadow-2xl">
        {/* Browser header */}
        <div className="px-4 py-3 bg-white border-b border-kvsr-soft flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 text-center">
            <div className="inline-block px-3 py-1 rounded-md bg-kvsr-paper text-xs text-kvsr-muted">
              kvsrit.edu.in/dashboard
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-kvsr-muted uppercase tracking-wider font-medium">
                Today&apos;s Overview
              </p>
              <h3 className="text-lg font-bold text-kvsr-ink">II-A Timetable</h3>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
                  className="p-3 rounded-xl bg-white border border-kvsr-soft"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-kvsr-muted">{stat.label}</span>
                  </div>
                  <div className="text-xl font-bold text-kvsr-ink">{stat.value}</div>
                </motion.div>
              );
            })}
          </div>

          {/* Timetable rows */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-kvsr-muted mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Monday Schedule</span>
            </div>
            {timetableRows.map((row, index) => (
              <motion.div
                key={row.subject}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.9 + index * 0.08 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-kvsr-soft hover:border-kvsr-orange/30 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-kvsr-navy/5 text-kvsr-navy">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-kvsr-ink truncate">
                    {row.subject}
                  </p>
                  <p className="text-xs text-kvsr-muted">
                    {row.faculty} · {row.room}
                  </p>
                </div>
                <span className="text-xs font-medium text-kvsr-orange">{row.time}</span>
              </motion.div>
            ))}
          </div>

          {/* Highlight sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: "200%", opacity: [0, 0.1, 0] }}
            transition={{ duration: 2, delay: 1.8, repeat: Infinity, repeatDelay: 5 }}
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(230, 162, 59, 0.15) 50%, transparent 100%)",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
