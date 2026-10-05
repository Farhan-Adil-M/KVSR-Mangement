"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  academicYears,
  faculty,
  sections,
  studyYears,
  subjects,
  timetableSlots,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { getCurrentAcademicYearId } from "@/lib/auth/guards";
import { getAppConfig } from "@/lib/app-config";
import { createStudent } from "@/lib/actions/enrollment";
import type { CreateStudentResult } from "@/lib/actions/enrollment";
import { isUniqueViolation } from "@/lib/db/pg-errors";

export type SetupActionResult =
  | { success: true }
  | { success: false; error: string };

type AdminActor = { ok: true; session: SessionUser } | { ok: false; error: string };

/** Non-redirect admin guard: actions return { success: false } instead of redirecting. */
async function requireAdminActor(): Promise<AdminActor> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (session.role !== "admin") return { ok: false, error: "Not authorized." };
  return { ok: true, session };
}

/* ---------------- Faculty accounts ---------------- */

const createFacultyAccountSchema = z.object({
  fullName: z.string().min(1).max(120),
  username: z.string().min(3).max(40),
  email: z.string().email().max(200).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  password: z.string().min(4).max(100),
});

export async function createFacultyAccount(
  input: unknown
): Promise<SetupActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = createFacultyAccountSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { success: false, error: issue?.message ?? "Invalid faculty payload." };
  }
  const data = parsed.data;
  const fullName = data.fullName.trim();
  const username = data.username.trim();

  try {
    await db.insert(faculty).values({
      fullName,
      canonicalName: fullName.toLowerCase(),
      username,
      email: data.email ?? null,
      departmentId: data.departmentId ?? null,
      passwordHash: data.password,
      isHod: false,
      isActive: true,
    });
    revalidatePath("/admin/setup/faculty");
    revalidatePath("/admin/faculty");
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error, "faculty_username_unique")) {
      return { success: false, error: "Username already exists." };
    }
    if (isUniqueViolation(error, "faculty_email_unique")) {
      return { success: false, error: "Email already exists." };
    }
    if (isUniqueViolation(error, "faculty_canonical_name_unique")) {
      return { success: false, error: "A faculty member with this name already exists." };
    }
    console.error("Failed to create faculty account:", error);
    return { success: false, error: "Failed to create faculty account." };
  }
}

/* ---------------- Student accounts ---------------- */

/**
 * Admin path for student creation — delegates to the HOD enrollment
 * implementation (requireHodActor allows admin, departmentId = null).
 */
export async function createStudentAccount(
  input: unknown
): Promise<CreateStudentResult> {
  return createStudent(input);
}

/* ---------------- Sections ---------------- */

const createSectionSchema = z.object({
  studyYearId: z.string().uuid(),
  name: z.string().min(1).max(20),
  classTeacherId: z.string().uuid().optional().nullable(),
});

export async function createSection(input: unknown): Promise<SetupActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = createSectionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid section payload." };
  const { studyYearId, name, classTeacherId } = parsed.data;

  try {
    await db.insert(sections).values({
      studyYearId,
      name: name.trim(),
      classTeacherId: classTeacherId ?? null,
    });
    revalidatePath("/admin/setup/sections");
    revalidatePath("/admin/timetable");
    revalidatePath("/faculty/enrollment");
    revalidatePath("/admin/enrollment");
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error, "unique_section")) {
      return { success: false, error: "Section already exists for that study year." };
    }
    console.error("Failed to create section:", error);
    return { success: false, error: "Failed to create section." };
  }
}

/* ---------------- Subjects ---------------- */

const createSubjectSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().max(20).optional().nullable(),
  shortName: z.string().max(20).optional().nullable(),
  isLab: z.boolean().default(false),
  isElective: z.boolean().default(false),
  departmentId: z.string().uuid().optional().nullable(),
});

export async function createSubject(input: unknown): Promise<SetupActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = createSubjectSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid subject payload." };
  const data = parsed.data;

  try {
    await db.insert(subjects).values({
      name: data.name.trim(),
      code: data.code ?? null,
      shortName: data.shortName ?? null,
      isLab: data.isLab,
      isElective: data.isElective,
      departmentId: data.departmentId ?? null,
    });
    revalidatePath("/admin/setup/subjects");
    revalidatePath("/admin/timetable");
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error, "unique_subject_code")) {
      return { success: false, error: "Subject code already exists for this department." };
    }
    console.error("Failed to create subject:", error);
    return { success: false, error: "Failed to create subject." };
  }
}

/* ---------------- Timetable slots ---------------- */

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const createTimetableSlotSchema = z.object({
  sectionId: z.string().uuid(),
  academicYearId: z.string().uuid().optional(),
  dayOfWeek: z.enum(DAY_NAMES),
  periodId: z.string().uuid(),
  subjectId: z.string().uuid(),
  facultyId: z.string().uuid().optional().nullable(),
  isLab: z.boolean().default(false),
  labGroupId: z.string().uuid().optional().nullable(),
});

function revalidateSlotPaths() {
  revalidatePath("/admin/timetable");
  revalidatePath("/faculty/timetable");
  revalidatePath("/student/timetable");
  revalidatePath("/faculty/attendance");
  revalidatePath("/faculty/dashboard");
  revalidatePath("/student/dashboard");
}

export async function createTimetableSlot(
  input: unknown
): Promise<SetupActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = createTimetableSlotSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid slot payload." };
  const data = parsed.data;

  // Teaching days are runtime config — accept any of the 7 day names, reject
  // days the institution does not teach.
  const config = await getAppConfig();
  if (!config.teachingDays.includes(data.dayOfWeek)) {
    return { success: false, error: `${data.dayOfWeek} is not a teaching day.` };
  }

  const academicYearId = data.academicYearId ?? (await getCurrentAcademicYearId());
  if (!academicYearId) return { success: false, error: "No active academic year." };

  try {
    await db.insert(timetableSlots).values({
      sectionId: data.sectionId,
      academicYearId,
      dayOfWeek: data.dayOfWeek,
      periodId: data.periodId,
      subjectId: data.subjectId,
      facultyId: data.facultyId ?? null,
      isLab: data.isLab,
      labGroupId: data.labGroupId ?? null,
      isActive: true,
    });
    revalidateSlotPaths();
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error, "unique_slot")) {
      return { success: false, error: "Slot already exists for that period." };
    }
    console.error("Failed to create timetable slot:", error);
    return { success: false, error: "Failed to create timetable slot." };
  }
}

const updateTimetableSlotSchema = z.object({
  id: z.string().uuid(),
  sectionId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  dayOfWeek: z.enum(DAY_NAMES).optional(),
  periodId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  facultyId: z.string().uuid().optional().nullable(),
  isLab: z.boolean().optional(),
  labGroupId: z.string().uuid().optional().nullable(),
});

export async function updateTimetableSlot(
  input: unknown
): Promise<SetupActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = updateTimetableSlotSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid slot payload." };
  const data = parsed.data;

  const set: Partial<{
    sectionId: string;
    academicYearId: string;
    dayOfWeek: string;
    periodId: string;
    subjectId: string;
    facultyId: string | null;
    isLab: boolean;
    labGroupId: string | null;
  }> = {};
  if (data.sectionId !== undefined) set.sectionId = data.sectionId;
  if (data.academicYearId !== undefined) set.academicYearId = data.academicYearId;
  if (data.dayOfWeek !== undefined) set.dayOfWeek = data.dayOfWeek;
  if (data.periodId !== undefined) set.periodId = data.periodId;
  if (data.subjectId !== undefined) set.subjectId = data.subjectId;
  if (data.facultyId !== undefined) set.facultyId = data.facultyId;
  if (data.isLab !== undefined) set.isLab = data.isLab;
  if (data.labGroupId !== undefined) set.labGroupId = data.labGroupId;
  if (Object.keys(set).length === 0) {
    return { success: false, error: "Nothing to update." };
  }

  if (data.dayOfWeek !== undefined) {
    const config = await getAppConfig();
    if (!config.teachingDays.includes(data.dayOfWeek)) {
      return { success: false, error: `${data.dayOfWeek} is not a teaching day.` };
    }
  }

  try {
    await db.update(timetableSlots).set(set).where(eq(timetableSlots.id, data.id));
    revalidateSlotPaths();
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error, "unique_slot")) {
      return { success: false, error: "Slot already exists for that period." };
    }
    console.error("Failed to update timetable slot:", error);
    return { success: false, error: "Failed to update timetable slot." };
  }
}

export async function deleteTimetableSlot(
  slotId: string
): Promise<SetupActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };

  if (!z.string().uuid().safeParse(slotId).success) {
    return { success: false, error: "Invalid slot id." };
  }

  try {
    await db.delete(timetableSlots).where(eq(timetableSlots.id, slotId));
    revalidateSlotPaths();
    return { success: true };
  } catch (error) {
    console.error("Failed to delete timetable slot:", error);
    return { success: false, error: "Failed to delete timetable slot." };
  }
}

/* ---------------- Academic years ---------------- */

const createAcademicYearSchema = z
  .object({
    name: z.string().min(1).max(40),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isCurrent: z.boolean(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "End date must be on or after the start date.",
  });

export async function createAcademicYear(
  input: unknown
): Promise<SetupActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = createAcademicYearSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { success: false, error: issue?.message ?? "Invalid academic year payload." };
  }
  const { name, startDate, endDate, isCurrent } = parsed.data;

  try {
    if (isCurrent) {
      await db
        .update(academicYears)
        .set({ isCurrent: false })
        .where(eq(academicYears.isCurrent, true));
    }
    await db.insert(academicYears).values({
      name: name.trim(),
      startDate,
      endDate,
      isCurrent,
    });
    revalidatePath("/admin/setup/academic-years");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error, "academic_years_name_unique")) {
      return { success: false, error: "Academic year name already exists." };
    }
    console.error("Failed to create academic year:", error);
    return { success: false, error: "Failed to create academic year." };
  }
}

export async function setCurrentAcademicYear(
  yearId: string
): Promise<SetupActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };

  if (!z.string().uuid().safeParse(yearId).success) {
    return { success: false, error: "Invalid academic year id." };
  }

  try {
    await db
      .update(academicYears)
      .set({ isCurrent: false })
      .where(eq(academicYears.isCurrent, true));
    await db
      .update(academicYears)
      .set({ isCurrent: true })
      .where(eq(academicYears.id, yearId));
    revalidatePath("/admin/setup/academic-years");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to set current academic year:", error);
    return { success: false, error: "Failed to set current academic year." };
  }
}

/* ---------------- Study years ---------------- */

const createStudyYearSchema = z.object({
  programId: z.string().uuid(),
  yearNumber: z.number().int().min(1).max(10),
  label: z.string().min(1).max(40),
});

export async function createStudyYear(
  input: unknown
): Promise<SetupActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { success: false, error: actor.error };

  const parsed = createStudyYearSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { success: false, error: issue?.message ?? "Invalid study year payload." };
  }
  const { programId, yearNumber, label } = parsed.data;

  try {
    await db.insert(studyYears).values({
      programId,
      yearNumber,
      label: label.trim(),
    });
    revalidatePath("/admin/setup/study-years");
    revalidatePath("/admin/setup/sections");
    revalidatePath("/admin/timetable");
    return { success: true };
  } catch (error) {
    if (isUniqueViolation(error, "unique_program_study_year")) {
      return {
        success: false,
        error: "That year number already exists for this program.",
      };
    }
    console.error("Failed to create study year:", error);
    return { success: false, error: "Failed to create study year." };
  }
}
