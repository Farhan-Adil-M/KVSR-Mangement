import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { FacultyStudentHub } from "@/components/faculty-student-hub";
import {
  getDepartmentSections,
  getDepartmentStudents,
  getFacultySectionEvaluations,
  getFacultyStudents,
} from "@/lib/db/portal-queries";
import { getFacultyAssignments, requireFaculty } from "@/lib/auth/guards";
import { getSectionBiometrics } from "@/lib/actions/biometrics";
import { Search, Users, X } from "lucide-react";
import { db } from "@/lib/db";
import { faculty as facultyTable, students as studentsTable } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export const metadata = { title: "My Students | KVSR Management" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { section?: string; q?: string };
}

export default async function FacultyStudentsPage({ searchParams }: PageProps) {
  const session = await requireFaculty();
  const isHod = session.role === "hod";

  // Sections this user can filter by: HOD sees every section in their
  // department, faculty see only the sections they are assigned to.
  let sectionsList: { id: string; label: string }[] = [];
  let students: {
    id: string;
    rollNumber: string;
    fullName: string;
    sectionId: string;
    section: string;
    year: string;
  }[] = [];

  if (isHod) {
    const [facultyRow] = await db
      .select({ departmentId: facultyTable.departmentId })
      .from(facultyTable)
      .where(eq(facultyTable.id, session.id))
      .limit(1);
    const departmentId = facultyRow?.departmentId ?? null;
    if (departmentId) {
      [sectionsList, students] = await Promise.all([
        getDepartmentSections(departmentId),
        getDepartmentStudents(departmentId),
      ]);
    }
  } else {
    const [assignments, myStudents] = await Promise.all([
      getFacultyAssignments(session.id),
      getFacultyStudents(session.id),
    ]);
    sectionsList = Array.from(
      new Map(
        assignments.map((a) => [
          a.sectionId,
          { id: a.sectionId, label: `${a.yearLabel}-${a.sectionName}` },
        ])
      ).values()
    );
    students = myStudents;
  }

  const selectedSection =
    searchParams.section && sectionsList.some((s) => s.id === searchParams.section)
      ? searchParams.section
      : null;

  const rawQ = searchParams.q ?? "";
  const q = rawQ.trim().toLowerCase();
  let visible = selectedSection
    ? students.filter((s) => s.sectionId === selectedSection)
    : students;
  if (q) {
    visible = visible.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
    );
  }

  // Contact info for visible students only.
  const contact =
    visible.length > 0
      ? await db
          .select({
            id: studentsTable.id,
            email: studentsTable.email,
            phone: studentsTable.phone,
          })
          .from(studentsTable)
          .where(inArray(studentsTable.id, visible.map((s) => s.id)))
      : [];
  const contactMap = new Map(contact.map((c) => [c.id, c]));

  const hubStudents = visible.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    rollNumber: s.rollNumber,
    year: s.year,
    section: s.section,
    sectionId: s.sectionId,
    email: contactMap.get(s.id)?.email ?? null,
    phone: contactMap.get(s.id)?.phone ?? null,
  }));

  // For the SELECTED section only: biometric enrollment status + evaluations.
  let biometricEnrolledIds: string[] = [];
  let evaluations: Record<
    string,
    {
      academicPerformance: number;
      behaviour: number;
      participation: number;
      comments: string | null;
    }
  > = {};
  if (selectedSection) {
    const [bioResult, evaluationRows] = await Promise.all([
      getSectionBiometrics(selectedSection),
      getFacultySectionEvaluations(session.id, selectedSection),
    ]);
    if (bioResult.ok) {
      biometricEnrolledIds = bioResult.biometrics.map((b) => b.studentId);
    }
    evaluations = Object.fromEntries(
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
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="My Students"
          subtitle={
            isHod
              ? "You are the HOD — showing every student across your department"
              : "Students in the classes you teach"
          }
        />

        {/* Class filter */}
        <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm mb-6 space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Class
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={rawQ ? `/faculty/students?q=${encodeURIComponent(rawQ)}` : "/faculty/students"}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  !selectedSection
                    ? "bg-kvsr-navy text-white shadow-md"
                    : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
                }`}
              >
                {isHod ? "All sections" : "All my classes"}
              </a>
              {sectionsList.map((s) => {
                const sp = new URLSearchParams();
                if (rawQ) sp.set("q", rawQ);
                sp.set("section", s.id);
                return (
                  <a
                    key={s.id}
                    href={`/faculty/students?${sp.toString()}`}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      selectedSection === s.id
                        ? "bg-kvsr-navy text-white shadow-md"
                        : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
                    }`}
                  >
                    {s.label}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Search */}
          <form action="/faculty/students" method="GET" className="flex flex-col sm:flex-row gap-2">
            {selectedSection && <input type="hidden" name="section" value={selectedSection} />}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted" />
              <input
                type="text"
                name="q"
                defaultValue={rawQ}
                placeholder="Search by name or roll number…"
                aria-label="Search students"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-kvsr-navy text-white text-sm font-medium rounded-xl hover:bg-kvsr-navy/90 transition-colors"
            >
              Search
            </button>
            {(rawQ || selectedSection) && (
              <a
                href="/faculty/students"
                className="px-4 py-2.5 border border-kvsr-soft rounded-xl text-sm font-medium text-muted-foreground hover:bg-kvsr-navy/[0.03] transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </a>
            )}
          </form>
        </div>

        {selectedSection && visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={q ? `No students match “${rawQ}”` : "No students found"}
            description={
              q
                ? "Try a different name or roll number, or clear the search."
                : "No active students are enrolled in this section."
            }
          />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students found"
            description={
              isHod
                ? "No students are enrolled in your department yet."
                : "You have no assigned classes yet, or no students are enrolled."
            }
          />
        ) : (
          <FacultyStudentHub
            students={hubStudents}
            sectionId={selectedSection}
            biometricEnrolledIds={biometricEnrolledIds}
            evaluations={evaluations}
          />
        )}
      </div>
    </div>
  );
}
