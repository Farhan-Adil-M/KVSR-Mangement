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
import { and, eq, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getCurrentAcademicYearId } from "@/lib/auth/guards";
import { isUniqueViolation } from "@/lib/db/pg-errors";

const setContactSchema = z.object({
  phone: z.string().regex(/^[0-9+\-\s]{6,15}$/),
  email: z.string().email().max(200),
});

export type SetMyContactResult =
  | { success: true }
  | { success: false; error: string };

/** One-time student contact confirmation — ownership is the session, never the payload. */
export async function setMyContact(input: unknown): Promise<SetMyContactResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (session.role !== "student") return { success: false, error: "Not authorized." };

  const parsed = setContactSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid contact payload." };
  const { phone, email } = parsed.data;

  try {
    // Lock + write in ONE atomic update: the WHERE guard makes a pre-locked
    // row (or a lock landing mid-race) affect zero rows.
    const updated = await db
      .update(students)
      .set({ phone, email, contactLockedAt: new Date() })
      .where(
        and(eq(students.id, session.id), isNull(students.contactLockedAt))
      )
      .returning({ id: students.id });
    if (updated.length === 0) {
      return {
        success: false,
        error: "Contact info is locked. Contact your HOD to change it.",
      };
    }
    revalidatePath("/student/profile");
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error, "students_email_unique")) {
      return { success: false, error: "Email is already in use by another student." };
    }
    console.error("Failed to set contact info:", error);
    return { success: false, error: "Failed to save contact info." };
  }
}

const hodUpdateContactSchema = z.object({
  studentId: z.string().uuid(),
  phone: z.string().regex(/^[0-9+\-\s]{6,15}$/).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
});

export type HodUpdateContactResult =
  | { success: true }
  | { success: false; error: string };

/**
 * HOD/Admin contact override. Admin → any student; hod → the student's
 * department (derived from their current active enrollment) must match the
 * HOD's own. Never touches contactLockedAt.
 */
export async function hodUpdateStudentContact(
  input: unknown
): Promise<HodUpdateContactResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (session.role !== "admin" && session.role !== "hod") {
    return { success: false, error: "Not authorized." };
  }

  const parsed = hodUpdateContactSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid contact payload." };
  const { studentId, phone, email } = parsed.data;

  const update: { phone?: string | null; email?: string | null } = {};
  if (phone !== undefined) update.phone = phone;
  if (email !== undefined) update.email = email;
  if (Object.keys(update).length === 0) {
    return { success: false, error: "Nothing to update." };
  }

  if (session.role === "hod") {
    const [me] = await db
      .select({ departmentId: faculty.departmentId })
      .from(faculty)
      .where(eq(faculty.id, session.id))
      .limit(1);
    const hodDept = me?.departmentId ?? null;
    if (!hodDept) {
      return { success: false, error: "You are not assigned to a department." };
    }
    const yearId = await getCurrentAcademicYearId();
    if (!yearId) return { success: false, error: "No active academic year." };
    const [enrolled] = await db
      .select({ departmentId: programs.departmentId })
      .from(studentEnrollments)
      .innerJoin(sections, eq(studentEnrollments.sectionId, sections.id))
      .innerJoin(studyYears, eq(sections.studyYearId, studyYears.id))
      .innerJoin(programs, eq(studyYears.programId, programs.id))
      .where(
        and(
          eq(studentEnrollments.studentId, studentId),
          eq(studentEnrollments.academicYearId, yearId),
          eq(studentEnrollments.isActive, true)
        )
      )
      .limit(1);
    if (!enrolled || enrolled.departmentId !== hodDept) {
      return { success: false, error: "This student is outside your department." };
    }
  }

  try {
    await db.update(students).set(update).where(eq(students.id, studentId));
    revalidatePath("/student/profile");
    revalidatePath("/faculty/enrollment");
    revalidatePath("/admin/enrollment");
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error, "students_email_unique")) {
      return { success: false, error: "Email is already in use by another student." };
    }
    console.error("Failed to update student contact:", error);
    return { success: false, error: "Failed to update contact info." };
  }
}
