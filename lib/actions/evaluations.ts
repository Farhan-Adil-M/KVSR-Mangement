"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { studentEvaluations, studentEnrollments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import {
  isFacultyAssigned,
  isSectionInHodDepartment,
  getCurrentAcademicYearId,
} from "@/lib/auth/guards";

const rating = z.number().int().min(1).max(5);

const saveEvaluationSchema = z.object({
  studentId: z.string().uuid(),
  sectionId: z.string().uuid(),
  academicPerformance: rating,
  behaviour: rating,
  participation: rating,
  comments: z.string().max(1000).optional().nullable(),
});

export type SaveEvaluationResult =
  | { success: true }
  | { success: false; error: string };

export async function saveEvaluation(input: unknown): Promise<SaveEvaluationResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  // Evaluations are faculty-only (admins view analytics, they do not evaluate).
  // HODs may evaluate students anywhere in their own department.
  if (session.role !== "faculty" && session.role !== "hod") {
    return { success: false, error: "Only faculty can evaluate students." };
  }

  const parsed = saveEvaluationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid evaluation payload." };
  }
  const { studentId, sectionId, academicPerformance, behaviour, participation, comments } =
    parsed.data;

  // Authorization: faculty → assigned to the section; HOD → section in their department.
  if (session.role === "faculty") {
    const assigned = await isFacultyAssigned(session.id, sectionId);
    if (!assigned) {
      return { success: false, error: "You are not assigned to this class." };
    }
  } else {
    const inDept = await isSectionInHodDepartment(session.id, sectionId);
    if (!inDept) {
      return { success: false, error: "This class is outside your department." };
    }
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
    return { success: false, error: "This student is not enrolled in this section." };
  }

  try {
    // Upsert on (faculty, student, section, year) — prevents duplicate evaluations.
    const [existing] = await db
      .select({ id: studentEvaluations.id })
      .from(studentEvaluations)
      .where(
        and(
          eq(studentEvaluations.facultyId, session.id),
          eq(studentEvaluations.studentId, studentId),
          eq(studentEvaluations.sectionId, sectionId),
          eq(studentEvaluations.academicYearId, yearId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(studentEvaluations)
        .set({
          academicPerformance,
          behaviour,
          participation,
          comments: comments ?? null,
          updatedAt: new Date(),
        })
        .where(eq(studentEvaluations.id, existing.id));
    } else {
      await db.insert(studentEvaluations).values({
        facultyId: session.id,
        studentId,
        sectionId,
        academicYearId: yearId,
        academicPerformance,
        behaviour,
        participation,
        comments: comments ?? null,
      });
    }

    revalidatePath("/faculty/students");
    revalidatePath("/admin/students");
    return { success: true };
  } catch (error) {
    console.error("Failed to save evaluation:", error);
    return { success: false, error: "Failed to save evaluation." };
  }
}
