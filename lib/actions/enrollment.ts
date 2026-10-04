"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  faculty,
  programs,
  sections,
  studentEnrollments,
  students,
  studyYears,
} from "@/lib/db/schema";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { getSession, type SessionUser } from "@/lib/auth/session";
import {
  getCurrentAcademicYearId,
  isSectionInHodDepartment,
} from "@/lib/auth/guards";
import { isUniqueViolation } from "@/lib/db/pg-errors";

export type EnrollStudentsResult =
  | { success: true }
  | { success: false; error: string };

export type MoveStudentResult =
  | { success: true }
  | { success: false; error: string };

export type UnenrollStudentsResult =
  | { success: true }
  | { success: false; error: string };

export type CreateStudentResult =
  | { success: true }
  | { success: false; error: string };

type HodActor =
  | { ok: true; session: SessionUser; departmentId: string | null }
  | { ok: false; error: string };

/**
 * Non-redirect HOD-tier guard (hod or admin; faculty/student rejected).
 * admin → departmentId = null (unrestricted); hod → own faculty.departmentId.
 */
async function requireHodActor(): Promise<HodActor> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (session.role === "admin") return { ok: true, session, departmentId: null };
  if (session.role === "hod") {
    const [me] = await db
      .select({ departmentId: faculty.departmentId })
      .from(faculty)
      .where(eq(faculty.id, session.id))
      .limit(1);
    if (!me?.departmentId) {
      return { ok: false, error: "You are not assigned to a department." };
    }
    return { ok: true, session, departmentId: me.departmentId };
  }
  return { ok: false, error: "Not authorized." };
}

function revalidateEnrollmentPaths() {
  revalidatePath("/faculty/enrollment");
  revalidatePath("/admin/enrollment");
  revalidatePath("/admin/students");
}

/* ---------------- Enroll ---------------- */

const enrollSchema = z.object({
  sectionId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1).max(200),
});

export async function enrollStudents(
  input: unknown
): Promise<EnrollStudentsResult> {
  const actor = await requireHodActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = enrollSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid enrollment payload." };
  const { sectionId, studentIds } = parsed.data;

  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return { success: false, error: "No active academic year." };

  const [section] = await db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.id, sectionId))
    .limit(1);
  if (!section) return { success: false, error: "Section not found." };

  if (
    actor.departmentId &&
    !(await isSectionInHodDepartment(actor.session.id, sectionId))
  ) {
    return { success: false, error: "This section is outside your department." };
  }

  const uniqueIds = Array.from(new Set(studentIds));
  const [studentRows, conflictRows] = await Promise.all([
    db
      .select({
        id: students.id,
        rollNumber: students.rollNumber,
        isActive: students.isActive,
        createdByFacultyId: students.createdByFacultyId,
      })
      .from(students)
      .where(inArray(students.id, uniqueIds)),
    // Active enrollments this year in a DIFFERENT section → single-active-enrollment conflict.
    db
      .select({
        studentId: studentEnrollments.studentId,
        sectionName: sections.name,
        rollNumber: students.rollNumber,
      })
      .from(studentEnrollments)
      .innerJoin(sections, eq(studentEnrollments.sectionId, sections.id))
      .innerJoin(students, eq(studentEnrollments.studentId, students.id))
      .where(
        and(
          inArray(studentEnrollments.studentId, uniqueIds),
          eq(studentEnrollments.academicYearId, yearId),
          eq(studentEnrollments.isActive, true),
          ne(studentEnrollments.sectionId, sectionId)
        )
      ),
  ]);

  if (studentRows.length !== uniqueIds.length) {
    return { success: false, error: "One or more selected students were not found." };
  }
  const inactive = studentRows.find((s) => !s.isActive);
  if (inactive) {
    return { success: false, error: `${inactive.rollNumber} is not an active student.` };
  }

  if (actor.departmentId) {
    // HOD reach: any enrollment row (active or not) in an own-department section,
    // or the student record was created by this HOD.
    const scopedRows = await db
      .selectDistinct({ studentId: studentEnrollments.studentId })
      .from(studentEnrollments)
      .innerJoin(sections, eq(studentEnrollments.sectionId, sections.id))
      .innerJoin(studyYears, eq(sections.studyYearId, studyYears.id))
      .innerJoin(programs, eq(studyYears.programId, programs.id))
      .where(
        and(
          inArray(studentEnrollments.studentId, uniqueIds),
          eq(programs.departmentId, actor.departmentId)
        )
      );
    const scopedSet = new Set(scopedRows.map((r) => r.studentId));
    const outsider = studentRows.find(
      (s) => !scopedSet.has(s.id) && s.createdByFacultyId !== actor.session.id
    );
    if (outsider) {
      return { success: false, error: `${outsider.rollNumber} is outside your department.` };
    }
  }

  if (conflictRows.length > 0) {
    const c = conflictRows[0];
    return conflictRows.length === 1
      ? {
          success: false,
          error: `${c.rollNumber} is already enrolled in ${c.sectionName}. Move them instead.`,
        }
      : {
          success: false,
          error: `${conflictRows.length} students are already enrolled in other sections (e.g. ${c.rollNumber} in ${c.sectionName}). Move them instead.`,
        };
  }

  try {
    // Upsert (not doNothing): re-enrolling a previously unenrolled student must
    // reactivate the historical row. unique_enrollment index keeps this safe
    // without a transaction.
    await db
      .insert(studentEnrollments)
      .values(
        studentRows.map((s) => ({
          studentId: s.id,
          sectionId,
          academicYearId: yearId,
          rollNumberSnapshot: s.rollNumber,
          isActive: true,
        }))
      )
      .onConflictDoUpdate({
        target: [
          studentEnrollments.studentId,
          studentEnrollments.sectionId,
          studentEnrollments.academicYearId,
        ],
        set: {
          isActive: true,
          rollNumberSnapshot: sql`excluded.roll_number_snapshot`,
        },
      });
    revalidateEnrollmentPaths();
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error, "unique_active_enrollment")) {
      return {
        success: false,
        error: "Student is already actively enrolled in another section for this year.",
      };
    }
    console.error("Failed to enroll students:", error);
    return { success: false, error: "Failed to enroll students." };
  }
}

/* ---------------- Move ---------------- */

const moveSchema = z.object({
  studentId: z.string().uuid(),
  fromSectionId: z.string().uuid(),
  toSectionId: z.string().uuid(),
});

export async function moveStudent(input: unknown): Promise<MoveStudentResult> {
  const actor = await requireHodActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid move payload." };
  const { studentId, fromSectionId, toSectionId } = parsed.data;

  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return { success: false, error: "No active academic year." };

  if (fromSectionId === toSectionId) {
    return { success: false, error: "Source and target sections are the same." };
  }

  const [fromSection] = await db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.id, fromSectionId))
    .limit(1);
  const [toSection] = await db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.id, toSectionId))
    .limit(1);
  if (!fromSection || !toSection) {
    return { success: false, error: "Section not found." };
  }

  if (actor.departmentId) {
    const [inFrom, inTo] = await Promise.all([
      isSectionInHodDepartment(actor.session.id, fromSectionId),
      isSectionInHodDepartment(actor.session.id, toSectionId),
    ]);
    if (!inFrom || !inTo) {
      return { success: false, error: "This section is outside your department." };
    }
  }

  try {
    const [student] = await db
      .select({ id: students.id, rollNumber: students.rollNumber, isActive: students.isActive })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);
    if (!student || !student.isActive) {
      return { success: false, error: "Student not found or inactive." };
    }

    const [current] = await db
      .select({ id: studentEnrollments.id })
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.studentId, studentId),
          eq(studentEnrollments.sectionId, fromSectionId),
          eq(studentEnrollments.academicYearId, yearId),
          eq(studentEnrollments.isActive, true)
        )
      )
      .limit(1);
    if (!current) {
      return { success: false, error: "Student is not enrolled in the source section." };
    }

    // Enforce a single active enrollment per (student, year): deactivate every
    // active row except the target, then upsert the target to active.
    await db
      .update(studentEnrollments)
      .set({ isActive: false })
      .where(
        and(
          eq(studentEnrollments.studentId, studentId),
          eq(studentEnrollments.academicYearId, yearId),
          eq(studentEnrollments.isActive, true),
          ne(studentEnrollments.sectionId, toSectionId)
        )
      );

    await db
      .insert(studentEnrollments)
      .values({
        studentId,
        sectionId: toSectionId,
        academicYearId: yearId,
        rollNumberSnapshot: student.rollNumber,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [
          studentEnrollments.studentId,
          studentEnrollments.sectionId,
          studentEnrollments.academicYearId,
        ],
        set: { isActive: true, rollNumberSnapshot: student.rollNumber },
      });

    revalidateEnrollmentPaths();
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error, "unique_active_enrollment")) {
      return {
        success: false,
        error: "Student is already actively enrolled in another section for this year.",
      };
    }
    console.error("Failed to move student:", error);
    return { success: false, error: "Failed to move student." };
  }
}

/* ---------------- Unenroll ---------------- */

const unenrollSchema = z.object({
  sectionId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1),
});

export async function unenrollStudents(
  input: unknown
): Promise<UnenrollStudentsResult> {
  const actor = await requireHodActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = unenrollSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid unenroll payload." };
  const { sectionId, studentIds } = parsed.data;

  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return { success: false, error: "No active academic year." };

  const [section] = await db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.id, sectionId))
    .limit(1);
  if (!section) return { success: false, error: "Section not found." };

  if (
    actor.departmentId &&
    !(await isSectionInHodDepartment(actor.session.id, sectionId))
  ) {
    return { success: false, error: "This section is outside your department." };
  }

  try {
    // Deactivate only — never delete; enrollment history feeds analytics.
    await db
      .update(studentEnrollments)
      .set({ isActive: false })
      .where(
        and(
          inArray(studentEnrollments.studentId, Array.from(new Set(studentIds))),
          eq(studentEnrollments.sectionId, sectionId),
          eq(studentEnrollments.academicYearId, yearId),
          eq(studentEnrollments.isActive, true)
        )
      );
    revalidateEnrollmentPaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to unenroll students:", error);
    return { success: false, error: "Failed to unenroll students." };
  }
}

/* ---------------- Create student ---------------- */

const createStudentSchema = z.object({
  fullName: z.string().min(1).max(120),
  rollNumber: z.string().min(1).max(40),
});

export async function createStudent(input: unknown): Promise<CreateStudentResult> {
  const actor = await requireHodActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = createStudentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid student payload." };
  const { fullName, rollNumber } = parsed.data;

  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return { success: false, error: "No active academic year." };

  try {
    await db.insert(students).values({
      fullName: fullName.trim(),
      rollNumber: rollNumber.trim(),
      createdByFacultyId: actor.departmentId ? actor.session.id : null,
    });
    revalidateEnrollmentPaths();
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error, "students_roll_number_unique")) {
      return { success: false, error: "Roll number already exists." };
    }
    console.error("Failed to create student:", error);
    return { success: false, error: "Failed to create student." };
  }
}
