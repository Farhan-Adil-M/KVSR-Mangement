"use client";

import { Users, IdCard, CalendarDays, Building2, type LucideIcon } from "lucide-react";
import { Counter, Reveal } from "./primitives";

interface Stat {
  value: number;
  suffix?: string;
  label: string;
  icon: LucideIcon;
}

const STATS: Stat[] = [
  { value: 843, label: "Students", icon: Users },
  { value: 41, label: "Faculty", icon: IdCard },
  { value: 530, label: "Weekly slots", icon: CalendarDays },
  { value: 6, label: "Departments", icon: Building2 },
];

export function StatsSection() {
  return (
    <section className="bg-kvsr-deep py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
          {STATS.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Reveal key={stat.label} delay={index * 0.08}>
                <div
                  className="flex flex-col items-center gap-2 px-4 py-8 text-center"
                  aria-label={`${stat.value}${stat.suffix ?? ""} ${stat.label}`}
                >
                  <Icon size={22} className="text-kvsr-gold" aria-hidden="true" />
                  <div className="font-display text-3xl sm:text-4xl font-semibold text-white">
                    <Counter value={stat.value} delay={index * 0.1} />
                    {stat.suffix ?? ""}
                  </div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
