import { ResourceManager } from "@/components/resource-manager";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getStudentContext, requireStudent, isStudentCR } from "@/lib/auth/guards";
import { getSectionResources } from "@/lib/actions/resources";
import { getStudentSyllabus } from "@/lib/db/portal-queries";
import { getAppConfig } from "@/lib/app-config";
import { GraduationCap } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Resources | ${config.institutionShortName} Management`,
  };
}

export default async function StudentResourcesPage() {
  const session = await requireStudent();
  const ctx = await getStudentContext(session.id);

  if (!ctx) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Resources"
            breadcrumbs={[{ label: "Student", href: "/student/dashboard" }, { label: "Resources" }]}
          />
          <EmptyState
            icon={GraduationCap}
            title="No active enrollment"
            description="You are not enrolled in a section for the current academic year."
          />
        </div>
      </div>
    );
  }

  const [resources, isCR, syllabus] = await Promise.all([
    getSectionResources(ctx.sectionId),
    isStudentCR(session.id, ctx.sectionId),
    getStudentSyllabus(ctx.sectionId),
  ]);

  const subjectMap = new Map<string, string>();
  for (const row of syllabus) {
    if (!subjectMap.has(row.subjectId)) {
      subjectMap.set(row.subjectId, row.subject);
    }
  }
  const subjects = Array.from(subjectMap.entries()).map(([id, name]) => ({ id, name }));

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Resources"
          subtitle={`Notes and files for ${ctx.yearLabel}-${ctx.sectionName}`}
          breadcrumbs={[{ label: "Student", href: "/student/dashboard" }, { label: "Resources" }]}
        />

        {isCR && (
          <p className="mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-kvsr-gold/15 text-kvsr-cta border border-kvsr-gold/30 text-xs font-bold uppercase tracking-wide">
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
              Class Representative
            </span>
          </p>
        )}

        <ResourceManager
          sectionId={ctx.sectionId}
          resources={resources}
          subjects={subjects}
          isCR={isCR}
        />
      </div>
    </div>
  );
}
