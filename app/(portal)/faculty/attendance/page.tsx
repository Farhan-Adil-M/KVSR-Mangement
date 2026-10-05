import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AttendanceMarking } from "@/components/attendance-marking";
import { SelfCheckinControls } from "@/components/self-checkin-controls";
import Link from "next/link";
import { getFacultyDaySlots } from "@/lib/db/portal-queries";
import { requireFaculty } from "@/lib/auth/guards";
import { getCachedAppConfig } from "@/lib/db/cached-queries";
import {
  getStudentsBySection,
  getAttendanceSessionForSlot,
  getAttendanceRecordsForSession,
} from "@/lib/db/queries";
import { ClipboardCheck } from "lucide-react";
import { getCollegeNow } from "@/lib/utils";

export async function generateMetadata() {
  const config = await getCachedAppConfig();
  return {
    title: `Attendance | ${config.institutionShortName} Management`,
  };
}
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { day?: string; slot?: string };
}

export default async function FacultyAttendancePage({ searchParams }: PageProps) {
  // Auth is cookie-only; the (non-sensitive) config read runs alongside it
  // instead of paying a separate round trip to the distant DB region.
  const [session, config] = await Promise.all([requireFaculty(), getCachedAppConfig()]);

  const collegeNow = getCollegeNow();
  const today = collegeNow.dayName;
  const day =
    searchParams.day && config.teachingDays.includes(searchParams.day)
      ? searchParams.day
      : today;
  const selectedSlotId = searchParams.slot;

  // Only the faculty's OWN slots are ever returned here.
  const slots = await getFacultyDaySlots(session.id, day);
  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null;

  let students: { id: string; rollNumber: string; fullName: string }[] = [];
  let existingRecords: { studentId: string; status: "present" | "absent" }[] = [];
  let selfCheckinOpenedAt: string | null = null;

  if (selectedSlot) {
    const [roster, sessionData] = await Promise.all([
      getStudentsBySection(selectedSlot.sectionId),
      (async () => {
        const existingSession = await getAttendanceSessionForSlot(
          selectedSlot.id,
          collegeNow.date
        );
        if (!existingSession) {
          return { existingRecords: [], selfCheckinOpenedAt: null as string | null };
        }
        const records = await getAttendanceRecordsForSession(existingSession.id);
        return {
          existingRecords: records.map((r) => ({
            studentId: r.studentId,
            status: r.status as "present" | "absent",
          })),
          selfCheckinOpenedAt: existingSession.selfCheckinOpenedAt
            ? existingSession.selfCheckinOpenedAt.toISOString()
            : null,
        };
      })(),
    ]);
    students = roster;
    existingRecords = sessionData.existingRecords;
    selfCheckinOpenedAt = sessionData.selfCheckinOpenedAt;
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Attendance"
          subtitle="Mark attendance for your assigned classes"
          breadcrumbs={[
            { label: "Faculty", href: "/faculty/dashboard" },
            { label: "Attendance" },
          ]}
        />

        {/* Day picker */}
        <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Day
          </p>
      <div className="flex flex-wrap gap-2">
        {config.teachingDays.map((d) => (
          <Link
            key={d}
            href={`/faculty/attendance?day=${d}`}
            aria-current={d === day ? "page" : undefined}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              d === day
                ? "bg-kvsr-navy text-white shadow-md"
                : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
            }`}
          >
            {d.slice(0, 3)}
          </Link>
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
              <Link
                key={slot.id}
                href={`/faculty/attendance?day=${day}&slot=${slot.id}`}
                aria-current={slot.id === selectedSlotId ? "page" : undefined}
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
              </Link>
            ))}
          </div>
        )}

        {/* Marking grid */}
        {selectedSlot ? (
          students.length > 0 ? (
            <div className="space-y-6">
              <SelfCheckinControls
                timetableSlotId={selectedSlot.id}
                sessionDate={collegeNow.date}
                selfCheckinOpenedAt={selfCheckinOpenedAt}
                selfCheckinWindowMinutes={config.selfCheckinWindowMinutes}
              />
              <AttendanceMarking
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
                sectionId={selectedSlot.sectionId}
                sessionDate={collegeNow.date}
                existingRecords={existingRecords}
                slotLabel={`P${selectedSlot.periodNumber} · ${selectedSlot.subject} · ${selectedSlot.year}-${selectedSlot.section}`}
                matchThreshold={config.matchThreshold}
                scanIntervalMs={config.scanIntervalMs}
                confusionBand={config.confusionBand}
                photoMin={config.photoMin}
                photoMax={config.photoMax}
              />
            </div>
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
