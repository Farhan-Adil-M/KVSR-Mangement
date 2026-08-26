import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { getFacultyDaySlots, getFacultyNotifications } from "@/lib/db/portal-queries";
import { getFacultyAssignments, requireFaculty } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, ClipboardCheck, BookOpen, Bell, ArrowRight } from "lucide-react";
import { getCollegeNow } from "@/lib/utils";

export const metadata = { title: "Faculty Dashboard | KVSR Management" };
export const dynamic = "force-dynamic";

export default async function FacultyDashboardPage() {
  const session = await requireFaculty();

  const collegeNow = getCollegeNow();
  const today = collegeNow.dayName;
  const isTeachingDay = today !== "Sunday";

  const [todaySlots, assignments, notifications] = await Promise.all([
    isTeachingDay ? getFacultyDaySlots(session.id, today) : Promise.resolve([]),
    getFacultyAssignments(session.id),
    getFacultyNotifications(session.id),
  ]);

  const pending = todaySlots.filter((s) => !s.sessionId);
  const nowMinutes = collegeNow.minutesSinceMidnight;
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const nextClass = todaySlots.find((s) => toMinutes(s.startTime) > nowMinutes) ?? null;

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title={`Welcome, ${session.name.split(" ")[0]}`}
          subtitle={`${today}${isTeachingDay ? "" : " · no classes scheduled"}`}
        />

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
            <CardContent className="pt-6 px-6 pb-6">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-kvsr-cta" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today</span>
              </div>
              <div className="text-3xl font-bold text-kvsr-ink">{todaySlots.length}</div>
              <p className="text-xs text-muted-foreground mt-1">classes scheduled</p>
            </CardContent>
          </Card>
          <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
            <CardContent className="pt-6 px-6 pb-6">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardCheck className="w-4 h-4 text-kvsr-cta" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</span>
              </div>
              <div className="text-3xl font-bold text-kvsr-ink">{pending.length}</div>
              <p className="text-xs text-muted-foreground mt-1">attendance to mark today</p>
            </CardContent>
          </Card>
          <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
            <CardContent className="pt-6 px-6 pb-6">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-kvsr-cta" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">My Classes</span>
              </div>
              <div className="text-3xl font-bold text-kvsr-ink">{assignments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">assigned subject-sections</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's schedule */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
              <CardHeader className="pb-4 pt-6 px-6">
                <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
                  <Clock className="w-5 h-5 text-kvsr-orange" />
                  Today&apos;s Classes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {todaySlots.length === 0 ? (
                  <EmptyState icon={Calendar} title="No classes today" />
                ) : (
                  <ul className="space-y-3">
                    {todaySlots.map((slot) => {
                      const isNext = nextClass?.id === slot.id;
                      return (
                        <li
                          key={slot.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-colors ${
                            isNext
                              ? "border-kvsr-gold/60 bg-kvsr-gold/[0.06]"
                              : "border-kvsr-soft bg-kvsr-navy/[0.02]"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-kvsr-ink">{slot.subject}</p>
                              {isNext && (
                                <span className="px-2 py-0.5 rounded-full bg-kvsr-gold text-kvsr-deep text-[10px] font-bold uppercase">
                                  Next
                                </span>
                              )}
                              {slot.isLab && (
                                <span className="px-2 py-0.5 rounded-full bg-kvsr-orange/10 text-kvsr-cta text-xs font-medium">
                                  Lab
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              P{slot.periodNumber} · {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)} · {slot.year}-{slot.section}
                            </p>
                          </div>
                          <Link
                            href={`/faculty/attendance?slot=${slot.id}`}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                              slot.sessionId
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-kvsr-cta text-white hover:bg-kvsr-cta/90"
                            }`}
                          >
                            {slot.sessionId ? "Attendance done ✓" : "Mark Attendance"}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notifications preview */}
          <div>
            <Card className="border border-kvsr-soft/80 bg-white shadow-sm h-full">
              <CardHeader className="pb-4 pt-6 px-6">
                <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
                  <Bell className="w-5 h-5 text-kvsr-orange" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notifications.</p>
                ) : (
                  <ul className="space-y-3">
                    {notifications.slice(0, 4).map((n) => (
                      <li key={n.id} className="pb-3 border-b border-kvsr-soft last:border-0 last:pb-0">
                        <p className="text-sm font-medium text-kvsr-ink">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/faculty/notifications"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-kvsr-cta hover:underline"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
