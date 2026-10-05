import { DashboardHeader } from "@/components/dashboard-header";
import { requireAdmin } from "@/lib/auth/guards";
import { AttendanceReport } from "@/components/attendance-report";
import { getSections, getAttendanceReportBySection } from "@/lib/db/queries";
import { getAppConfig } from "@/lib/app-config";

export const metadata = {
  title: "Attendance Reports | KVSR Management",
};

interface AttendanceReportsPageProps {
  searchParams: { section?: string };
}

export default async function AttendanceReportsPage({
  searchParams,
}: AttendanceReportsPageProps) {
  await requireAdmin();

  // With an explicit ?section= the report query is independent of the section
  // list, so it starts immediately (one round trip instead of two). Without a
  // param it chains off the sections query to pick the first section.
  const sectionsPromise = getSections();
  const reportPromise = searchParams.section
    ? getAttendanceReportBySection(searchParams.section)
    : sectionsPromise.then((first) =>
        first[0]?.id ? getAttendanceReportBySection(first[0].id) : []
      );

  const [sections, config, report] = await Promise.all([
    sectionsPromise,
    getAppConfig(),
    reportPromise,
  ]);

  const selectedSectionId = searchParams.section || sections[0]?.id;

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Attendance Reports"
          subtitle="Subject-wise and student-wise attendance summaries"
        />

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
            goodPct={config.attendanceGoodPct}
            warnPct={config.attendanceWarnPct}
          />
        )}
      </div>
    </div>
  );
}
