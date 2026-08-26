import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { EvaluationForm } from "@/components/evaluation-form";
import { getFacultyAssignments, requireFaculty } from "@/lib/auth/guards";
import { getFacultyEvaluationForStudent } from "@/lib/db/portal-queries";
import { getStudentsBySection } from "@/lib/db/queries";
import { Star, Users } from "lucide-react";

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

  const evaluations = selectedSectionId
    ? await Promise.all(
        students.map(async (s) => ({
          studentId: s.id,
          evaluation: await getFacultyEvaluationForStudent(session.id, s.id, selectedSectionId),
        }))
      )
    : [];
  const evalMap = new Map(evaluations.map((e) => [e.studentId, e.evaluation]));

  const selectedLabel =
    mySections.find((s) => s.id === selectedSectionId)?.label ?? "";

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Student Evaluation"
          subtitle="Rate students you teach: Academic Performance, Behaviour, Class Participation (1–5)"
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
          <EmptyState icon={Users} title="No students in this class" />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {students.length} students · {selectedLabel}
            </p>
            {students.map((student) => (
              <div
                key={student.id}
                className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-kvsr-ink">{student.fullName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Roll #{student.rollNumber}
                    </p>
                  </div>
                </div>
                <EvaluationForm
                  studentId={student.id}
                  studentName={student.fullName}
                  sectionId={selectedSectionId}
                  existing={evalMap.get(student.id) ?? null}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
