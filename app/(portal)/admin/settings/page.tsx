import { DashboardHeader } from "@/components/dashboard-header";
import { requireAdmin } from "@/lib/auth/guards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSystemConfig,
  getDepartmentsWithPrograms,
  getPeriods,
  getDashboardStats,
} from "@/lib/db/queries";
import { getCampusSettings } from "@/lib/actions/campus";
import { getAppConfig } from "@/lib/app-config";
import { CampusSettingsForm } from "@/components/campus-settings-form";
import { AppSettingsForm } from "@/components/app-settings-form";
import {
  DepartmentsProgramsManager,
  type DepartmentItem,
} from "@/components/departments-programs-manager";
import { Calendar, Database, Clock, MapPin, SlidersHorizontal } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Settings | ${config.institutionShortName} Management`,
  };
}

export default async function SettingsPage() {
  await requireAdmin();
  const [config, departmentsData, periods, stats, campus, appConfig] =
    await Promise.all([
      getSystemConfig(),
      getDepartmentsWithPrograms(),
      getPeriods(),
      getDashboardStats(),
      getCampusSettings(),
      getAppConfig(),
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
    {} as Record<string, DepartmentItem>
  );
  const departmentItems = Object.values(departments);

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <DashboardHeader
          title="Settings"
          subtitle="System configuration and academic information"
        />

        {/* Campus location (geofence) */}
        <Card className="border border-kvsr-soft bg-white shadow-sm">
          <CardHeader className="px-6 pt-6 pb-3">
            <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
              <MapPin className="w-5 h-5 text-kvsr-orange" />
              Campus Location (Geofence)
            </CardTitle>
            <CardDescription className="pl-7">
              The on-campus radius used to verify attendance location.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {campus ? (
              <CampusSettingsForm
                initial={{
                  latitude: campus.latitude,
                  longitude: campus.longitude,
                  radiusMeters: campus.radiusMeters,
                  name: campus.name,
                }}
              />
            ) : (
              <>
                <p className="text-sm text-slate-700 mb-5">
                  No campus configured. Set the coordinates below to enable
                  on-campus attendance.
                </p>
                <CampusSettingsForm
                  initial={{
                    latitude: 0,
                    longitude: 0,
                    radiusMeters: 200,
                    name: null,
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border border-kvsr-soft bg-white shadow-sm">
          <CardHeader className="px-6 pt-6 pb-3">
            <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-kvsr-orange" />
              App Configuration
            </CardTitle>
            <CardDescription className="pl-7">
              Thresholds and identity used across every portal — students,
              faculty and the public pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <AppSettingsForm initial={appConfig} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Academic year */}
          <Card className="border border-kvsr-soft bg-white shadow-sm">
            <CardHeader className="px-6 pt-6 pb-3">
              <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
                <Calendar className="w-5 h-5 text-kvsr-orange" />
                Academic Year
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-5">
              {config.currentYear ? (
                <>
                  <div>
                    <p className="text-2xl font-bold text-kvsr-ink">
                      {config.currentYear.name}
                    </p>
                    <p className="text-sm text-slate-700 mt-1.5">
                      Current active year
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-kvsr-soft">
                    <div>
                      <p className="text-xs text-slate-700">Start</p>
                      <p className="text-sm font-medium text-kvsr-ink mt-1">
                        {config.currentYear.startDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-700">End</p>
                      <p className="text-sm font-medium text-kvsr-ink mt-1">
                        {config.currentYear.endDate}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-700">No active academic year set.</p>
              )}
            </CardContent>
          </Card>

          {/* System stats */}
          <Card className="border border-kvsr-soft bg-white shadow-sm">
            <CardHeader className="px-6 pt-6 pb-3">
              <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
                <Database className="w-5 h-5 text-kvsr-orange" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-kvsr-navy/[0.04]">
                  <p className="text-xl font-bold text-kvsr-ink">
                    {config.departments}
                  </p>
                  <p className="text-xs text-slate-700 mt-1">Departments</p>
                </div>
                <div className="p-4 rounded-xl bg-kvsr-navy/[0.04]">
                  <p className="text-xl font-bold text-kvsr-ink">
                    {config.programs}
                  </p>
                  <p className="text-xs text-slate-700 mt-1">Programs</p>
                </div>
                <div className="p-4 rounded-xl bg-kvsr-navy/[0.04]">
                  <p className="text-xl font-bold text-kvsr-ink">
                    {config.academicYears}
                  </p>
                  <p className="text-xs text-slate-700 mt-1">Academic Years</p>
                </div>
                <div className="p-4 rounded-xl bg-kvsr-navy/[0.04]">
                  <p className="text-xl font-bold text-kvsr-ink">
                    {stats.periods}
                  </p>
                  <p className="text-xs text-slate-700 mt-1">Periods/Day</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Departments & Programs */}
          <Card className="border border-kvsr-soft bg-white shadow-sm lg:col-span-2">
            <CardHeader className="px-6 pt-6 pb-3">
              <CardTitle className="text-lg text-kvsr-navy">
                Departments &amp; Programs
              </CardTitle>
              <CardDescription>
                Add departments and the programs under them.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <DepartmentsProgramsManager departments={departmentItems} />
            </CardContent>
          </Card>

          {/* Periods */}
          <Card className="border border-kvsr-soft bg-white shadow-sm">
            <CardHeader className="px-6 pt-6 pb-3">
              <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
                <Clock className="w-5 h-5 text-kvsr-orange" />
                Daily Periods
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-2.5">
                {periods.map((period) => (
                  <div
                    key={period.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-kvsr-navy/[0.03]"
                  >
                    <span className="text-sm font-medium text-kvsr-ink">
                      P{period.periodNumber}
                    </span>
                    <span className="text-sm text-slate-700">
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
