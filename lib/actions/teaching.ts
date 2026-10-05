"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  assignments,
  marks,
  exams,
  syllabusUnits,
  studentEnrollments,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { isFacultyAssigned, isSectionInHodDepartment, getCurrentAcademicYearId } from "@/lib/auth/guards";
import { defaultMaxMarks } from "@/lib/marks";

export type ActionResult = { success: true } | { success: false; error: string };

const EXAM_TYPES = ["internal", "assignment", "midterm", "external", "other"] as const;

type FacultyContext =
  | { error: string; session?: undefined; yearId?: undefined }
  | { error?: undefined; session: { role: "admin" | "hod" | "faculty" | "student"; id: string }; yearId: string };

async function facultyContext(): Promise<FacultyContext> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." as const };
  if (session.role !== "faculty" && session.role !== "hod" && session.role !== "admin") {
    return { error: "Not authorized." as const };
  }
  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return { error: "No active academic year." as const };
  return { session, yearId };
}

/** Admin unrestricted; HOD must own the section's department; faculty must be assigned to section (+subject when given). */
async function assertAccess(
  session: { role: "admin" | "hod" | "faculty" | "student"; id: string },
  sectionId: string,
  subjectId?: string
) {
  if (session.role === "admin") return true;
  if (session.role === "hod") return isSectionInHodDepartment(session.id, sectionId);
  return isFacultyAssigned(session.id, sectionId, subjectId);
}

/* ---------------- Assignments ---------------- */

const createAssignmentSchema = z.object({
  subjectId: z.string().uuid(),
  sectionId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export async function createAssignment(input: unknown): Promise<ActionResult> {
  const ctx = await facultyContext();
  if ("error" in ctx) return { success: false as const, error: ctx.error ?? "Not authorized." };
  const { session, yearId } = ctx;

  const parsed = createAssignmentSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid assignment payload." };
  const { subjectId, sectionId, title, description, dueDate } = parsed.data;

  if (!(await assertAccess(session, sectionId, subjectId))) {
    return { success: false as const, error: "You are not assigned to this class." };
  }

  try {
    await db.insert(assignments).values({
      facultyId: session.role === "admin" ? null : session.id,
      subjectId,
      sectionId,
      academicYearId: yearId,
      title,
      description: description ?? null,
      dueDate: dueDate ?? null,
    });
    revalidatePath("/faculty/assignments");
    revalidatePath("/student/assignments");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to create assignment:", error);
    return { success: false as const, error: "Failed to create assignment." };
  }
}

/* ---------------- Marks ---------------- */

const markRowSchema = z.object({
  studentId: z.string().uuid(),
  marksObtained: z.number().min(0).max(1000),
});

const saveMarksSchema = z.object({
  subjectId: z.string().uuid(),
  sectionId: z.string().uuid(),
  title: z.string().min(1).max(120),
  examType: z.enum(EXAM_TYPES),
  // Optional: defaults from MAX_MARKS_BY_EXAM_TYPE (JNTUA R23) when omitted.
  // "midterm"/"other" have no default and require an explicit value.
  maxMarks: z.number().min(1).max(1000).optional(),
  rows: z.array(markRowSchema).min(1),
});

export async function saveMarks(input: unknown): Promise<ActionResult> {
  const ctx = await facultyContext();
  if ("error" in ctx) return { success: false as const, error: ctx.error ?? "Not authorized." };
  const { session, yearId } = ctx;

  const parsed = saveMarksSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid marks payload." };
  const { subjectId, sectionId, title, examType, maxMarks, rows } = parsed.data;

  const resolvedMaxMarks = maxMarks ?? defaultMaxMarks(examType);
  if (resolvedMaxMarks === undefined) {
    return {
      success: false as const,
      error: "Max marks is required for this exam type.",
    };
  }

  if (!(await assertAccess(session, sectionId, subjectId))) {
    return { success: false as const, error: "You are not assigned to this class." };
  }

  // Verify every student is actively enrolled in this section for the current year.
  const enrolled = await db
    .select({ studentId: studentEnrollments.studentId })
    .from(studentEnrollments)
    .where(
      and(
        inArray(studentEnrollments.studentId, rows.map((r) => r.studentId)),
        eq(studentEnrollments.sectionId, sectionId),
        eq(studentEnrollments.academicYearId, yearId),
        eq(studentEnrollments.isActive, true)
      )
    );
  const enrolledSet = new Set(enrolled.map((e) => e.studentId));
  if (enrolledSet.size !== new Set(rows.map((r) => r.studentId)).size) {
    return {
      success: false as const,
      error: "One or more students are not enrolled in this section.",
    };
  }

  try {
    for (const row of rows) {
      if (row.marksObtained > resolvedMaxMarks) {
        return {
          success: false as const,
          error: `Marks for a student exceed the maximum of ${resolvedMaxMarks}.`,
        };
      }
      // Upsert on (student, subject, year, title)
      const [existing] = await db
        .select({ id: marks.id })
        .from(marks)
        .where(
          and(
            eq(marks.studentId, row.studentId),
            eq(marks.subjectId, subjectId),
            eq(marks.academicYearId, yearId),
            eq(marks.title, title)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(marks)
          .set({
            marksObtained: String(row.marksObtained),
            maxMarks: String(resolvedMaxMarks),
            examType,
            recordedBy: session.role === "admin" ? null : session.id,
            updatedAt: new Date(),
          })
          .where(eq(marks.id, existing.id));
      } else {
        await db.insert(marks).values({
          studentId: row.studentId,
          subjectId,
          academicYearId: yearId,
          title,
          examType,
          marksObtained: String(row.marksObtained),
          maxMarks: String(resolvedMaxMarks),
          recordedBy: session.role === "admin" ? null : session.id,
        });
      }
    }
    revalidatePath("/faculty/marks");
    revalidatePath("/student/marks");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to save marks:", error);
    return { success: false as const, error: "Failed to save marks." };
  }
}

/* ---------------- Exams ---------------- */

const createExamSchema = z.object({
  subjectId: z.string().uuid(),
  sectionId: z.string().uuid().nullable(),
  studyYearId: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional()
    .nullable(),
  instructions: z.string().max(2000).optional().nullable(),
});

export async function createExam(input: unknown): Promise<ActionResult> {
  const ctx = await facultyContext();
  if ("error" in ctx) return { success: false as const, error: ctx.error ?? "Not authorized." };
  const { session, yearId } = ctx;

  const parsed = createExamSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid exam payload." };
  const data = parsed.data;

  if (data.sectionId) {
    if (!(await assertAccess(session, data.sectionId, data.subjectId))) {
      return { success: false as const, error: "You are not assigned to this class." };
    }
  } else if (session.role !== "admin") {
    // Year-wide exams are admin-only.
    return { success: false as const, error: "Only admin can create year-wide exams." };
  }

  try {
    await db.insert(exams).values({
      subjectId: data.subjectId,
      sectionId: data.sectionId,
      studyYearId: data.studyYearId,
      academicYearId: yearId,
      title: data.title,
      examDate: data.examDate,
      startTime: data.startTime ?? null,
      instructions: data.instructions ?? null,
    });
    revalidatePath("/student/exams");
    revalidatePath("/faculty/dashboard");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to create exam:", error);
    return { success: false as const, error: "Failed to create exam." };
  }
}

const updateExamSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional()
    .nullable(),
  instructions: z.string().max(2000).optional().nullable(),
});

/** Admin-only partial exam update. */
export async function updateExam(input: unknown): Promise<ActionResult> {
  const ctx = await facultyContext();
  if ("error" in ctx) return { success: false as const, error: ctx.error ?? "Not authorized." };
  const { session } = ctx;
  if (session.role !== "admin") {
    return { success: false as const, error: "Only admin can update exams." };
  }

  const parsed = updateExamSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid exam payload." };
  const { id, title, examDate, startTime, instructions } = parsed.data;

  const set: Partial<{
    title: string;
    examDate: string;
    startTime: string | null;
    instructions: string | null;
  }> = {};
  if (title !== undefined) set.title = title;
  if (examDate !== undefined) set.examDate = examDate;
  if (startTime !== undefined) set.startTime = startTime;
  if (instructions !== undefined) set.instructions = instructions;
  if (Object.keys(set).length === 0) {
    return { success: false as const, error: "Nothing to update." };
  }

  try {
    await db.update(exams).set(set).where(eq(exams.id, id));
    revalidatePath("/student/exams");
    revalidatePath("/faculty/dashboard");
    revalidatePath("/admin/timetable");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to update exam:", error);
    return { success: false as const, error: "Failed to update exam." };
  }
}

/** Admin-only exam deletion. */
export async function deleteExam(examId: string): Promise<ActionResult> {
  const ctx = await facultyContext();
  if ("error" in ctx) return { success: false as const, error: ctx.error ?? "Not authorized." };
  const { session } = ctx;
  if (session.role !== "admin") {
    return { success: false as const, error: "Only admin can delete exams." };
  }
  if (!z.string().uuid().safeParse(examId).success) {
    return { success: false as const, error: "Invalid exam id." };
  }

  try {
    await db.delete(exams).where(eq(exams.id, examId));
    revalidatePath("/student/exams");
    revalidatePath("/faculty/dashboard");
    revalidatePath("/admin/timetable");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to delete exam:", error);
    return { success: false as const, error: "Failed to delete exam." };
  }
}

/* ---------------- Syllabus ---------------- */

const createSyllabusUnitSchema = z.object({
  subjectId: z.string().uuid(),
  unitNumber: z.number().int().min(1).max(20),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
});

export async function createSyllabusUnit(input: unknown): Promise<ActionResult> {
  const ctx = await facultyContext();
  if ("error" in ctx) return { success: false as const, error: ctx.error ?? "Not authorized." };
  const { session } = ctx;

  const parsed = createSyllabusUnitSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid syllabus payload." };
  const { subjectId, unitNumber, title, description } = parsed.data;

  // Faculty/HOD must teach this subject somewhere; admin may always edit.
  if (session.role === "faculty" || session.role === "hod") {
    const yearId = await getCurrentAcademicYearId();
    if (!yearId) return { success: false as const, error: "No active academic year." };
    const { facultyAssignments } = await import("@/lib/db/schema");
    const [row] = await db
      .select({ id: facultyAssignments.id })
      .from(facultyAssignments)
      .where(
        and(
          eq(facultyAssignments.facultyId, session.id),
          eq(facultyAssignments.subjectId, subjectId),
          eq(facultyAssignments.academicYearId, yearId)
        )
      )
      .limit(1);
    if (!row) {
      return { success: false as const, error: "You are not assigned to this subject." };
    }
  }

  try {
    // Upsert on (subject, unitNumber)
    const [existing] = await db
      .select({ id: syllabusUnits.id })
      .from(syllabusUnits)
      .where(
        and(
          eq(syllabusUnits.subjectId, subjectId),
          eq(syllabusUnits.unitNumber, unitNumber)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(syllabusUnits)
        .set({ title, description: description ?? null })
        .where(eq(syllabusUnits.id, existing.id));
    } else {
      await db.insert(syllabusUnits).values({
        subjectId,
        unitNumber,
        title,
        description: description ?? null,
      });
    }
    revalidatePath("/student/syllabus");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to save syllabus unit:", error);
    return { success: false as const, error: "Failed to save syllabus unit." };
  }
}
