import { EnrollmentManager } from "@/components/enrollment-manager";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth/guards";
import { getSectionCRs } from "@/lib/actions/cr";
import {
  getEnrollmentPickerTree,
  getEnrollmentWorkspace,
} from "@/lib/db/enrollment-queries";
import { getAppConfig } from "@/lib/app-config";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Enrollment | ${config.institutionShortName} Management`,
  };
}

interface EnrollmentPageProps {
  searchParams: { section?: string; dept?: string };
}

export default async function AdminEnrollmentPage({
  searchParams,
}: EnrollmentPageProps) {
  await requireAdmin();

  const tree = await getEnrollmentPickerTree(null);

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
      ? getEnrollmentWorkspace(null, sectionId, null)
      : Promise.resolve(null),
    sectionId ? getSectionCRs(sectionId) : Promise.resolve([]),
  ]);

  const sectionLabel = row ? `${row.yearLabel}-${row.sectionName}` : null;

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Enrollment"
          subtitle="Assign students of any department to sections"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Enrollment" },
          ]}
        />
        <EnrollmentManager
          key={sectionId ?? activeDeptId ?? "none"}
          basePath="/admin/enrollment"
          tree={tree}
          departmentId={null}
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
