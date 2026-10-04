"use client";

import { useState } from "react";
import { AttendanceGrid } from "./attendance-grid";
import { AttendanceCamera } from "./attendance-camera";
import { AttendancePhotoUpload } from "./attendance-photo-upload";
import { Camera, ImageUp, Keyboard } from "lucide-react";

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

type Mode = "photo" | "manual" | "camera";

const MODES: { id: Mode; label: string; icon: typeof Camera }[] = [
  { id: "photo", label: "Upload Photos", icon: ImageUp },
  { id: "manual", label: "Manual", icon: Keyboard },
  { id: "camera", label: "Mark with Camera", icon: Camera },
];

export function AttendanceMarking({
  students,
  slot,
  sectionId,
  sessionDate,
  existingRecords,
  slotLabel,
  matchThreshold,
  scanIntervalMs,
  confusionBand,
  photoMin,
  photoMax,
}: {
  students: Student[];
  slot: Slot;
  sectionId: string;
  sessionDate: string;
  existingRecords: { studentId: string; status: "present" | "absent" }[];
  slotLabel: string;
  matchThreshold: number;
  scanIntervalMs: number;
  confusionBand: number;
  photoMin: number;
  photoMax: number;
}) {
  const [mode, setMode] = useState<Mode>("photo");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            aria-pressed={mode === id}
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold ${
              mode === id
                ? "bg-kvsr-navy text-white shadow-md"
                : "bg-white border border-kvsr-soft text-kvsr-muted hover:border-kvsr-navy/30"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {mode === "photo" && (
        <AttendancePhotoUpload
          students={students}
          sectionId={sectionId}
          timetableSlotId={slot.id}
          sessionDate={sessionDate}
          slotLabel={slotLabel}
          matchThreshold={matchThreshold}
          confusionBand={confusionBand}
          photoMin={photoMin}
          photoMax={photoMax}
        />
      )}
      {mode === "manual" && (
        <AttendanceGrid
          students={students}
          slot={slot}
          sessionDate={sessionDate}
          existingRecords={existingRecords}
        />
      )}
      {mode === "camera" && (
        <AttendanceCamera
          students={students}
          sectionId={sectionId}
          timetableSlotId={slot.id}
          sessionDate={sessionDate}
          slotLabel={slotLabel}
          matchThreshold={matchThreshold}
          scanIntervalMs={scanIntervalMs}
        />
      )}
    </div>
  );
}
