import { DashboardHeader } from "@/components/dashboard-header";
import { AttendanceReport } from "@/components/attendance-report";
import { getSections, getAttendanceReportBySection } from "@/lib/db/queries";

export const metadata = {
  title: "Attendance Reports | KVSR Management",
};

interface AttendanceReportsPageProps {
  searchParams: { section?: string };
}

export default async function AttendanceReportsPage({
  searchParams,
}: AttendanceReportsPageProps) {
  const sections = await getSections();
  const selectedSectionId = searchParams.section || sections[0]?.id;

  const report = selectedSectionId
    ? await getAttendanceReportBySection(selectedSectionId)
    : [];

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Attendance Reports"
          subtitle="Subject-wise and student-wise attendance summaries"
        />

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-kvsr-soft">
          <a
            href="/attendance"
            className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-kvsr-ink transition-colors"
          >
            Mark Attendance
          </a>
          <a
            href="/attendance/reports"
            className="px-4 py-3 text-sm font-semibold text-kvsr-ink border-b-2 border-kvsr-cta"
          >
            Reports
          </a>
        </div>

        {sections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
            <p className="text-muted-foreground">
              No sections found. Please run the database migration first.
            </p>
          </div>
        ) : (
          <AttendanceReport
            report={report}
            sections={sections}
            selectedSectionId={selectedSectionId}
          />
        )}
      </div>
    </div>
  );
}
