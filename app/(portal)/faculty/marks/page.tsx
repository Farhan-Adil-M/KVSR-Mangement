import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { MarksEntryForm } from "@/components/marks-entry-form";
import { getFacultyAssignments, requireFaculty, getCurrentAcademicYearId } from "@/lib/auth/guards";
import { getStudentsBySection } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { marks } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { Award } from "lucide-react";

export const metadata = { title: "Marks Entry | KVSR Management" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { class?: string };
}

export default async function FacultyMarksPage({ searchParams }: PageProps) {
  const session = await requireFaculty();
  const assignments = await getFacultyAssignments(session.id);

  const classOptions = assignments.map((a) => ({
    subjectId: a.subjectId,
    sectionId: a.sectionId,
    label: `${a.subjectName} — ${a.yearLabel}-${a.sectionName}`,
  }));

  const selectedKey = searchParams.class;
  const selected =
    selectedKey && classOptions.some((c) => `${c.subjectId}:${c.sectionId}` === selectedKey)
      ? classOptions.find((c) => `${c.subjectId}:${c.sectionId}` === selectedKey)!
      : null;

  let students: { id: string; rollNumber: string; fullName: string }[] = [];
  const existingMarks: Record<string, Record<string, { obtained: string; max: string; examType: string }>> = {};

  if (selected) {
    students = await getStudentsBySection(selected.sectionId);
    const yearId = await getCurrentAcademicYearId();
    if (students.length > 0 && yearId) {
      const rows = await db
        .select({
          studentId: marks.studentId,
          title: marks.title,
          marksObtained: marks.marksObtained,
          maxMarks: marks.maxMarks,
          examType: marks.examType,
        })
        .from(marks)
        .where(
          and(
            eq(marks.subjectId, selected.subjectId),
            eq(marks.academicYearId, yearId),
            inArray(
              marks.studentId,
              students.map((s) => s.id)
            )
          )
        );
      for (const r of rows) {
        existingMarks[r.title] = existingMarks[r.title] ?? {};
        existingMarks[r.title][r.studentId] = {
          obtained: r.marksObtained,
          max: r.maxMarks,
          examType: r.examType,
        };
      }
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Marks Entry"
          subtitle="Record test marks for your assigned classes"
        />

        <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Class
          </p>
          {classOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no assigned classes yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {classOptions.map((c) => {
                const key = `${c.subjectId}:${c.sectionId}`;
                return (
                  <a
                    key={key}
                    href={`/faculty/marks?class=${key}`}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      selectedKey === key
                        ? "bg-kvsr-navy text-white shadow-md"
                        : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
                    }`}
                  >
                    {c.label}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {!selected ? (
          <EmptyState icon={Award} title="Select a class" description="Choose a class to enter marks." />
        ) : students.length === 0 ? (
          <EmptyState icon={Award} title="No students in this class" />
        ) : (
          <MarksEntryForm
            subjectId={selected.subjectId}
            sectionId={selected.sectionId}
            students={students}
            existingMarks={existingMarks}
          />
        )}
      </div>
    </div>
  );
}
