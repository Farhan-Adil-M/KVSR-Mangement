import { DashboardHeader } from "@/components/dashboard-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSystemConfig,
  getDepartmentsWithPrograms,
  getPeriods,
  getDashboardStats,
} from "@/lib/db/queries";
import {
  Calendar,
  Building2,
  GraduationCap,
  Clock,
  Database,
  Info,
} from "lucide-react";

export const metadata = {
  title: "Settings | KVSR Management",
};

export default async function SettingsPage() {
  const [config, departmentsData, periods, stats] = await Promise.all([
    getSystemConfig(),
    getDepartmentsWithPrograms(),
    getPeriods(),
    getDashboardStats(),
  ]);

  // Group programs by department
  const departments = departmentsData.reduce(
    (acc, row) => {
      if (!acc[row.departmentId]) {
        acc[row.departmentId] = {
          id: row.departmentId,
          code: row.departmentCode,
          name: row.departmentName,
          programs: [],
        };
      }
      if (row.programId) {
        acc[row.departmentId].programs.push({
          id: row.programId,
          code: row.programCode,
          name: row.programName,
          durationYears: row.durationYears,
        });
      }
      return acc;
    },
    {} as Record<
      string,
      {
        id: string;
        code: string;
        name: string;
        programs: {
          id: string;
          code: string | null;
          name: string | null;
          durationYears: number | null;
        }[];
      }
    >
  );

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Settings"
          subtitle="System configuration and academic information"
        />

        {/* Info banner */}
        <div className="mb-6 p-4 rounded-xl bg-kvsr-navy/[0.04] border border-kvsr-soft flex items-start gap-3">
          <Info className="w-5 h-5 text-kvsr-cta shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Settings are currently read-only in development mode. Editable
            configuration will be enabled once authentication and role-based
            access are implemented.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Academic year */}
          <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
                <Calendar className="w-5 h-5 text-kvsr-orange" />
                Academic Year
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.currentYear ? (
                <>
                  <div>
                    <p className="text-2xl font-bold text-kvsr-ink">
                      {config.currentYear.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Current active year
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-kvsr-soft">
                    <div>
                      <p className="text-xs text-muted-foreground">Start</p>
                      <p className="text-sm font-medium text-kvsr-ink">
                        {config.currentYear.startDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">End</p>
                      <p className="text-sm font-medium text-kvsr-ink">
                        {config.currentYear.endDate}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No active academic year set.</p>
              )}
            </CardContent>
          </Card>

          {/* System stats */}
          <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
                <Database className="w-5 h-5 text-kvsr-orange" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-kvsr-navy/[0.04]">
                  <p className="text-xl font-bold text-kvsr-ink">
                    {config.departments}
                  </p>
                  <p className="text-xs text-muted-foreground">Departments</p>
                </div>
                <div className="p-3 rounded-xl bg-kvsr-navy/[0.04]">
                  <p className="text-xl font-bold text-kvsr-ink">
                    {config.programs}
                  </p>
                  <p className="text-xs text-muted-foreground">Programs</p>
                </div>
                <div className="p-3 rounded-xl bg-kvsr-navy/[0.04]">
                  <p className="text-xl font-bold text-kvsr-ink">
                    {config.academicYears}
                  </p>
                  <p className="text-xs text-muted-foreground">Academic Years</p>
                </div>
                <div className="p-3 rounded-xl bg-kvsr-navy/[0.04]">
                  <p className="text-xl font-bold text-kvsr-ink">
                    {stats.periods}
                  </p>
                  <p className="text-xs text-muted-foreground">Periods/Day</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Departments */}
          <Card className="border border-kvsr-soft/80 bg-white shadow-sm lg:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
                <Building2 className="w-5 h-5 text-kvsr-orange" />
                Departments & Programs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(departments).map((dept) => (
                  <div
                    key={dept.id}
                    className="p-4 rounded-xl border border-kvsr-soft bg-kvsr-navy/[0.02]"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-2 py-1 rounded-lg bg-kvsr-navy text-white text-xs font-bold">
                        {dept.code}
                      </span>
                      <h4 className="font-semibold text-kvsr-ink">{dept.name}</h4>
                    </div>
                    {dept.programs.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {dept.programs.map((program) => (
                          <span
                            key={program.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-kvsr-soft text-sm text-muted-foreground"
                          >
                            <GraduationCap className="w-3.5 h-3.5 text-kvsr-cta" />
                            {program.name} ({program.durationYears} years)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No programs configured.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Periods */}
          <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
                <Clock className="w-5 h-5 text-kvsr-orange" />
                Daily Periods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {periods.map((period) => (
                  <div
                    key={period.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-kvsr-navy/[0.03]"
                  >
                    <span className="text-sm font-medium text-kvsr-ink">
                      P{period.periodNumber}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {period.startTime.slice(0, 5)} - {period.endTime.slice(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
