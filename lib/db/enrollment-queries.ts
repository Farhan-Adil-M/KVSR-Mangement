/**
 * HOD/Admin enrollment workspace queries. departmentId = null means the caller
 * is admin (unrestricted); otherwise everything is scoped through the
 * departments → programs → study_years → sections join chain.
 */
import { db, rawSql } from "./index";
import { academicYears, studentEnrollments, students } from "./schema";
import { and, asc, eq } from "drizzle-orm";

export interface WorkspaceStudent {
  id: string;
  rollNumber: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  contactLockedAt: string | null;
  /** Present on enrolled rows only (the active enrollment row id). */
  enrollmentId: string | null;
}

export interface PickerTreeRow {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  programId: string | null;
  programCode: string | null;
  programName: string | null;
  studyYearId: string | null;
  yearLabel: string | null;
  yearNumber: number | null;
  sectionId: string | null;
  sectionName: string | null;
}

export interface EnrollmentWorkspace {
  enrolled: WorkspaceStudent[];
  unenrolled: WorkspaceStudent[];
  tree: PickerTreeRow[];
}

type RawWorkspaceRow = {
  id: string;
  rollNumber: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  contactLockedAt: Date | string | null;
};

type RawTreeRow = {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  programId: string | null;
  programCode: string | null;
  programName: string | null;
  studyYearId: string | null;
  yearLabel: string | null;
  yearNumber: number | null;
  sectionId: string | null;
  sectionName: string | null;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toWorkspaceStudent(row: RawWorkspaceRow, enrollmentId: string | null): WorkspaceStudent {
  return {
    id: row.id,
    rollNumber: row.rollNumber,
    fullName: row.fullName,
    phone: row.phone ?? null,
    email: row.email ?? null,
    contactLockedAt: toIso(row.contactLockedAt),
    enrollmentId,
  };
}

/**
 * The picker tree for enrollment: departments → programs → study years →
 * sections (LEFT JOINs so empty branches still appear for navigation).
 */
export async function getEnrollmentPickerTree(
  departmentId: string | null
): Promise<PickerTreeRow[]> {
  const rows = (
    departmentId
      ? await rawSql`
          SELECT d.id AS "departmentId", d.code AS "departmentCode", d.name AS "departmentName",
                 p.id AS "programId", p.code AS "programCode", p.name AS "programName",
                 sy.id AS "studyYearId", sy.label AS "yearLabel", sy.year_number AS "yearNumber",
                 sec.id AS "sectionId", sec.name AS "sectionName"
          FROM departments d
          LEFT JOIN programs p ON p.department_id = d.id
          LEFT JOIN study_years sy ON sy.program_id = p.id
          LEFT JOIN sections sec ON sec.study_year_id = sy.id
          WHERE d.id = ${departmentId}
          ORDER BY d.code, p.code, sy.year_number, sec.name
        `
      : await rawSql`
          SELECT d.id AS "departmentId", d.code AS "departmentCode", d.name AS "departmentName",
                 p.id AS "programId", p.code AS "programCode", p.name AS "programName",
                 sy.id AS "studyYearId", sy.label AS "yearLabel", sy.year_number AS "yearNumber",
                 sec.id AS "sectionId", sec.name AS "sectionName"
          FROM departments d
          LEFT JOIN programs p ON p.department_id = d.id
          LEFT JOIN study_years sy ON sy.program_id = p.id
          LEFT JOIN sections sec ON sec.study_year_id = sy.id
          ORDER BY d.code, p.code, sy.year_number, sec.name
        `
  ) as unknown as RawTreeRow[];
  return rows.map((r) => ({
    departmentId: r.departmentId,
    departmentCode: r.departmentCode,
    departmentName: r.departmentName,
    programId: r.programId ?? null,
    programCode: r.programCode ?? null,
    programName: r.programName ?? null,
    studyYearId: r.studyYearId ?? null,
    yearLabel: r.yearLabel ?? null,
    yearNumber: r.yearNumber != null ? Number(r.yearNumber) : null,
    sectionId: r.sectionId ?? null,
    sectionName: r.sectionName ?? null,
  }));
}

/**
 * Workspace for one section: active enrollments (current academic year) plus
 * the enrollable pool. Unenrolled = active students NOT actively enrolled in
 * ANY section of the current year; HODs further require department reach —
 * any enrollment row (active or not) in an own-department section, OR the
 * student record was created by this HOD (students.createdByFacultyId).
 */
export async function getEnrollmentWorkspace(
  departmentId: string | null,
  sectionId: string,
  hodFacultyId?: string | null
): Promise<EnrollmentWorkspace> {
  const tree = await getEnrollmentPickerTree(departmentId);

  const [currentYear] = await db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(eq(academicYears.isCurrent, true))
    .limit(1);
  if (!currentYear) return { enrolled: [], unenrolled: [], tree };

  const enrolledRows = await db
    .select({
      enrollmentId: studentEnrollments.id,
      id: students.id,
      rollNumber: students.rollNumber,
      fullName: students.fullName,
      phone: students.phone,
      email: students.email,
      contactLockedAt: students.contactLockedAt,
    })
    .from(studentEnrollments)
    .innerJoin(students, eq(studentEnrollments.studentId, students.id))
    .where(
      and(
        eq(studentEnrollments.sectionId, sectionId),
        eq(studentEnrollments.academicYearId, currentYear.id),
        eq(studentEnrollments.isActive, true)
      )
    )
    .orderBy(asc(students.rollNumber));

  const unenrolledRows = (
    departmentId
      ? await rawSql`
          SELECT st.id, st.roll_number AS "rollNumber", st.full_name AS "fullName",
                 st.phone, st.email, st.contact_locked_at AS "contactLockedAt"
          FROM students st
          WHERE st.is_active = true
            AND NOT EXISTS (
              SELECT 1 FROM student_enrollments a
              WHERE a.student_id = st.id AND a.is_active = true
                AND a.academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
            )
            AND (
              EXISTS (
                SELECT 1 FROM student_enrollments h
                JOIN sections hs ON hs.id = h.section_id
                JOIN study_years hsy ON hsy.id = hs.study_year_id
                JOIN programs hp ON hp.id = hsy.program_id
                WHERE h.student_id = st.id AND hp.department_id = ${departmentId}
              )
              OR st.created_by_faculty_id = ${hodFacultyId ?? null}
            )
          ORDER BY st.roll_number
        `
      : await rawSql`
          SELECT st.id, st.roll_number AS "rollNumber", st.full_name AS "fullName",
                 st.phone, st.email, st.contact_locked_at AS "contactLockedAt"
          FROM students st
          WHERE st.is_active = true
            AND NOT EXISTS (
              SELECT 1 FROM student_enrollments a
              WHERE a.student_id = st.id AND a.is_active = true
                AND a.academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
            )
          ORDER BY st.roll_number
        `
  ) as unknown as RawWorkspaceRow[];

  return {
    enrolled: enrolledRows.map((r) =>
      toWorkspaceStudent(
        {
          id: r.id,
          rollNumber: r.rollNumber,
          fullName: r.fullName,
          phone: r.phone,
          email: r.email,
          contactLockedAt: r.contactLockedAt,
        },
        r.enrollmentId
      )
    ),
    unenrolled: unenrolledRows.map((r) => toWorkspaceStudent(r, null)),
    tree,
  };
}
