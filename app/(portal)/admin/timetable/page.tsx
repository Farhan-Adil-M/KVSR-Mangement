import { PageHeader } from "@/components/page-header";
import { SetupSlotEditor, type EditorSlot } from "@/components/setup-slot-editor";
import { EmptyState } from "@/components/empty-state";
import { requireAdmin } from "@/lib/auth/guards";
import { getCachedAppConfig } from "@/lib/db/cached-queries";
import {
  getCurrentAcademicYear,
  getFacultyList,
  getPeriods,
  getSectionsFull,
  getSubjectsList,
  getTimetableSlotsForSectionAndDay,
} from "@/lib/db/queries";
import { getCollegeNow } from "@/lib/utils";
import { CalendarClock } from "lucide-react";

export async function generateMetadata() {
  const config = await getCachedAppConfig();
  return {
    title: `Timetables | ${config.institutionShortName} Management`,
  };
}

interface TimetablePageProps {
  searchParams: { section?: string };
}

export default async function TimetablePage({
  searchParams,
}: TimetablePageProps) {
  await requireAdmin();

  const [config, sections, periods, subjects, facultyRows, currentYear] =
    await Promise.all([
      getCachedAppConfig(),
      getSectionsFull(),
      getPeriods(),
      getSubjectsList(),
      getFacultyList(),
      getCurrentAcademicYear(),
    ]);

  const selectedSectionId =
    searchParams.section && sections.some((s) => s.id === searchParams.section)
      ? searchParams.section
      : (sections[0]?.id ?? null);

  const today = getCollegeNow();

  let slots: EditorSlot[] = [];
  if (selectedSectionId && config.teachingDays.length > 0) {
    const perDay = await Promise.all(
      config.teachingDays.map((day) =>
        getTimetableSlotsForSectionAndDay(selectedSectionId, day)
      )
    );
    slots = perDay.flat().map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      periodNumber: s.periodNumber,
      subjectId: s.subjectId,
      subject: s.subject,
      facultyId: s.facultyId,
      faculty: s.faculty,
      isLab: Boolean(s.isLab),
    }));
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Timetables"
          subtitle="Build each section's weekly schedule, period by period"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Timetables" },
          ]}
        />

        {!currentYear ? (
          <EmptyState
            icon={CalendarClock}
            title="No active academic year"
            description="Slots are tied to the current academic year. Create a year and mark it current first."
            action={
              <a href="/admin/setup/academic-years" className="inline-flex items-center px-5 py-2.5 min-h-[48px] sm:min-h-[40px] rounded-xl bg-kvsr-navy text-white text-sm font-semibold hover:bg-kvsr-navy/90">
                Go to academic years
              </a>
            }
          />
        ) : sections.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No sections yet"
            description="Create sections before building timetables."
            action={
              <a href="/admin/setup/sections" className="inline-flex items-center px-5 py-2.5 min-h-[48px] sm:min-h-[40px] rounded-xl bg-kvsr-navy text-white text-sm font-semibold hover:bg-kvsr-navy/90">
                Go to sections
              </a>
            }
          />
        ) : selectedSectionId ? (
          <SetupSlotEditor
            basePath="/admin/timetable"
            sections={sections.map((s) => ({
              id: s.id,
              label: `${s.year}-${s.name} (${s.department})`,
            }))}
            selectedSectionId={selectedSectionId}
            slots={slots}
            periods={periods.map((p) => ({
              id: p.id,
              periodNumber: p.periodNumber,
              startTime: String(p.startTime),
              endTime: String(p.endTime),
              isBreak: p.isBreak,
            }))}
            subjects={subjects.map((s) => ({
              id: s.id,
              name: s.name,
              isLab: Boolean(s.isLab),
            }))}
            faculty={facultyRows.map((f) => ({ id: f.id, fullName: f.fullName ?? "" }))}
            teachingDays={config.teachingDays}
            todayDayName={today.dayName}
          />
        ) : null}
      </div>
    </div>
  );
}
