"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type TimetableSlot = {
  id: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  faculty: string | null;
  section: string;
  year: string;
  isLab: boolean;
  labPeriods: number | null;
};

const PERIODS = [
  { number: 1, time: "09:50 - 10:50" },
  { number: 2, time: "10:50 - 11:40" },
  { number: 3, time: "11:50 - 12:40" },
  { number: 4, time: "12:40 - 01:30" },
  { number: 5, time: "02:30 - 03:20" },
  { number: 6, time: "03:20 - 04:10" },
  { number: 7, time: "04:10 - 05:00" },
];

interface TimetableGridProps {
  slots: TimetableSlot[];
  sectionName: string;
}

export function TimetableGrid({ slots, sectionName }: TimetableGridProps) {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const daySlots = slots.filter((slot) => slot.dayOfWeek === selectedDay);

  function getSlotForPeriod(periodNumber: number) {
    return daySlots.find((slot) => slot.periodNumber === periodNumber);
  }

  return (
    <div className="space-y-6">
      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              selectedDay === day
                ? "bg-kvsr-navy text-white"
                : "bg-white border border-border hover:bg-muted"
            )}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Timetable grid */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[100px_1fr] md:grid-cols-[120px_1fr]">
          {/* Header */}
          <div className="bg-kvsr-navy text-white p-4 font-semibold text-sm">
            Period
          </div>
          <div className="bg-kvsr-navy text-white p-4 font-semibold text-sm">
            {selectedDay} — {sectionName}
          </div>

          {/* Period rows */}
          {PERIODS.map((period) => {
            const slot = getSlotForPeriod(period.number);
            return (
              <div key={period.number} className="contents">
                <div className="p-4 border-b border-border bg-muted/30 text-sm font-medium text-kvsr-navy">
                  <div>P{period.number}</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    {period.time}
                  </div>
                </div>
                <div className="p-4 border-b border-border min-h-[80px]">
                  {slot ? (
                    <div
                      className={cn(
                        "h-full p-3 rounded-lg border",
                        slot.isLab
                          ? "bg-kvsr-orange/10 border-kvsr-orange/30"
                          : "bg-kvsr-navy/5 border-kvsr-navy/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-kvsr-navy text-sm">
                            {slot.subject}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {slot.faculty || "No faculty assigned"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {slot.isLab && (
                            <span className="text-xs bg-kvsr-orange text-white px-2 py-0.5 rounded-full">
                              Lab
                            </span>
                          )}
                          <span className="text-xs bg-white border border-border px-2 py-0.5 rounded-full">
                            {slot.year}-{slot.section}
                          </span>
                        </div>
                      </div>
                      {slot.isLab && slot.labPeriods && (
                        <p className="text-xs text-kvsr-orange mt-2 font-medium">
                          {slot.labPeriods} consecutive periods
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                      Free period
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
