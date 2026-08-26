import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { AttendanceGrid } from "@/components/attendance-grid";
import { getFacultyDaySlots } from "@/lib/db/portal-queries";
import { requireFaculty } from "@/lib/auth/guards";
import {
  getStudentsBySection,
  getAttendanceSessionForSlot,
  getAttendanceRecordsForSession,
} from "@/lib/db/queries";
import { ClipboardCheck } from "lucide-react";
import { getCollegeNow } from "@/lib/utils";

export const metadata = { title: "Attendance | KVSR Management" };
export const dynamic = "force-dynamic";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface PageProps {
  searchParams: { day?: string; slot?: string };
}

export default async function FacultyAttendancePage({ searchParams }: PageProps) {
  const session = await requireFaculty();

  const collegeNow = getCollegeNow();
  const today = collegeNow.dayName;
  const day = searchParams.day && searchParams.day !== "Sunday" ? searchParams.day : today;
  const selectedSlotId = searchParams.slot;

  // Only the faculty's OWN slots are ever returned here.
  const slots = await getFacultyDaySlots(session.id, day);
  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null;

  let students: { id: string; rollNumber: string; fullName: string }[] = [];
  let existingRecords: { studentId: string; status: "present" | "absent" }[] = [];

  if (selectedSlot) {
    students = await getStudentsBySection(selectedSlot.sectionId);
    const existingSession = await getAttendanceSessionForSlot(selectedSlot.id, collegeNow.date);
    if (existingSession) {
      const records = await getAttendanceRecordsForSession(existingSession.id);
      existingRecords = records.map((r) => ({
        studentId: r.studentId,
        status: r.status as "present" | "absent",
      }));
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Attendance"
          subtitle="Mark attendance for your assigned classes"
        />

        {/* Day picker */}
        <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Day
          </p>
          <div className="flex flex-wrap gap-2">
            {DAY_NAMES.filter((d) => d !== "Sunday").map((d) => (
              <a
                key={d}
                href={`/faculty/attendance?day=${d}`}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  d === day
                    ? "bg-kvsr-navy text-white shadow-md"
                    : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
                }`}
              >
                {d.slice(0, 3)}
              </a>
            ))}
          </div>
        </div>

        {/* Slot picker — own slots only */}
        {slots.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title={`No classes on ${day}`}
            description="You have no assigned slots for this day."
          />
        ) : (
          <div className="flex flex-wrap gap-2 mb-6">
            {slots.map((slot) => (
              <a
                key={slot.id}
                href={`/faculty/attendance?day=${day}&slot=${slot.id}`}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  slot.id === selectedSlotId
                    ? "bg-kvsr-cta text-white border-kvsr-cta"
                    : slot.sessionId
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-white border-kvsr-soft text-kvsr-muted hover:border-kvsr-cta"
                }`}
              >
                P{slot.periodNumber} · {slot.subject.slice(0, 20)}
                {slot.subject.length > 20 ? "…" : ""} · {slot.year}-{slot.section}
                {slot.sessionId ? " ✓" : ""}
              </a>
            ))}
          </div>
        )}

        {/* Marking grid */}
        {selectedSlot ? (
          students.length > 0 ? (
            <AttendanceGrid
              students={students}
              slot={{
                id: selectedSlot.id,
                periodNumber: selectedSlot.periodNumber,
                startTime: selectedSlot.startTime,
                endTime: selectedSlot.endTime,
                subject: selectedSlot.subject,
                subjectId: selectedSlot.subjectId,
                faculty: session.name,
                isLab: selectedSlot.isLab,
              }}
              sessionDate={collegeNow.date}
              existingRecords={existingRecords}
            />
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              title="No students enrolled"
              description={`No active students found for ${selectedSlot.year}-${selectedSlot.section}.`}
            />
          )
        ) : slots.length > 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Select a class above"
            description="Pick one of your scheduled periods to mark attendance."
          />
        ) : null}
      </div>
    </div>
  );
}
