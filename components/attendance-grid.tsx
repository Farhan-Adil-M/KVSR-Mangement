"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Check, X, Save, Users, Clock, BookOpen } from "lucide-react";
import { saveAttendance } from "@/lib/actions/attendance";

interface Student {
  id: string;
  rollNumber: string;
  fullName: string;
}

interface TimetableSlot {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  subjectId: string;
  faculty: string | null;
  isLab: boolean;
}

interface AttendanceRecord {
  studentId: string;
  status: "present" | "absent";
}

interface AttendanceGridProps {
  students: Student[];
  slot: TimetableSlot;
  sessionDate: string;
  sectionId: string;
  existingRecords: AttendanceRecord[];
}

export function AttendanceGrid({
  students,
  slot,
  sessionDate,
  sectionId,
  existingRecords,
}: AttendanceGridProps) {
  const [records, setRecords] = useState<Record<string, "present" | "absent">>(
    () => {
      const initial: Record<string, "present" | "absent"> = {};
      // Default all present
      students.forEach((s) => (initial[s.id] = "present"));
      // Override with existing records
      existingRecords.forEach((r) => (initial[r.studentId] = r.status));
      return initial;
    }
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const toggleStatus = (studentId: string) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present",
    }));
    setMessage(null);
  };

  const allPresent = () => {
    const updated: Record<string, "present" | "absent"> = {};
    students.forEach((s) => (updated[s.id] = "present"));
    setRecords(updated);
    setMessage(null);
  };

  const allAbsent = () => {
    const updated: Record<string, "present" | "absent"> = {};
    students.forEach((s) => (updated[s.id] = "absent"));
    setRecords(updated);
    setMessage(null);
  };

  const handleSubmit = () => {
    setMessage(null);
    const payload = students.map((s) => ({
      studentId: s.id,
      status: records[s.id] || "present",
    }));

    startTransition(async () => {
      const result = await saveAttendance(
        sessionDate,
        slot.id,
        slot.subjectId,
        sectionId,
        payload
      );
      if (result.success) {
        setMessage("Attendance saved successfully.");
      } else {
        setMessage("Failed to save attendance. Please try again.");
      }
    });
  };

  const presentCount = students.filter((s) => records[s.id] === "present").length;
  const absentCount = students.length - presentCount;

  return (
    <div className="space-y-5">
      {/* Slot info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-kvsr-navy/5 text-kvsr-navy shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-kvsr-ink">{slot.subject}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                P{slot.periodNumber} · {slot.startTime.slice(0, 5)} -{" "}
                {slot.endTime.slice(0, 5)}
              </span>
              {slot.faculty && <span>Faculty: {slot.faculty}</span>}
              {slot.isLab && (
                <span className="px-2 py-0.5 rounded-full bg-kvsr-orange/10 text-kvsr-cta text-xs font-medium">
                  Lab
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium">
            {presentCount} Present
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-medium">
            {absentCount} Absent
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={allPresent}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-kvsr-soft hover:bg-kvsr-navy/5 transition-colors"
          >
            Mark all present
          </button>
          <button
            onClick={allAbsent}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-kvsr-soft hover:bg-kvsr-navy/5 transition-colors"
          >
            Mark all absent
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {students.length} students
        </div>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-2xl border border-kvsr-soft shadow-sm overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_120px] sm:grid-cols-[80px_1fr_140px] gap-4 px-5 py-3 bg-kvsr-navy/[0.03] text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Roll #</span>
          <span>Name</span>
          <span className="text-right">Status</span>
        </div>
        <div className="divide-y divide-kvsr-soft">
          {students.map((student, index) => {
            const status = records[student.id] || "present";
            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.02 }}
                className="grid grid-cols-[60px_1fr_120px] sm:grid-cols-[80px_1fr_140px] gap-4 px-5 py-3 items-center hover:bg-kvsr-navy/[0.02] transition-colors"
              >
                <span className="text-sm font-medium text-kvsr-muted">
                  {student.rollNumber}
                </span>
                <span className="text-sm font-medium text-kvsr-ink truncate">
                  {student.fullName}
                </span>
                <div className="flex justify-end">
                  <button
                    onClick={() => toggleStatus(student.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold ${
                      status === "present"
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {status === "present" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Present
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5" />
                        Absent
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {message && (
          <p
            className={`text-sm ${
              message.includes("success") ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
        {!message && <div />}
        <button
          onClick={handleSubmit}
          disabled={isPending || students.length === 0}
          className="px-6 py-3 bg-kvsr-cta text-white font-medium rounded-full hover:bg-kvsr-cta/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold focus-visible:ring-offset-2"
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Attendance
            </>
          )}
        </button>
      </div>
    </div>
  );
}
