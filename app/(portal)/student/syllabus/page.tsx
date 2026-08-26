import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { getStudentContext, requireStudent } from "@/lib/auth/guards";
import { getStudentSyllabus } from "@/lib/db/portal-queries";
import { BookOpen } from "lucide-react";

export const metadata = { title: "Syllabus | KVSR Management" };

export default async function StudentSyllabusPage() {
  const session = await requireStudent();
  const ctx = await getStudentContext(session.id);

  if (!ctx) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader title="Syllabus" />
          <EmptyState
            icon={BookOpen}
            title="No active enrollment"
            description="You are not enrolled in a section for the current academic year."
          />
        </div>
      </div>
    );
  }

  const subjects = await getStudentSyllabus(ctx.sectionId);
  const withUnits = subjects.filter((s) => s.units.length > 0);

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Syllabus"
          subtitle={`Units and modules for ${ctx.yearLabel}-${ctx.sectionName} subjects`}
        />

        {subjects.length === 0 ? (
          <EmptyState icon={BookOpen} title="No subjects found" />
        ) : withUnits.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Syllabus not published yet"
            description="Your subjects are listed below — syllabus units will appear once faculty publish them."
          />
        ) : (
          <div className="space-y-6">
            {withUnits.map((s) => (
              <div key={s.subjectId}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {s.subject}
                </h2>
                <div className="bg-white rounded-2xl border border-kvsr-soft shadow-sm overflow-hidden">
                  <div className="divide-y divide-kvsr-soft">
                    {s.units.map((u) => (
                      <div key={u.unitNumber} className="px-5 py-4 flex gap-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-kvsr-navy/[0.06] text-kvsr-navy text-sm font-bold shrink-0">
                          {u.unitNumber}
                        </span>
                        <div>
                          <p className="font-medium text-kvsr-ink">{u.title}</p>
                          {u.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                              {u.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {subjects.length > withUnits.length && (
              <p className="text-sm text-muted-foreground">
                Syllabus pending for:{" "}
                {subjects
                  .filter((s) => s.units.length === 0)
                  .map((s) => s.subject)
                  .join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
