import { PageHeader } from "@/components/page-header";
import { SetupSubNav } from "@/components/setup-subnav";
import { SetupStudentForm } from "@/components/setup-student-form";
import { EmptyState } from "@/components/empty-state";
import { requireAdmin } from "@/lib/auth/guards";
import { getAppConfig } from "@/lib/app-config";
import { getStudentsAdminList } from "@/lib/db/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, GraduationCap, Lock, Search, XCircle } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Setup · Students | ${config.institutionShortName} Management`,
  };
}

interface SetupStudentsPageProps {
  searchParams: { q?: string };
}

export default async function SetupStudentsPage({ searchParams }: SetupStudentsPageProps) {
  await requireAdmin();

  const rows = await getStudentsAdminList(searchParams.q ?? "");

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Students"
          subtitle="Create student accounts and review the roster"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Setup", href: "/admin/setup" },
            { label: "Students" },
          ]}
        />
        <SetupSubNav current="/admin/setup/students" />

        <Card className="border border-kvsr-soft bg-white shadow-sm mb-6">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg text-kvsr-navy">New student</CardTitle>
            <CardDescription>
              Students set their own contact info and confirm it to lock it later.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <SetupStudentForm />
          </CardContent>
        </Card>

        <div className="rounded-2xl bg-white border border-kvsr-soft shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-kvsr-navy/[0.03] border-b border-kvsr-soft">
            <h2 className="text-sm font-semibold text-kvsr-ink flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-kvsr-cta" aria-hidden="true" />
              All students
            </h2>
            <form action="/admin/setup/students" method="GET" className="flex gap-2">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  name="q"
                  defaultValue={searchParams.q ?? ""}
                  placeholder="Search name, roll or email"
                  aria-label="Search students"
                  className="w-56 bg-white border border-kvsr-soft rounded-xl pl-10 pr-4 py-2.5 min-h-[48px] sm:min-h-[40px] text-sm text-kvsr-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
                />
              </div>
            </form>
          </div>
          {rows.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title={searchParams.q ? "No students match your search" : "No students yet"}
              description={
                searchParams.q
                  ? "Try a different name, roll number or email."
                  : "Create the first student with the form above."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-5 py-3">Roll number</th>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Phone</th>
                    <th className="px-3 py-3">Contact</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kvsr-soft">
                  {rows.map((s) => (
                    <tr key={s.id} className="hover:bg-kvsr-navy/[0.02]">
                      <td className="px-5 py-3 font-medium text-kvsr-ink">
                        {s.rollNumber}
                      </td>
                      <td className="px-3 py-3 text-kvsr-ink">{s.fullName}</td>
                      <td className="px-3 py-3 text-muted-foreground">{s.email ?? "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{s.phone ?? "—"}</td>
                      <td className="px-3 py-3">
                        {s.contactLockedAt ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-kvsr-navy/[0.06] text-kvsr-muted text-xs font-semibold">
                            <Lock className="w-3 h-3" aria-hidden="true" />
                            Locked
                          </span>
                        ) : s.email || s.phone ? (
                          <span className="text-xs text-muted-foreground">Editable</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not set</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {s.isActive === false ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Active
                          </span>
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
