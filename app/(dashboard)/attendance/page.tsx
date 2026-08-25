import { DashboardHeader } from "@/components/dashboard-header";
import { AttendanceGrid } from "@/components/attendance-grid";
import {
  getSections,
  getStudentsBySection,
  getTimetableSlotsForSectionAndDay,
  getAttendanceSessionForSlot,
  getAttendanceRecordsForSession,
} from "@/lib/db/queries";

export const metadata = {
  title: "Attendance | KVSR Management",
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface AttendancePageProps {
  searchParams: {
    section?: string;
    date?: string;
  };
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getDayOfWeek(dateStr: string) {
  const date = new Date(dateStr);
  return DAYS[date.getDay() === 0 ? 5 : date.getDay() - 1] || "Monday";
}

export default async function AttendancePage({
  searchParams,
}: AttendancePageProps) {
  const sections = await getSections();
  const selectedSectionId = searchParams.section || sections[0]?.id;
  const selectedDate = searchParams.date || getTodayDate();
  const selectedDay = getDayOfWeek(selectedDate);

  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  const [students, slots] = await Promise.all([
    selectedSection ? getStudentsBySection(selectedSection.id) : [],
    selectedSection
      ? getTimetableSlotsForSectionAndDay(selectedSection.id, selectedDay)
      : [],
  ]);

  // For simplicity, use the first slot of the day for attendance marking
  const activeSlot = slots[0];

  let existingSession = null;
  let existingRecords: { studentId: string; status: "present" | "absent" }[] =
    [];

  if (activeSlot) {
    existingSession = await getAttendanceSessionForSlot(
      activeSlot.id,
      selectedDate
    );
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
          subtitle="Mark and manage daily attendance"
        />

        {sections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
            <p className="text-muted-foreground">
              No sections found. Please run the database migration first.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Section
                </label>
                <div className="flex flex-wrap gap-2">
                  {sections.map((section) => {
                    const isSelected = section.id === selectedSectionId;
                    return (
                      <a
                        key={section.id}
                        href={`/attendance?section=${section.id}&date=${selectedDate}`}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          isSelected
                            ? "bg-kvsr-navy text-white shadow-md"
                            : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
                        }`}
                      >
                        {section.year}-{section.name}
                      </a>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Date
                </label>
                <form
                  action="/attendance"
                  method="GET"
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="section" value={selectedSectionId} />
                  <input
                    type="date"
                    name="date"
                    defaultValue={selectedDate}
                    className="px-3 py-2 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-kvsr-navy text-white text-sm font-medium rounded-xl hover:bg-kvsr-navy/90 transition-colors"
                  >
                    Load
                  </button>
                </form>
              </div>
            </div>

            {/* Day info */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-kvsr-ink">{selectedDay}</span>
              <span>·</span>
              <span>{selectedDate}</span>
              <span>·</span>
              <span>{slots.length} scheduled periods</span>
            </div>

            {/* Slot selector if multiple slots */}
            {slots.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      slot.id === activeSlot?.id
                        ? "bg-kvsr-cta text-white border-kvsr-cta"
                        : "bg-white border-kvsr-soft text-kvsr-muted hover:border-kvsr-cta"
                    }`}
                  >
                    P{slot.periodNumber} · {slot.subject.slice(0, 18)}
                    {slot.subject.length > 18 ? "..." : ""}
                  </button>
                ))}
              </div>
            )}

            {/* Attendance grid */}
            {activeSlot ? (
              <AttendanceGrid
                students={students}
                slot={{
                  id: activeSlot.id,
                  periodNumber: activeSlot.periodNumber,
                  startTime: activeSlot.startTime,
                  endTime: activeSlot.endTime,
                  subject: activeSlot.subject,
                  subjectId: activeSlot.subjectId,
                  faculty: activeSlot.faculty,
                  isLab: !!activeSlot.isLab,
                }}
                sessionDate={selectedDate}
                sectionId={selectedSectionId}
                existingRecords={existingRecords}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-kvsr-soft p-12 text-center shadow-sm">
                <p className="text-muted-foreground">
                  No timetable slots scheduled for {selectedSection?.year}-
                  {selectedSection?.name} on {selectedDay}.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
