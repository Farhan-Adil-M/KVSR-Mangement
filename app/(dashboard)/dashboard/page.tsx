import { School } from "lucide-react";
import { getDashboardStats } from "@/lib/db/queries";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardStats } from "@/components/dashboard-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Dashboard | KVSR Management",
};

export const revalidate = 60;

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Dashboard"
          subtitle="Welcome to KVSR Management System"
        />

        <DashboardStats
          students={stats.students}
          faculty={stats.faculty}
          slots={stats.slots}
          periods={stats.periods}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-none shadow-lg h-full">
              <CardHeader>
                <CardTitle className="text-kvsr-navy flex items-center gap-2">
                  <School className="w-5 h-5 text-kvsr-orange" />
                  Department Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Currently managing the Computer Science and Engineering (CSE)
                  department. The system is architected to scale across multiple
                  departments, programs, and academic years as the institution
                  grows.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-kvsr-navy/5">
                    <div className="text-2xl font-bold text-kvsr-navy">CSE</div>
                    <div className="text-sm text-muted-foreground">
                      Active Department
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-kvsr-navy/5">
                    <div className="text-2xl font-bold text-kvsr-navy">
                      2026-27
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Academic Year
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-none shadow-lg h-full">
              <CardHeader>
                <CardTitle className="text-kvsr-navy">Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    { label: "View Timetable", href: "/timetable" },
                    { label: "Track Attendance", href: "#" },
                    { label: "Manage Students", href: "#" },
                    { label: "Faculty Directory", href: "#" },
                  ].map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-kvsr-navy/5 transition-colors group"
                      >
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-kvsr-navy">
                          {link.label}
                        </span>
                        <span className="text-kvsr-orange opacity-0 group-hover:opacity-100 transition-opacity">
                          →
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
