import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { getStudentContext, requireStudent } from "@/lib/auth/guards";
import { getStudentExams } from "@/lib/db/portal-queries";
import { FileText } from "lucide-react";

export const metadata = { title: "Examinations | KVSR Management" };

export default async function StudentExamsPage() {
  const session = await requireStudent();
  const ctx = await getStudentContext(session.id);

  if (!ctx) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader title="Examinations" />
          <EmptyState
            icon={FileText}
            title="No active enrollment"
            description="You are not enrolled in a section for the current academic year."
          />
        </div>
      </div>
    );
  }

  const exams = await getStudentExams(ctx.sectionId, ctx.studyYearId);
  const now = new Date();

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Examinations"
          subtitle={`Exam schedule for ${ctx.yearLabel}-${ctx.sectionName}`}
        />

        {exams.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No exams scheduled"
            description="Exam notifications and schedules will appear here when published."
          />
        ) : (
          <div className="space-y-3">
            {exams.map((e) => {
              const upcoming = new Date(e.examDate) >= now;
              return (
                <div
                  key={e.id}
                  className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-semibold text-kvsr-ink">{e.title}</h3>
                    <span
                      className={`px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${
                        upcoming
                          ? "bg-kvsr-gold/15 text-kvsr-cta border-kvsr-gold/30"
                          : "bg-kvsr-navy/[0.06] text-kvsr-navy border-transparent"
                      }`}
                    >
                      {upcoming ? "Upcoming" : "Completed"}
                    </span>
                  </div>
                  <p className="text-xs text-kvsr-cta font-medium">
                    {e.subject}
                    {e.isYearWide ? " · Year-wide exam" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(e.examDate).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {e.startTime ? ` · ${e.startTime.slice(0, 5)}` : ""}
                  </p>
                  {e.instructions && (
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2 pt-2 border-t border-kvsr-soft">
                      {e.instructions}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
