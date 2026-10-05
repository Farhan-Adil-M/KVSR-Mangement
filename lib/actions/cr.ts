"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { sectionCrs, studentEnrollments, students } from "@/lib/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import {
  isSectionInHodDepartment,
  getCurrentAcademicYearId,
} from "@/lib/auth/guards";

export type CrActionResult = { success: true } | { success: false; error: string };

const MAX_CRS_PER_SECTION = 3;

const crInputSchema = z.object({
  sectionId: z.string().uuid(),
  studentId: z.string().uuid(),
});

/** Admin unrestricted; HOD must own the section's department. */
async function canManageSection(
  session: { role: "admin" | "hod" | "faculty" | "student"; id: string },
  sectionId: string
): Promise<boolean> {
  if (session.role === "admin") return true;
  if (session.role === "hod") return isSectionInHodDepartment(session.id, sectionId);
  return false;
}

export async function setSectionCR(input: unknown): Promise<CrActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (session.role !== "admin" && session.role !== "hod") {
    return { success: false, error: "Not authorized." };
  }

  const parsed = crInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid CR payload." };
  const { sectionId, studentId } = parsed.data;

  if (!(await canManageSection(session, sectionId))) {
    return { success: false, error: "This section is outside your department." };
  }

  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return { success: false, error: "No active academic year." };

  // Verify the student is actively enrolled in this section for the current year.
  const [enrolled] = await db
    .select({ id: studentEnrollments.id })
    .from(studentEnrollments)
    .where(
      and(
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollments.sectionId, sectionId),
        eq(studentEnrollments.academicYearId, yearId),
        eq(studentEnrollments.isActive, true)
      )
    )
    .limit(1);
  if (!enrolled) {
    return {
      success: false,
      error: "This student is not actively enrolled in this section.",
    };
  }

  // Max 3 CRs per section (re-setting an existing CR is always allowed).
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sectionCrs)
    .where(eq(sectionCrs.sectionId, sectionId));
  const existingCount = Number(countRow?.count ?? 0);
  const [alreadyCr] = await db
    .select({ id: sectionCrs.id })
    .from(sectionCrs)
    .where(
      and(eq(sectionCrs.sectionId, sectionId), eq(sectionCrs.studentId, studentId))
    )
    .limit(1);
  if (!alreadyCr && existingCount >= MAX_CRS_PER_SECTION) {
    return { success: false, error: "This section already has 3 CRs (maximum)." };
  }

  try {
    await db
      .insert(sectionCrs)
      .values({ sectionId, studentId })
      .onConflictDoUpdate({
        target: [sectionCrs.sectionId, sectionCrs.studentId],
        set: { studentId: sql`excluded.student_id` },
      });
    revalidatePath("/faculty/students");
    revalidatePath("/admin/students");
    return { success: true };
  } catch (error) {
    console.error("Failed to set section CR:", error);
    return { success: false, error: "Failed to set section CR." };
  }
}

export async function removeSectionCR(input: unknown): Promise<CrActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (session.role !== "admin" && session.role !== "hod") {
    return { success: false, error: "Not authorized." };
  }

  const parsed = crInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid CR payload." };
  const { sectionId, studentId } = parsed.data;

  if (!(await canManageSection(session, sectionId))) {
    return { success: false, error: "This section is outside your department." };
  }

  try {
    await db
      .delete(sectionCrs)
      .where(
        and(eq(sectionCrs.sectionId, sectionId), eq(sectionCrs.studentId, studentId))
      );
    revalidatePath("/faculty/students");
    revalidatePath("/admin/students");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove section CR:", error);
    return { success: false, error: "Failed to remove section CR." };
  }
}

export interface SectionCrRow {
  studentId: string;
  rollNumber: string;
  fullName: string;
}

/**
 * Open read (staff pages): only roll numbers and names — no sensitive data.
 * Students calling it learn nothing beyond who the CRs of a section are.
 */
export async function getSectionCRs(sectionId: string): Promise<SectionCrRow[]> {
  if (!z.string().uuid().safeParse(sectionId).success) return [];
  return db
    .select({
      studentId: sectionCrs.studentId,
      rollNumber: students.rollNumber,
      fullName: students.fullName,
    })
    .from(sectionCrs)
    .innerJoin(students, eq(sectionCrs.studentId, students.id))
    .where(eq(sectionCrs.sectionId, sectionId))
    .orderBy(asc(students.rollNumber));
}
