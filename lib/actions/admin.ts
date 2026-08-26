"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { notifications, facultyAssignments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin, getCurrentAcademicYearId } from "@/lib/auth/guards";

/* ---------------- Notifications (admin-only creation) ---------------- */

const createNotificationSchema = z
  .object({
    targetRole: z.enum(["admin", "faculty", "student"]).optional().nullable(),
    targetFacultyId: z.string().uuid().optional().nullable(),
    targetStudentId: z.string().uuid().optional().nullable(),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(2000),
  })
  .refine(
    (data) =>
      [data.targetRole, data.targetFacultyId, data.targetStudentId].filter(
        (v) => v != null
      ).length === 1,
    { message: "Exactly one target (role, faculty, or student) must be set." }
  );

export async function createNotification(input: unknown) {
  await requireAdmin();

  const parsed = createNotificationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid notification payload." };
  }
  const { targetRole, targetFacultyId, targetStudentId, title, body } = parsed.data;

  try {
    await db.insert(notifications).values({
      targetRole: targetRole ?? null,
      targetFacultyId: targetFacultyId ?? null,
      targetStudentId: targetStudentId ?? null,
      title,
      body,
    });
    revalidatePath("/admin/notifications");
    revalidatePath("/faculty/notifications");
    revalidatePath("/student/notifications");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to create notification:", error);
    return { success: false as const, error: "Failed to create notification." };
  }
}

/* ---------------- Faculty assignment management (admin-only) ---------------- */

const assignFacultySchema = z.object({
  facultyId: z.string().uuid(),
  subjectId: z.string().uuid(),
  sectionId: z.string().uuid(),
});

export async function assignFacultyToClass(input: unknown) {
  await requireAdmin();

  const parsed = assignFacultySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid assignment payload." };
  }
  const { facultyId, subjectId, sectionId } = parsed.data;

  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return { success: false as const, error: "No active academic year." };

  try {
    await db
      .insert(facultyAssignments)
      .values({ facultyId, subjectId, sectionId, academicYearId: yearId })
      .onConflictDoNothing();
    revalidatePath(`/admin/faculty/${facultyId}`);
    revalidatePath("/faculty/classes");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to assign faculty:", error);
    return { success: false as const, error: "Failed to assign faculty." };
  }
}

export async function removeFacultyAssignment(assignmentId: string) {
  await requireAdmin();

  if (!z.string().uuid().safeParse(assignmentId).success) {
    return { success: false as const, error: "Invalid assignment id." };
  }

  try {
    await db
      .delete(facultyAssignments)
      .where(eq(facultyAssignments.id, assignmentId));
    revalidatePath("/admin/faculty");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to remove assignment:", error);
    return { success: false as const, error: "Failed to remove assignment." };
  }
}
