import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SelfCheckinCard } from "@/components/self-checkin-card";
import { getStudentContext, requireStudent } from "@/lib/auth/guards";
import { getOpenSelfCheckinForSection, getStudentSubjectAttendance } from "@/lib/db/queries";
import { getAppConfig } from "@/lib/app-config";
import { getCollegeNow } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, ClipboardCheck, Clock } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `My Attendance | ${config.institutionShortName} Management`,
  };
}

function statusFor(pct: number, goodPct: number, warnPct: number) {
  if (pct >= goodPct)
    return { label: "Safe", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (pct >= warnPct)
    return { label: "Warning", icon: AlertTriangle, className: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Critical", icon: XCircle, className: "bg-red-50 text-red-700 border-red-200" };
}

function noClassesStatus() {
  return { label: "No classes yet", icon: Clock, className: "bg-kvsr-navy/[0.04] text-kvsr-muted border-kvsr-soft" };
}

function barColorFor(pct: number, goodPct: number, warnPct: number) {
  if (pct >= goodPct) return "bg-emerald-500";
  if (pct >= warnPct) return "bg-amber-500";
  return "bg-red-500";
}

export default async function StudentAttendancePage() {
  const session = await requireStudent();
  const ctx = await getStudentContext(session.id);

  if (!ctx) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="My Attendance"
            breadcrumbs={[{ label: "Student", href: "/student/dashboard" }, { label: "My Attendance" }]}
          />
          <EmptyState
            icon={ClipboardCheck}
            title="No active enrollment"
            description="You are not enrolled in a section for the current academic year."
          />
        </div>
      </div>
    );
  }

  const collegeNow = getCollegeNow();
  const [subjects, config, openCheckin] = await Promise.all([
    getStudentSubjectAttendance(session.id, ctx.sectionId),
    getAppConfig(),
    getOpenSelfCheckinForSection(ctx.sectionId, collegeNow.date),
  ]);

  const totalHeld = subjects.reduce((acc, s) => acc + s.classesHeld, 0);
  const totalAttended = subjects.reduce((acc, s) => acc + s.classesAttended, 0);
  const overallPercentage =
    totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 100) : 0;

  const overall =
    totalHeld > 0
      ? statusFor(overallPercentage, config.attendanceGoodPct, config.attendanceWarnPct)
      : noClassesStatus();

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="My Attendance"
          subtitle={`${ctx.yearLabel}-${ctx.sectionName} · Roll #${ctx.rollNumber}`}
          breadcrumbs={[{ label: "Student", href: "/student/dashboard" }, { label: "My Attendance" }]}
        />

        {openCheckin && (
          <div className="mb-6">
            <SelfCheckinCard
              timetableSlotId={openCheckin.slotId}
              subject={openCheckin.subject}
              periodLabel={`${openCheckin.startTime.slice(0, 5)}–${openCheckin.endTime.slice(0, 5)}`}
              openedAt={openCheckin.selfCheckinOpenedAt}
              windowMinutes={config.selfCheckinWindowMinutes}
            />
          </div>
        )}

        {/* Overall */}
        <div className="p-6 rounded-2xl bg-white border border-kvsr-soft shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Overall Attendance
            </p>
            <div className={`text-5xl font-bold mt-1 ${totalHeld > 0 ? overall.className.split(" ")[0] : "text-kvsr-muted"}`}>
              {overallPercentage}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {totalAttended} present ·{" "}
              {totalHeld - totalAttended} absent ·{" "}
              {totalHeld} total classes
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
        {subjects.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No subjects in your timetable yet"
            description="Once your section timetable is published, subject-wise attendance appears here."
          />
        ) : (
          <div className="space-y-3">
            {subjects.map((s) => {
              const pct =
                s.classesHeld > 0
                  ? Math.round((s.classesAttended / s.classesHeld) * 100)
                  : 0;
              const status =
                s.classesHeld > 0
                  ? statusFor(pct, config.attendanceGoodPct, config.attendanceWarnPct)
                  : noClassesStatus();
              return (
                <div
                  key={s.subjectId}
                  className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-kvsr-ink">{s.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.classesAttended} / {s.classesHeld} classes attended
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-32 sm:w-44 h-2.5 rounded-full bg-kvsr-navy/10 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${s.subject} attendance ${pct}%`}
                    >
                      <div
                        className={`h-full rounded-full ${
                          s.classesHeld > 0
                            ? barColorFor(pct, config.attendanceGoodPct, config.attendanceWarnPct)
                            : "bg-kvsr-navy/20"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold text-kvsr-ink w-14 text-right">
                      {pct}%
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
