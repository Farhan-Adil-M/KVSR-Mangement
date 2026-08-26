import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { EvaluationsGrid } from "@/components/evaluations-grid";
import { getFacultyAssignments, requireFaculty } from "@/lib/auth/guards";
import { getFacultySectionEvaluations } from "@/lib/db/portal-queries";
import { getStudentsBySection } from "@/lib/db/queries";
import { Star } from "lucide-react";

export const metadata = { title: "Student Evaluation | KVSR Management" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { class?: string };
}

export default async function FacultyEvaluationsPage({ searchParams }: PageProps) {
  const session = await requireFaculty();
  const assignments = await getFacultyAssignments(session.id);

  // Deduplicate sections (a faculty may teach multiple subjects to one section).
  const mySections = Array.from(
    new Map(
      assignments.map((a) => [
        a.sectionId,
        { id: a.sectionId, label: `${a.yearLabel}-${a.sectionName}` },
      ])
    ).values()
  );

  const selectedSectionId =
    searchParams.class && mySections.some((s) => s.id === searchParams.class)
      ? searchParams.class
      : null;

  const students = selectedSectionId
    ? await getStudentsBySection(selectedSectionId)
    : [];

  // One batched query for the whole section — no per-student round-trips.
  const evaluationRows = selectedSectionId
    ? await getFacultySectionEvaluations(session.id, selectedSectionId)
    : [];
  const evaluations = Object.fromEntries(
    evaluationRows.map((e) => [
      e.studentId,
      {
        academicPerformance: e.academicPerformance,
        behaviour: e.behaviour,
        participation: e.participation,
        comments: e.comments,
      },
    ])
  );

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Student Evaluation"
          subtitle="Click a student to rate Academic Performance, Behaviour, and Class Participation (1–5)"
        />

        {/* Class picker */}
        <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Class
          </p>
          {mySections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have no assigned classes yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mySections.map((s) => (
                <a
                  key={s.id}
                  href={`/faculty/evaluations?class=${s.id}`}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedSectionId === s.id
                      ? "bg-kvsr-navy text-white shadow-md"
                      : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
                  }`}
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {!selectedSectionId ? (
          <EmptyState
            icon={Star}
            title="Select a class"
            description="Choose one of your assigned classes to evaluate its students."
          />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No students in this class"
            description="No active students are enrolled in this section."
          />
        ) : (
          <EvaluationsGrid
            students={students}
            evaluations={evaluations}
            sectionId={selectedSectionId}
          />
        )}
      </div>
    </div>
  );
}
