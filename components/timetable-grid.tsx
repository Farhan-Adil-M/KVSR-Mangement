"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { TimetableSlotWithDetails } from "@/lib/db/queries";
import { Beaker, User, Clock, ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_TEACHING_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const PERIOD_TIMES = [
  { period: 1, start: "09:50", end: "10:50" },
  { period: 2, start: "10:50", end: "11:40" },
  { period: 3, start: "11:50", end: "12:40" },
  { period: 4, start: "12:40", end: "13:30" },
  { period: 5, start: "14:30", end: "15:20" },
  { period: 6, start: "15:20", end: "16:10" },
  { period: 7, start: "16:10", end: "17:00" },
];

interface TimetableGridProps {
  slots: TimetableSlotWithDetails[];
  sectionName: string;
  sections: { id: string; name: string; year: string }[];
  selectedSectionId: string;
  teachingDays?: string[];
}

export function TimetableGrid({
  slots,
  sectionName,
  sections,
  selectedSectionId,
  teachingDays,
}: TimetableGridProps) {
  const days = teachingDays ?? DEFAULT_TEACHING_DAYS;
  const [activeDay, setActiveDay] = useState(days[0] ?? "Monday");

  const daySlots = slots.filter((slot) => slot.dayOfWeek === activeDay);
  const activeDayIndex = days.indexOf(activeDay);

  const navigateDay = (direction: "prev" | "next") => {
    const newIndex =
      direction === "prev"
        ? Math.max(0, activeDayIndex - 1)
        : Math.min(days.length - 1, activeDayIndex + 1);
    setActiveDay(days[newIndex]);
  };

  const getSlotForPeriod = (periodNumber: number) => {
    return daySlots.find((slot) => slot.periodNumber === periodNumber);
  };

  return (
    <div className="space-y-6">
      {/* Header with section selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-kvsr-navy">{sectionName}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {slots.length} scheduled slots this week
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
          {sections.map((section) => {
            const isSelected = section.id === selectedSectionId;
            const label = `${section.year}-${section.name}`;
            return (
              <a
                key={section.id}
                href={`/admin/timetable?section=${section.id}`}
                className={`relative px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-kvsr-navy text-white shadow-lg shadow-kvsr-navy/25"
                    : "bg-white text-kvsr-navy border border-border hover:border-kvsr-orange/50 hover:bg-kvsr-orange/5"
                }`}
              >
                {label}
                {isSelected && (
                  <motion.div
                    layoutId="activeSection"
                    className="absolute inset-0 rounded-xl bg-kvsr-navy -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </a>
            );
          })}
        </div>
      </div>

      {/* Day selector */}
      <div className="bg-white rounded-2xl border border-border p-2 shadow-sm">
        <div className="flex items-center justify-between mb-2 sm:hidden">
          <button
            onClick={() => navigateDay("prev")}
            disabled={activeDayIndex === 0}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-kvsr-navy">{activeDay}</span>
          <button
            onClick={() => navigateDay("next")}
            disabled={activeDayIndex === days.length - 1}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          {days.map((day) => {
            const isActive = day === activeDay;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`relative flex-1 py-3 px-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "text-white"
                    : "text-muted-foreground hover:text-kvsr-navy hover:bg-muted"
                }`}
              >
                {day.slice(0, 3)}
                {isActive && (
                  <motion.div
                    layoutId="activeDay"
                    className="absolute inset-0 rounded-xl bg-kvsr-navy -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Period grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeDay + selectedSectionId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="space-y-3"
        >
          {PERIOD_TIMES.map((period) => {
            const slot = getSlotForPeriod(period.period);

            return (
              <div
                key={period.period}
                className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-3"
              >
                {/* Period time */}
                <div className="flex flex-col justify-center p-3 rounded-xl bg-kvsr-navy text-white text-center">
                  <span className="text-sm font-bold">P{period.period}</span>
                  <span className="text-[10px] sm:text-xs text-white/70 mt-0.5">
                    {period.start} - {period.end}
                  </span>
                </div>

                {/* Slot card */}
                {slot ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: period.period * 0.03 }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      slot.isLab
                        ? "bg-gradient-to-r from-kvsr-orange/10 to-amber-50 border-kvsr-orange/30"
                        : "bg-white border-border hover:border-kvsr-navy/20"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-kvsr-navy text-base sm:text-lg">
                            {slot.subject}
                          </h4>
                          {slot.isLab && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-kvsr-orange text-white">
                              <Beaker className="w-3 h-3" />
                              Lab
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          {slot.faculty ? (
                            <span className="flex items-center gap-1.5">
                              <User className="w-4 h-4 text-kvsr-orange" />
                              {slot.faculty}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-amber-600">
                              <User className="w-4 h-4" />
                              No faculty assigned
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 sm:hidden">
                            <Clock className="w-4 h-4" />
                            {period.start} - {period.end}
                          </span>
                        </div>

                        {slot.isLab && slot.labPeriods && (
                          <p className="text-xs text-kvsr-orange mt-2 font-medium">
                            {slot.labPeriods} consecutive periods
                          </p>
                        )}
                      </div>

                      <div className="hidden sm:flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-kvsr-navy/10 text-kvsr-navy">
                          {slot.year}-{slot.section}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="p-4 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center">
                    <span className="text-sm text-muted-foreground">Free period</span>
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
