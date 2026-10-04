import { PageHeader } from "@/components/page-header";
import { SetupSubNav } from "@/components/setup-subnav";
import { SetupSectionForm } from "@/components/setup-section-form";
import { EmptyState } from "@/components/empty-state";
import { requireAdmin } from "@/lib/auth/guards";
import { getAppConfig } from "@/lib/app-config";
import { getEnrollmentPickerTree } from "@/lib/db/enrollment-queries";
import { getFacultyList, getSectionsFull } from "@/lib/db/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Setup · Sections | ${config.institutionShortName} Management`,
  };
}

export default async function SetupSectionsPage() {
  await requireAdmin();

  const [tree, facultyRows, sections] = await Promise.all([
    getEnrollmentPickerTree(null),
    getFacultyList(),
    getSectionsFull(),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Sections"
          subtitle="Sections belong to a study year under a program"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Setup", href: "/admin/setup" },
            { label: "Sections" },
          ]}
        />
        <SetupSubNav current="/admin/setup/sections" />

        <Card className="border border-kvsr-soft bg-white shadow-sm mb-6">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg text-kvsr-navy">New section</CardTitle>
            <CardDescription>
              Each study year can have one section per name (e.g. one A per year).
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {tree.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create departments, programs and study years first — see the
                Departments &amp; Programs card in Settings.
              </p>
            ) : (
              <SetupSectionForm
                tree={tree}
                faculty={facultyRows.map((f) => ({ id: f.id, fullName: f.fullName ?? "" }))}
              />
            )}
          </CardContent>
        </Card>

        <div className="rounded-2xl bg-white border border-kvsr-soft shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 bg-kvsr-navy/[0.03] border-b border-kvsr-soft">
            <h2 className="text-sm font-semibold text-kvsr-ink flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-kvsr-cta" aria-hidden="true" />
              All sections
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-kvsr-navy/[0.06] text-xs font-semibold text-kvsr-muted">
              {sections.length}
            </span>
          </div>
          {sections.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No sections yet"
              description="Create the first section with the form above."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-5 py-3">Section</th>
                    <th className="px-3 py-3">Study year</th>
                    <th className="px-3 py-3">Program</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-5 py-3">Class teacher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kvsr-soft">
                  {sections.map((s) => (
                    <tr key={s.id} className="hover:bg-kvsr-navy/[0.02]">
                      <td className="px-5 py-3 font-semibold text-kvsr-ink">
                        {s.year}-{s.name}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{s.year}</td>
                      <td className="px-3 py-3 text-muted-foreground">{s.program ?? "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{s.department}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {s.classTeacher ?? "Not assigned"}
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
