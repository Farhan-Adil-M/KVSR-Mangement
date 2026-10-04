import { PageHeader } from "@/components/page-header";
import { SetupSubNav } from "@/components/setup-subnav";
import { SetupAcademicYears } from "@/components/setup-academic-years";
import { EmptyState } from "@/components/empty-state";
import { requireAdmin } from "@/lib/auth/guards";
import { getAppConfig } from "@/lib/app-config";
import { getAcademicYearsList } from "@/lib/db/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Setup · Academic Years | ${config.institutionShortName} Management`,
  };
}

export default async function SetupAcademicYearsPage() {
  await requireAdmin();

  const years = await getAcademicYearsList();

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Academic years"
          subtitle="Year ranges for enrollments, attendance and records"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Setup", href: "/admin/setup" },
            { label: "Academic Years" },
          ]}
        />
        <SetupSubNav current="/admin/setup/academic-years" />

        <Card className="border border-kvsr-soft bg-white shadow-sm">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-kvsr-cta" aria-hidden="true" />
              Manage years
            </CardTitle>
            <CardDescription>
              Setting a year as current moves it off the previous one.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <SetupAcademicYears
              years={years.map((y) => ({
                id: y.id,
                name: y.name,
                startDate: String(y.startDate),
                endDate: String(y.endDate),
                isCurrent: y.isCurrent,
              }))}
            />
          </CardContent>
        </Card>

        {years.length === 0 && (
          <div className="mt-6">
            <EmptyState
              icon={CalendarDays}
              title="No academic years yet"
              description="Create the first year above — mark it current so enrollments work."
            />
          </div>
        )}
      </div>
    </div>
  );
}
