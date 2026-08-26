import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { getStudentContext, requireStudent } from "@/lib/auth/guards";
import { getStudentMarks } from "@/lib/db/portal-queries";
import { Award } from "lucide-react";

export const metadata = { title: "My Marks | KVSR Management" };

export default async function StudentMarksPage() {
  const session = await requireStudent();
  const ctx = await getStudentContext(session.id);

  if (!ctx) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader title="My Marks" />
          <EmptyState
            icon={Award}
            title="No active enrollment"
            description="You are not enrolled in a section for the current academic year."
          />
        </div>
      </div>
    );
  }

  const marks = await getStudentMarks(session.id);

  // Group by subject
  const bySubject = new Map<string, typeof marks>();
  for (const m of marks) {
    if (!bySubject.has(m.subject)) bySubject.set(m.subject, []);
    bySubject.get(m.subject)!.push(m);
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="My Marks"
          subtitle={`${ctx.yearLabel}-${ctx.sectionName} · Roll #${ctx.rollNumber}`}
        />

        {marks.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No marks published yet"
            description="When your faculty records test marks, they appear here."
          />
        ) : (
          <div className="space-y-6">
            {Array.from(bySubject.entries()).map(([subject, rows]) => (
              <div key={subject}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {subject}
                </h2>
                <div className="bg-white rounded-2xl border border-kvsr-soft shadow-sm overflow-hidden">
                  <div className="divide-y divide-kvsr-soft">
                    {rows.map((m) => {
                      const pct = Math.round((Number(m.marksObtained) / Number(m.maxMarks)) * 100);
                      return (
                        <div
                          key={m.id}
                          className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <p className="font-medium text-kvsr-ink">{m.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {m.examType}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-kvsr-ink">
                              {Number(m.marksObtained)}
                              <span className="text-sm text-muted-foreground font-normal">
                                {" "}/ {Number(m.maxMarks)}
                              </span>
                            </span>
                            <span
                              className={`text-sm font-semibold w-12 text-right ${
                                pct >= 60 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-red-600"
                              }`}
                            >
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
