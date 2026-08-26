import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { getFacultyAssignments, requireFaculty } from "@/lib/auth/guards";
import { BookOpen, ClipboardCheck, Users } from "lucide-react";
import { getCollegeNow } from "@/lib/utils";

export const metadata = { title: "My Classes | KVSR Management" };

export default async function FacultyClassesPage() {
  const session = await requireFaculty();
  const today = getCollegeNow().dayName;
  const assignments = await getFacultyAssignments(session.id);

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="My Classes"
          subtitle="Subject + section classes you are assigned to teach"
        />

        {assignments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No class assignments"
            description="The HOD has not assigned any classes to you yet."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assignments.map((a) => (
              <div
                key={a.assignmentId}
                className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-kvsr-ink leading-tight">{a.subjectName}</h3>
                  <span className="px-2.5 py-1 rounded-full bg-kvsr-navy/[0.06] text-kvsr-navy text-xs font-semibold whitespace-nowrap">
                    {a.yearLabel}-{a.sectionName}
                  </span>
                </div>
                {a.isLab && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-kvsr-orange/10 text-kvsr-cta text-xs font-medium mb-3">
                    Lab subject
                  </span>
                )}
                <div className="flex gap-2 pt-3 border-t border-kvsr-soft mt-3">
                  <Link
                    href={`${
  `/faculty/attendance?day=${encodeURIComponent(today)}`
}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-kvsr-cta text-white text-xs font-semibold hover:bg-kvsr-cta/90 transition-colors"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    Attendance
                  </Link>
                  <Link
                    href={`/faculty/students?section=${a.sectionId}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-kvsr-soft text-kvsr-ink text-xs font-semibold hover:bg-kvsr-navy/[0.04] transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Students
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
