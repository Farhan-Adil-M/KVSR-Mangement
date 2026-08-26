import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { getStudentContext, requireStudent } from "@/lib/auth/guards";
import { getStudentAttendance } from "@/lib/db/portal-queries";
import { ClipboardCheck, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export const metadata = { title: "My Attendance | KVSR Management" };

function statusFor(pct: number) {
  if (pct >= 75)
    return { label: "Safe", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (pct >= 60)
    return { label: "Warning", icon: AlertTriangle, className: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Critical", icon: XCircle, className: "bg-red-50 text-red-700 border-red-200" };
}

export default async function StudentAttendancePage() {
  const session = await requireStudent();
  const ctx = await getStudentContext(session.id);

  if (!ctx) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader title="My Attendance" />
          <EmptyState
            icon={ClipboardCheck}
            title="No active enrollment"
            description="You are not enrolled in a section for the current academic year."
          />
        </div>
      </div>
    );
  }

  const attendance = await getStudentAttendance(session.id, ctx.sectionId);

  const overall = statusFor(attendance.overallPercentage);

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="My Attendance"
          subtitle={`${ctx.yearLabel}-${ctx.sectionName} · Roll #${ctx.rollNumber}`}
        />

        {/* Overall */}
        <div className="p-6 rounded-2xl bg-white border border-kvsr-soft shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Overall Attendance
            </p>
            <div className={`text-5xl font-bold mt-1 ${overall.className.split(" ")[0]}`}>
              {attendance.overallPercentage}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {attendance.totalAttended} present ·{" "}
              {attendance.totalHeld - attendance.totalAttended} absent ·{" "}
              {attendance.totalHeld} total classes
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-bold ${overall.className}`}
          >
            <overall.icon className="w-4 h-4" />
            {overall.label}
          </span>
        </div>

        {/* Subject-wise */}
        {attendance.subjects.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No attendance recorded yet"
            description="Once your faculty marks attendance, your subject-wise summary appears here."
          />
        ) : (
          <div className="space-y-3">
            {attendance.subjects.map((s) => {
              const status = statusFor(s.percentage);
              return (
                <div
                  key={s.subjectId}
                  className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-kvsr-ink">{s.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.attended} / {s.held} classes attended
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-32 sm:w-44 h-2.5 rounded-full bg-kvsr-navy/10 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={s.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${s.subject} attendance ${s.percentage}%`}
                    >
                      <div
                        className={`h-full rounded-full ${
                          s.percentage >= 75
                            ? "bg-emerald-500"
                            : s.percentage >= 60
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${s.percentage}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold text-kvsr-ink w-14 text-right">
                      {s.percentage}%
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold ${status.className}`}
                    >
                      <status.icon className="w-3.5 h-3.5" />
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
