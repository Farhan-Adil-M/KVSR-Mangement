import { PageHeader } from "@/components/page-header";
import { SetupSubNav } from "@/components/setup-subnav";
import { SetupFacultyForm } from "@/components/setup-faculty-form";
import { EmptyState } from "@/components/empty-state";
import { requireAdmin } from "@/lib/auth/guards";
import { getAppConfig } from "@/lib/app-config";
import {
  getDepartmentsWithPrograms,
  getFacultyList,
} from "@/lib/db/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Users } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Setup · Faculty | ${config.institutionShortName} Management`,
  };
}

export default async function SetupFacultyPage() {
  await requireAdmin();

  const [deptRows, facultyRows] = await Promise.all([
    getDepartmentsWithPrograms(),
    getFacultyList(),
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
          title="Faculty accounts"
          subtitle="Create staff logins — new faculty can sign in immediately"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Setup", href: "/admin/setup" },
            { label: "Faculty" },
          ]}
        />
        <SetupSubNav current="/admin/setup/faculty" />

        <Card className="border border-kvsr-soft bg-white shadow-sm mb-6">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg text-kvsr-navy">New faculty account</CardTitle>
            <CardDescription>
              The username and password are the login credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <SetupFacultyForm departments={departments} />
          </CardContent>
        </Card>

        <div className="rounded-2xl bg-white border border-kvsr-soft shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 bg-kvsr-navy/[0.03] border-b border-kvsr-soft">
            <h2 className="text-sm font-semibold text-kvsr-ink flex items-center gap-2">
              <Users className="w-4 h-4 text-kvsr-cta" aria-hidden="true" />
              All faculty
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-kvsr-navy/[0.06] text-xs font-semibold text-kvsr-muted">
              {facultyRows.length}
            </span>
          </div>
          {facultyRows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No faculty yet"
              description="Create the first faculty account with the form above."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Phone</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-5 py-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kvsr-soft">
                  {facultyRows.map((f) => (
                    <tr key={f.id} className="hover:bg-kvsr-navy/[0.02]">
                      <td className="px-5 py-3 font-medium text-kvsr-ink">
                        {f.fullName ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {f.email ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {f.phone ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {f.department ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        {f.isHod ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-kvsr-gold/15 text-kvsr-cta text-xs font-semibold">
                            <Crown className="w-3 h-3" aria-hidden="true" />
                            HOD
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Faculty</span>
                        )}
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
