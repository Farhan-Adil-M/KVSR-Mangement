import { PageHeader } from "@/components/page-header";
import { SetupSubNav } from "@/components/setup-subnav";
import { SetupSubjectForm } from "@/components/setup-subject-form";
import { EmptyState } from "@/components/empty-state";
import { requireAdmin } from "@/lib/auth/guards";
import { getAppConfig } from "@/lib/app-config";
import { getDepartmentsWithPrograms, getSubjectsList } from "@/lib/db/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookMarked } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Setup · Subjects | ${config.institutionShortName} Management`,
  };
}

export default async function SetupSubjectsPage() {
  await requireAdmin();

  const [deptRows, subjects] = await Promise.all([
    getDepartmentsWithPrograms(),
    getSubjectsList(),
  ]);

  const seen = new Set<string>();
  const departments: { id: string; code: string; name: string }[] = [];
  for (const row of deptRows) {
    if (!seen.has(row.departmentId)) {
      seen.add(row.departmentId);
      departments.push({
        id: row.departmentId,
        code: row.departmentCode,
        name: row.departmentName,
      });
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Subjects"
          subtitle="The subject catalogue used for timetables, assignments and marks"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Setup", href: "/admin/setup" },
            { label: "Subjects" },
          ]}
        />
        <SetupSubNav current="/admin/setup/subjects" />

        <Card className="border border-kvsr-soft bg-white shadow-sm mb-6">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg text-kvsr-navy">New subject</CardTitle>
            <CardDescription>
              Mark lab subjects so timetable lab slots and lab sessions work correctly.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <SetupSubjectForm departments={departments} />
          </CardContent>
        </Card>

        <div className="rounded-2xl bg-white border border-kvsr-soft shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 bg-kvsr-navy/[0.03] border-b border-kvsr-soft">
            <h2 className="text-sm font-semibold text-kvsr-ink flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-kvsr-cta" aria-hidden="true" />
              All subjects
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-kvsr-navy/[0.06] text-xs font-semibold text-kvsr-muted">
              {subjects.length}
            </span>
          </div>
          {subjects.length === 0 ? (
            <EmptyState
              icon={BookMarked}
              title="No subjects yet"
              description="Create the first subject with the form above."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-3 py-3">Code</th>
                    <th className="px-3 py-3">Short name</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-5 py-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kvsr-soft">
                  {subjects.map((s) => (
                    <tr key={s.id} className="hover:bg-kvsr-navy/[0.02]">
                      <td className="px-5 py-3 font-medium text-kvsr-ink">{s.name}</td>
                      <td className="px-3 py-3 text-muted-foreground">{s.code ?? "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{s.shortName ?? "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{s.department ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.isLab && (
                            <span className="px-2 py-0.5 rounded-full bg-kvsr-orange/10 text-kvsr-cta text-xs font-semibold">
                              Lab
                            </span>
                          )}
                          {s.isElective && (
                            <span className="px-2 py-0.5 rounded-full bg-kvsr-navy/[0.06] text-kvsr-muted text-xs font-semibold">
                              Elective
                            </span>
                          )}
                          {!s.isLab && !s.isElective && (
                            <span className="text-xs text-muted-foreground">Theory</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
