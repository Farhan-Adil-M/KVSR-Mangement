import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { TimetableGrid } from "@/components/timetable-grid";
import { getStudentContext, requireStudent } from "@/lib/auth/guards";
import { getTimetableForSection } from "@/lib/db/queries";
import { Calendar } from "lucide-react";

export const metadata = { title: "My Timetable | KVSR Management" };
export const dynamic = "force-dynamic";

export default async function StudentTimetablePage() {
  const session = await requireStudent();
  const ctx = await getStudentContext(session.id);

  if (!ctx) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader title="My Timetable" />
          <EmptyState
            icon={Calendar}
            title="No active enrollment"
            description="You are not enrolled in a section for the current academic year."
          />
        </div>
      </div>
    );
  }

  const slots = await getTimetableForSection(ctx.sectionId);

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="My Timetable"
          subtitle={`${ctx.yearLabel}-${ctx.sectionName} weekly schedule`}
        />

        <TimetableGrid
          slots={slots}
          sectionName={`${ctx.yearLabel}-${ctx.sectionName}`}
          sections={[{ id: ctx.sectionId, name: ctx.sectionName, year: ctx.yearLabel }]}
          selectedSectionId={ctx.sectionId}
        />
      </div>
    </div>
  );
}
