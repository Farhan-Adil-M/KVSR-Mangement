import { EventManager } from "@/components/event-manager";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { getEventsForRole } from "@/lib/db/event-queries";
import { getDepartmentsWithPrograms } from "@/lib/db/queries";
import { getAppConfig } from "@/lib/app-config";
import { getCollegeNow } from "@/lib/utils";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Events | ${config.institutionShortName} Management`,
  };
}

export default async function AdminEventsPage() {
  await requireAdmin();

  const [events, deptRows, today] = await Promise.all([
    getEventsForRole("admin"),
    getDepartmentsWithPrograms(),
    Promise.resolve(getCollegeNow().date),
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
          title="Events"
          subtitle="Create and manage events for the institution or a department"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Events" },
          ]}
        />

        <EventManager
          events={events}
          role="admin"
          ownDepartmentId={null}
          ownDepartmentName={null}
          hodFacultyId={null}
          departments={departments}
          today={today}
        />
      </div>
    </div>
  );
}
