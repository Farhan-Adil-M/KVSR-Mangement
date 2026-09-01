import { requireHod } from "@/lib/auth/guards";
import { FacultyAttendanceReport } from "@/components/faculty-attendance-report";

export const metadata = {
  title: "Faculty Attendance - KVSR",
};

export default async function HodFacultyAttendancePage() {
  await requireHod();
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-kvsr-navy">Faculty Attendance</h1>
        <p className="text-sm text-slate-500">
          Auto-derived from classes each faculty was scheduled to teach and whether attendance was marked.
        </p>
      </div>
      <FacultyAttendanceReport />
    </div>
  );
}
