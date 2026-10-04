import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { getAppConfig } from "@/lib/app-config";
import {
  getDepartmentsWithHod,
  getFacultyList,
} from "@/lib/actions/admin";
import { DepartmentsManager } from "@/components/departments-manager";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Departments | ${config.institutionShortName} Management`,
  };
}

export default async function DepartmentsPage() {
  await requireAdmin();

  const [departments, faculty, config] = await Promise.all([
    getDepartmentsWithHod(),
    getFacultyList(),
    getAppConfig(),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Departments"
          subtitle="Create departments, assign HODs, and keep the academic structure organized."
          breadcrumbs={[{ label: "Departments" }]}
        />
        <DepartmentsManager
          departments={departments}
          faculty={faculty}
          institutionShortName={config.institutionShortName}
        />
      </div>
    </div>
  );
}
