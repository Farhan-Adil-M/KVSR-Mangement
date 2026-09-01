"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  notifications,
  facultyAssignments,
  departments,
  faculty,
} from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { requireAdmin, requireHod, getCurrentAcademicYearId } from "@/lib/auth/guards";

/* ---------------- Notifications (admin-only creation) ---------------- */

const createNotificationSchema = z
  .object({
    targetRole: z.enum(["admin", "faculty", "student"]).optional().nullable(),
    targetFacultyId: z.string().uuid().optional().nullable(),
    targetStudentId: z.string().uuid().optional().nullable(),
    departmentId: z.string().uuid().optional().nullable(),
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
  const { targetRole, targetFacultyId, targetStudentId, departmentId, title, body } =
    parsed.data;

  try {
    await db.insert(notifications).values({
      targetRole: targetRole ?? null,
      targetFacultyId: targetFacultyId ?? null,
      targetStudentId: targetStudentId ?? null,
      departmentId: departmentId ?? null,
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

/* ---------------- Departments & HOD management ---------------- */

const departmentSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
});

export async function createDepartment(input: unknown) {
  await requireAdmin();
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: "Invalid department payload." };
  try {
    await db.insert(departments).values(parsed.data);
    revalidatePath("/admin/departments");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to create department:", error);
    return { success: false as const, error: "Failed to create department (code may already exist)." };
  }
}

export async function updateDepartment(input: unknown) {
  await requireAdmin();
  const schema = z.object({
    id: z.string().uuid(),
    code: z.string().min(1).max(20),
    name: z.string().min(1).max(120),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: "Invalid department payload." };
  try {
    await db
      .update(departments)
      .set({ code: parsed.data.code, name: parsed.data.name })
      .where(eq(departments.id, parsed.data.id));
    revalidatePath("/admin/departments");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to update department:", error);
    return { success: false as const, error: "Failed to update department." };
  }
}

export async function deleteDepartment(departmentId: string) {
  await requireAdmin();
  if (!z.string().uuid().safeParse(departmentId).success)
    return { success: false as const, error: "Invalid department id." };
  try {
    await db.delete(departments).where(eq(departments.id, departmentId));
    revalidatePath("/admin/departments");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to delete department:", error);
    return {
      success: false as const,
      error: "Failed to delete department (it may still have programs/faculty).",
    };
  }
}

/** Set a faculty member as the HOD of a department (clears any previous HOD in that dept). */
export async function setHod(input: unknown) {
  await requireAdmin();
  const schema = z.object({
    departmentId: z.string().uuid(),
    facultyId: z.string().uuid(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: "Invalid HOD assignment payload." };
  try {
    await db
      .update(faculty)
      .set({ isHod: false })
      .where(eq(faculty.departmentId, parsed.data.departmentId));
    await db
      .update(faculty)
      .set({ isHod: true, departmentId: parsed.data.departmentId })
      .where(eq(faculty.id, parsed.data.facultyId));
    revalidatePath("/admin/departments");
    revalidatePath("/admin/faculty");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to set HOD:", error);
    return { success: false as const, error: "Failed to set HOD." };
  }
}

export interface DepartmentWithHod {
  id: string;
  code: string;
  name: string;
  hodId: string | null;
  hodName: string | null;
  facultyCount: number;
}

export interface FacultyListRow {
  id: string;
  fullName: string;
  departmentId: string | null;
  isHod: boolean | null;
}

export async function getFacultyList(): Promise<FacultyListRow[]> {
  await requireAdmin();
  const rows = await db
    .select({
      id: faculty.id,
      fullName: faculty.fullName,
      departmentId: faculty.departmentId,
      isHod: faculty.isHod,
    })
    .from(faculty)
    .where(eq(faculty.isActive, true))
    .orderBy(faculty.fullName);
  return rows;
}

export async function getDepartmentsWithHod(): Promise<DepartmentWithHod[]> {
  const rows = await db
    .select({
      id: departments.id,
      code: departments.code,
      name: departments.name,
      hodId: faculty.id,
      hodName: faculty.fullName,
      facultyCount: sql<number>`count(*) over (partition by ${departments.id})`,
    })
    .from(departments)
    .leftJoin(faculty, and(eq(faculty.departmentId, departments.id), eq(faculty.isHod, true)))
    .groupBy(departments.id, departments.code, departments.name, faculty.id, faculty.fullName)
    .orderBy(departments.name);
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    hodId: r.hodId ?? null,
    hodName: r.hodName ?? null,
    facultyCount: Number(r.facultyCount) || 0,
  }));
}

/* ---------------- Department-scoped notifications (HOD) ---------------- */

const deptNotificationSchema = z.object({
  departmentId: z.string().uuid(),
  audience: z.enum(["students", "faculty"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
});

/**
 * HOD sends a notification to everyone in their department (students or faculty).
 * Scoped by department_id so only that department's members receive it.
 */
export async function createDepartmentNotification(input: unknown) {
  const session = await requireHod();
  const parsed = deptNotificationSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: "Invalid notification payload." };
  const { departmentId, audience, title, body } = parsed.data;

  // HOD may only notify their own department.
  const [me] = await db
    .select({ departmentId: faculty.departmentId })
    .from(faculty)
    .where(eq(faculty.id, session.id))
    .limit(1);
  if (!me || me.departmentId !== departmentId) {
    return { success: false as const, error: "You can only notify your own department." };
  }

  try {
    await db.insert(notifications).values({
      departmentId,
      targetRole: audience === "students" ? "student" : "faculty",
      title,
      body,
    });
    revalidatePath("/faculty/notifications");
    revalidatePath("/student/notifications");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to create department notification:", error);
    return { success: false as const, error: "Failed to create notification." };
  }
}

/** Returns the department a given HOD manages (used to scope their notifications). */
export async function getHodDepartment() {
  const session = await requireHod();
  const [row] = await db
    .select({
      departmentId: faculty.departmentId,
      departmentName: departments.name,
      departmentCode: departments.code,
    })
    .from(faculty)
    .leftJoin(departments, eq(faculty.departmentId, departments.id))
    .where(eq(faculty.id, session.id))
    .limit(1);
  return {
    departmentId: row?.departmentId ?? null,
    departmentName: row?.departmentName ?? null,
    departmentCode: row?.departmentCode ?? null,
  };
}
