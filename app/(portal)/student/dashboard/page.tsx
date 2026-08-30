import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { getStudentContext, requireStudent } from "@/lib/auth/guards";
import {
  getStudentAttendance,
  getStudentNotifications,
} from "@/lib/db/portal-queries";
import { getTimetableForSection } from "@/lib/db/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Calendar, Bell, ArrowRight, Clock } from "lucide-react";
import { getCollegeNow } from "@/lib/utils";

export const metadata = { title: "Student Dashboard | KVSR Management" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const session = await requireStudent();
  const ctx = await getStudentContext(session.id);

  if (!ctx) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader title="Dashboard" subtitle={`Hello, ${session.name}`} />
          <EmptyState
            icon={Calendar}
            title="No active enrollment"
            description="You are not enrolled in a section for the current academic year. Contact the department office."
          />
        </div>
      </div>
    );
  }

  const collegeNow = getCollegeNow();
  const today = collegeNow.dayName;

  const [attendance, notifications, daySlots] = await Promise.all([
    getStudentAttendance(session.id, ctx.sectionId),
    getStudentNotifications(session.id),
    today !== "Sunday" ? getTimetableForSection(ctx.sectionId) : Promise.resolve([]),
  ]);

  const todayClasses = daySlots
    .filter((s) => s.dayOfWeek === today)
    .sort((a, b) => a.periodNumber - b.periodNumber);

  const nowMinutes = collegeNow.minutesSinceMidnight;
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const nextClass = todayClasses.find((s) => toMinutes(s.startTime) > nowMinutes) ?? null;

  const attendanceColor =
    attendance.overallPercentage >= 75
      ? "text-emerald-600"
      : attendance.overallPercentage >= 60
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title={`Hello, ${session.name}`}
          subtitle={`${ctx.yearLabel}-${ctx.sectionName} · Roll #${ctx.rollNumber}`}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Overall attendance */}
          <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
            <CardContent className="pt-6 px-6 pb-6">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck className="w-4 h-4 text-kvsr-cta" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  My Attendance
                </span>
              </div>
              <div className={`text-4xl font-bold ${attendanceColor}`}>
                {attendance.overallPercentage}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {attendance.totalAttended} / {attendance.totalHeld} classes
              </p>
              <Link
                href="/student/attendance"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-kvsr-cta hover:underline"
              >
                Subject-wise <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardContent>
          </Card>

          {/* Next class */}
          <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
            <CardContent className="pt-6 px-6 pb-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-kvsr-cta" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Next Class Today
                </span>
              </div>
              {nextClass ? (
                <>
                  <div className="text-lg font-bold text-kvsr-ink leading-tight">
                    {nextClass.subject}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    P{nextClass.periodNumber} · {nextClass.startTime.slice(0, 5)}–
                    {nextClass.endTime.slice(0, 5)}
                  </p>
                  <p className="text-xs text-kvsr-cta mt-1 font-medium">
                    {nextClass.faculty ?? "Faculty TBA"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {todayClasses.length > 0 ? "No more classes today." : "No classes today."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notifications count */}
          <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
            <CardContent className="pt-6 px-6 pb-6">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-kvsr-cta" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Notifications
                </span>
              </div>
              <div className="text-4xl font-bold text-kvsr-ink">{notifications.length}</div>
              <Link
                href="/student/notifications"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-kvsr-cta hover:underline"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Today's timetable */}
        <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
          <CardHeader className="pb-4 pt-6 px-6">
            <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
              <Calendar className="w-5 h-5 text-kvsr-orange" />
              Today&apos;s Classes ({today})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {todayClasses.length === 0 ? (
              <EmptyState icon={Calendar} title="No classes today" />
            ) : (
              <ul className="space-y-3">
                {todayClasses.map((slot) => (
                  <li
                    key={slot.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl border ${
                      nextClass?.id === slot.id
                        ? "border-kvsr-gold/60 bg-kvsr-gold/[0.06]"
                        : "border-kvsr-soft bg-kvsr-navy/[0.02]"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-kvsr-ink">{slot.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {slot.faculty ?? "Faculty TBA"}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-kvsr-cta whitespace-nowrap">
                      P{slot.periodNumber} · {slot.startTime.slice(0, 5)}–
                      {slot.endTime.slice(0, 5)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
