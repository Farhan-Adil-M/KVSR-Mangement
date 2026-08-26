import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { getStudentContext, requireStudent } from "@/lib/auth/guards";
import { getStudentAssignments } from "@/lib/db/portal-queries";
import { ClipboardList, CalendarClock } from "lucide-react";

export const metadata = { title: "Assignments | KVSR Management" };

export default async function StudentAssignmentsPage() {
  const session = await requireStudent();
  const ctx = await getStudentContext(session.id);

  if (!ctx) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader title="Assignments" />
          <EmptyState
            icon={ClipboardList}
            title="No active enrollment"
            description="You are not enrolled in a section for the current academic year."
          />
        </div>
      </div>
    );
  }

  const assignments = await getStudentAssignments(ctx.sectionId);
  const now = new Date();

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Assignments"
          subtitle={`${ctx.yearLabel}-${ctx.sectionName} · given work for your subjects`}
        />

        {assignments.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            description="When your faculty assigns work, it appears here with due dates."
          />
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => {
              let status: { label: string; className: string } | null = null;
              if (a.dueDate) {
                const due = new Date(a.dueDate);
                const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
                if (diffDays < 0) {
                  status = { label: "Overdue", className: "bg-red-50 text-red-700 border-red-200" };
                } else if (diffDays <= 3) {
                  status = { label: `Due in ${diffDays}d`, className: "bg-amber-50 text-amber-700 border-amber-200" };
                } else {
                  status = { label: "Upcoming", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
                }
              }
              return (
                <div
                  key={a.id}
                  className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-semibold text-kvsr-ink">{a.title}</h3>
                    {status && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${status.className}`}
                      >
                        <CalendarClock className="w-3 h-3" />
                        {status.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-kvsr-cta font-medium">
                    {a.subject}
                    {a.dueDate ? ` · Due ${new Date(a.dueDate).toLocaleDateString()}` : ""}
                  </p>
                  {a.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                      {a.description}
                    </p>
                  )}
                  {a.createdBy && (
                    <p className="text-xs text-kvsr-muted mt-2">Given by {a.createdBy}</p>
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
