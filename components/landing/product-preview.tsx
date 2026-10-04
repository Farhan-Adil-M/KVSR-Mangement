"use client";

import { motion } from "motion/react";
import { Clock, Users, Calendar, CheckCircle2 } from "lucide-react";

const timetableRows = [
  {
    time: "09:50",
    subject: "Environmental Science",
    faculty: "H Vinod",
    room: "A-101",
  },
  {
    time: "10:50",
    subject: "Digital Logic & Organization",
    faculty: "Vasanthi",
    room: "A-102",
  },
  {
    time: "11:50",
    subject: "Discrete Mathematics",
    faculty: "Dr. Bushra",
    room: "A-103",
  },
];

const stats = [
  { label: "Present", value: "92%", icon: CheckCircle2, color: "text-emerald-600" },
  { label: "Faculty", value: "41", icon: Users, color: "text-kvsr-cta" },
];

export function ProductPreview({ institutionShortName }: { institutionShortName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
      className="relative w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
    >
      <div className="absolute -inset-6 rounded-3xl bg-kvsr-cta/15 blur-3xl" />

      <div className="relative rounded-2xl overflow-hidden bg-kvsr-paper border border-kvsr-soft shadow-2xl">
        {/* Browser header */}
        <div className="px-4 py-3 bg-white border-b border-kvsr-soft flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 text-center">
            <div className="inline-block px-3 py-1 rounded-md bg-kvsr-paper text-xs text-kvsr-muted">
              {institutionShortName.toLowerCase()}.edu.in/dashboard
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-kvsr-muted uppercase tracking-[0.12em] font-medium">
                Today&apos;s Overview
              </p>
              <p className="text-base font-semibold text-kvsr-ink mt-0.5">
                II-A Timetable
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
              Live
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.08 }}
                  className="p-3 rounded-xl bg-white border border-kvsr-soft"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                    <span className="text-[11px] text-kvsr-muted">
                      {stat.label}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-kvsr-ink">
                    {stat.value}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] text-kvsr-muted uppercase tracking-[0.1em] font-medium mb-1">
              <Calendar className="w-3.5 h-3.5" />
              Monday Schedule
            </div>
            {timetableRows.map((row, index) => (
              <motion.div
                key={row.subject}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.75 + index * 0.08 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-kvsr-soft hover:border-kvsr-cta/30 transition-colors"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-kvsr-navy/5 text-kvsr-navy shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-kvsr-ink truncate">
                    {row.subject}
                  </p>
                  <p className="text-[11px] text-kvsr-muted">
                    {row.faculty} · {row.room}
                  </p>
                </div>
                <span className="text-xs font-medium text-kvsr-cta shrink-0">
                  {row.time}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
