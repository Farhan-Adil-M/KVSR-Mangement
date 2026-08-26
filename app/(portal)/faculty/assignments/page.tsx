import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { AssignmentComposer } from "@/components/assignment-composer";
import { getFacultyAssignments, requireFaculty } from "@/lib/auth/guards";
import { getFacultyAssignmentsFeed } from "@/lib/db/portal-queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, CalendarClock } from "lucide-react";

export const metadata = { title: "Assignments | KVSR Management" };
export const dynamic = "force-dynamic";

export default async function FacultyAssignmentsPage() {
  const session = await requireFaculty();

  const [assignments, feed] = await Promise.all([
    getFacultyAssignments(session.id),
    getFacultyAssignmentsFeed(session.id),
  ]);

  const classOptions = assignments.map((a) => ({
    subjectId: a.subjectId,
    sectionId: a.sectionId,
    label: `${a.subjectName} — ${a.yearLabel}-${a.sectionName}`,
  }));

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Assignments"
          subtitle="Create assignments for your classes and track what's been given"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
              <CardHeader className="pb-4 pt-6 px-6">
                <CardTitle className="text-lg text-kvsr-navy">New Assignment</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {classOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You need a class assignment before creating work.
                  </p>
                ) : (
                  <AssignmentComposer classes={classOptions} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {feed.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No assignments yet"
                description="Assignments you create for your classes appear here and in your students' portals."
              />
            ) : (
              feed.map((a) => {
                const overdue = a.dueDate ? new Date(a.dueDate) < new Date() : false;
                return (
                  <div
                    key={a.id}
                    className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="font-semibold text-kvsr-ink">{a.title}</h3>
                      {a.dueDate && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            overdue
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          <CalendarClock className="w-3 h-3" />
                          {overdue ? "Overdue " : "Due "}
                          {new Date(a.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-kvsr-cta font-medium">
                      {a.subject} · {a.year}-{a.section}
                    </p>
                    {a.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                        {a.description}
                      </p>
                    )}
                    <p className="text-xs text-kvsr-muted mt-2">
                      {a.createdBy ? `Created by ${a.createdBy}` : "Created by admin"}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
