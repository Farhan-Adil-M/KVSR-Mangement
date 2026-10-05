import { EnrollmentManager } from "@/components/enrollment-manager";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireHodOnly } from "@/lib/auth/guards";
import { getSectionCRs } from "@/lib/actions/cr";
import { getFacultyDepartmentId } from "@/lib/db/event-queries";
import {
  getEnrollmentPickerTree,
  getEnrollmentWorkspace,
} from "@/lib/db/enrollment-queries";
import { getAppConfig } from "@/lib/app-config";
import { Building2 } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Enrollment | ${config.institutionShortName} Management`,
  };
}

interface EnrollmentPageProps {
  searchParams: { section?: string; dept?: string };
}

export default async function FacultyEnrollmentPage({
  searchParams,
}: EnrollmentPageProps) {
  const session = await requireHodOnly();
  const departmentId = await getFacultyDepartmentId(session.id);

  if (!departmentId) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Enrollment"
            breadcrumbs={[
              { label: "Faculty", href: "/faculty/dashboard" },
              { label: "Enrollment" },
            ]}
          />
          <EmptyState
            icon={Building2}
            title="No department assigned"
            description="Enrollment is scoped to your department. Ask an admin to set your department first."
          />
        </div>
      </div>
    );
  }

  const tree = await getEnrollmentPickerTree(departmentId);

  const row = tree.find((r) => r.sectionId === searchParams.section) ?? null;
  let activeDeptId: string | null;
  let sectionId: string | null;
  if (row) {
    activeDeptId = row.departmentId;
    sectionId = row.sectionId;
  } else if (searchParams.dept && tree.some((r) => r.departmentId === searchParams.dept)) {
    activeDeptId = searchParams.dept;
    sectionId = null;
  } else {
    const first = tree.find((r) => r.sectionId) ?? null;
    activeDeptId = first?.departmentId ?? tree[0]?.departmentId ?? null;
    sectionId = first?.sectionId ?? null;
  }

  const [workspace, crs] = await Promise.all([
    sectionId
      ? getEnrollmentWorkspace(departmentId, sectionId, session.id)
      : Promise.resolve(null),
    sectionId ? getSectionCRs(sectionId) : Promise.resolve([]),
  ]);

  const sectionLabel = row ? `${row.yearLabel}-${row.sectionName}` : null;

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Enrollment"
          subtitle="Assign your department's students to sections"
          breadcrumbs={[
            { label: "Faculty", href: "/faculty/dashboard" },
            { label: "Enrollment" },
          ]}
        />
        <EnrollmentManager
          key={sectionId ?? activeDeptId ?? "none"}
          basePath="/faculty/enrollment"
          tree={tree}
          departmentId={departmentId}
          activeDeptId={activeDeptId}
          sectionId={sectionId}
          sectionLabel={sectionLabel}
          enrolled={workspace?.enrolled ?? []}
          unenrolled={workspace?.unenrolled ?? []}
          crs={crs}
        />
      </div>
    </div>
  );
}
