import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardStats } from "@/components/dashboard-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, getCurrentAcademicYear } from "@/lib/db/queries";
import { requireAdmin } from "@/lib/auth/guards";
import { School, Users, Calendar, Bell, BookOpen } from "lucide-react";

export const metadata = { title: "Admin Dashboard | KVSR Management" };
export const revalidate = 60;

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [stats, currentYear] = await Promise.all([getDashboardStats(), getCurrentAcademicYear()]);

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="HOD Dashboard"
          subtitle="Department overview and management"
        />

        <DashboardStats
          students={stats.students}
          faculty={stats.faculty}
          slots={stats.slots}
          periods={stats.periods}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border border-kvsr-soft/80 bg-white shadow-sm h-full">
              <CardHeader className="pb-4 pt-6 px-6">
                <CardTitle className="text-kvsr-navy flex items-center gap-2 text-lg">
                  <School className="w-5 h-5 text-kvsr-orange" />
                  Management
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      href: "/admin/students",
                      label: "Student Performance",
                      desc: "Analytics, filters, attention lists",
                      icon: Users,
                    },
                    {
                      href: "/admin/faculty",
                      label: "Faculty & Assignments",
                      desc: "Directory, schedules, class assignments",
                      icon: BookOpen,
                    },
                    {
                      href: "/admin/attendance/reports",
                      label: "Attendance Reports",
                      desc: "Section-wise attendance summaries",
                      icon: Calendar,
                    },
                    {
                      href: "/admin/notifications",
                      label: "Notifications",
                      desc: "Broadcast to faculty and students",
                      icon: Bell,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group p-4 rounded-xl border border-kvsr-soft hover:border-kvsr-navy/20 hover:shadow-sm transition-all"
                      >
                        <Icon className="w-5 h-5 text-kvsr-cta mb-2" />
                        <p className="font-semibold text-kvsr-ink text-sm group-hover:text-kvsr-cta transition-colors">
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.desc}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border border-kvsr-soft/80 bg-white shadow-sm h-full">
              <CardHeader className="pb-4 pt-6 px-6">
                <CardTitle className="text-kvsr-navy text-lg">Academic Year</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="p-4 rounded-xl bg-kvsr-navy/[0.04]">
                  <div className="text-2xl font-bold text-kvsr-navy">
                    {currentYear?.name ?? "—"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    Current academic year
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                  CSE department. Manage faculty class assignments from the
                  faculty directory.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
