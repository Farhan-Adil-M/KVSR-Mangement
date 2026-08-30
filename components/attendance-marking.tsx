"use client";

import { useState } from "react";
import { AttendanceGrid } from "./attendance-grid";
import { AttendanceCamera } from "./attendance-camera";
import { Camera, Keyboard } from "lucide-react";

interface Student {
  id: string;
  rollNumber: string;
  fullName: string;
}

interface Slot {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  subjectId: string;
  faculty: string | null;
  isLab: boolean;
}

export function AttendanceMarking({
  students,
  slot,
  sectionId,
  sessionDate,
  existingRecords,
  slotLabel,
}: {
  students: Student[];
  slot: Slot;
  sectionId: string;
  sessionDate: string;
  existingRecords: { studentId: string; status: "present" | "absent" }[];
  slotLabel: string;
}) {
  const [mode, setMode] = useState<"manual" | "camera">("manual");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            mode === "manual"
              ? "bg-kvsr-navy text-white shadow-md"
              : "bg-white border border-kvsr-soft text-kvsr-muted hover:border-kvsr-navy/30"
          }`}
        >
          <Keyboard className="w-4 h-4" />
          Manual
        </button>
        <button
          type="button"
          onClick={() => setMode("camera")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            mode === "camera"
              ? "bg-kvsr-navy text-white shadow-md"
              : "bg-white border border-kvsr-soft text-kvsr-muted hover:border-kvsr-navy/30"
          }`}
        >
          <Camera className="w-4 h-4" />
          Mark with Camera
        </button>
      </div>

      {mode === "manual" ? (
        <AttendanceGrid
          students={students}
          slot={slot}
          sessionDate={sessionDate}
          existingRecords={existingRecords}
        />
      ) : (
        <AttendanceCamera
          students={students}
          sectionId={sectionId}
          timetableSlotId={slot.id}
          sessionDate={sessionDate}
          slotLabel={slotLabel}
        />
      )}
    </div>
  );
}
