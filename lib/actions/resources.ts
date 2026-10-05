"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  resources,
  subjects,
  faculty,
  students,
  studentEnrollments,
} from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { getSession, type SessionUser } from "@/lib/auth/session";
import {
  isFacultyAssigned,
  isSectionInHodDepartment,
  getCurrentAcademicYearId,
  isStudentCR,
} from "@/lib/auth/guards";

export type ResourceActionResult =
  | { success: true; resourceId?: string }
  | { success: false; error: string };

const MAX_FILE_BYTES = 4_000_000;

const RESOURCE_TYPES = ["assignment", "exam", "syllabus", "other"] as const;

const uploadResourceSchema = z.object({
  sectionId: z.string().uuid(),
  subjectId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(RESOURCE_TYPES),
  file: z
    .object({
      name: z.string().min(1).max(255),
      mime: z.string().min(1).max(150),
      dataBase64: z.string().min(1),
    })
    .optional()
    .nullable(),
});

/** Strip a data-URL prefix and whitespace, returning plain base64. */
function cleanBase64(dataBase64: string): string {
  const trimmed = dataBase64.trim();
  const withPrefix = trimmed.startsWith("data:")
    ? trimmed.slice(trimmed.indexOf(",") + 1)
    : trimmed;
  return withPrefix.replace(/\s/g, "");
}

/** Decoded byte length of a base64 string (no buffer allocation). */
function base64ByteLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

/**
 * Section-level access for resources: admin any; HOD own department;
 * faculty assigned; student actively enrolled (covers CRs).
 */
async function checkSectionAccess(
  session: SessionUser,
  sectionId: string
): Promise<{ ok: true; role: "faculty" | "hod" | "admin" | "student" } | { ok: false; error: string }> {
  if (session.role === "admin") return { ok: true, role: "admin" };
  if (session.role === "hod") {
    const inDept = await isSectionInHodDepartment(session.id, sectionId);
    return inDept
      ? { ok: true, role: "hod" }
      : { ok: false, error: "This section is outside your department." };
  }
  if (session.role === "faculty") {
    const assigned = await isFacultyAssigned(session.id, sectionId);
    return assigned
      ? { ok: true, role: "faculty" }
      : { ok: false, error: "You are not assigned to this class." };
  }
  // Student: must be actively enrolled in the section for the current year.
  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return { ok: false, error: "No active academic year." };
  const [enrolled] = await db
    .select({ id: studentEnrollments.id })
    .from(studentEnrollments)
    .where(
      and(
        eq(studentEnrollments.studentId, session.id),
        eq(studentEnrollments.sectionId, sectionId),
        eq(studentEnrollments.academicYearId, yearId),
        eq(studentEnrollments.isActive, true)
      )
    )
    .limit(1);
  return enrolled
    ? { ok: true, role: "student" }
    : { ok: false, error: "You are not enrolled in this section." };
}

export async function uploadResource(input: unknown): Promise<ResourceActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };

  const parsed = uploadResourceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid resource payload." };
  const { sectionId, subjectId, title, description, type, file } = parsed.data;

  // Students may upload only as class representatives (and must be enrolled).
  if (session.role === "student") {
    const isCr = await isStudentCR(session.id, sectionId);
    if (!isCr) {
      return {
        success: false,
        error: "Only the class representative can upload resources.",
      };
    }
  }

  const access = await checkSectionAccess(session, sectionId);
  if (!access.ok) return { success: false, error: access.error };

  if (subjectId) {
    const [subject] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);
    if (!subject) return { success: false, error: "Subject not found." };
  }

  let fileData: string | null = null;
  let fileName: string | null = null;
  let fileMime: string | null = null;
  if (file) {
    if (file.mime !== "application/pdf") {
      return { success: false, error: "Only PDF files are allowed." };
    }
    const base64 = cleanBase64(file.dataBase64);
    // Cheap length guard before any decoding (~4/3 expansion + padding slack).
    if (base64.length > Math.ceil((MAX_FILE_BYTES * 4) / 3) + 4) {
      return { success: false, error: "File is too large (maximum 4 MB)." };
    }
    const bytes = base64ByteLength(base64);
    if (bytes === 0) {
      return { success: false, error: "The attached file is empty." };
    }
    if (bytes > MAX_FILE_BYTES) {
      return { success: false, error: "File is too large (maximum 4 MB)." };
    }
    fileData = base64;
    fileName = file.name;
    fileMime = file.mime;
  }

  try {
    const [row] = await db
      .insert(resources)
      .values({
        sectionId,
        subjectId: subjectId ?? null,
        title,
        description: description ?? null,
        type,
        fileData,
        fileName,
        fileMime,
        uploadedByRole: access.role,
        uploadedByFacultyId:
          access.role === "faculty" || access.role === "hod" ? session.id : null,
        uploadedByStudentId: access.role === "student" ? session.id : null,
      })
      .returning({ id: resources.id });
    revalidatePath("/faculty/resources");
    revalidatePath("/student/resources");
    revalidatePath("/admin/resources");
    return { success: true, resourceId: row.id };
  } catch (error) {
    console.error("Failed to upload resource:", error);
    return { success: false, error: "Failed to upload resource." };
  }
}

export async function deleteResource(resourceId: string): Promise<ResourceActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (session.role === "student") {
    return { success: false, error: "Students cannot delete resources." };
  }
  if (!z.string().uuid().safeParse(resourceId).success) {
    return { success: false, error: "Invalid resource id." };
  }

  const [row] = await db
    .select({
      id: resources.id,
      sectionId: resources.sectionId,
      uploadedByRole: resources.uploadedByRole,
      uploadedByFacultyId: resources.uploadedByFacultyId,
    })
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);
  if (!row) return { success: false, error: "Resource not found." };

  const isUploader = row.uploadedByFacultyId === session.id;
  let allowed = false;
  if (session.role === "admin") {
    allowed = true;
  } else if (session.role === "hod") {
    allowed = isUploader || (await isSectionInHodDepartment(session.id, row.sectionId));
  } else if (session.role === "faculty") {
    allowed = isUploader;
  }
  if (!allowed) {
    return { success: false, error: "You cannot delete this resource." };
  }

  try {
    await db.delete(resources).where(eq(resources.id, resourceId));
    revalidatePath("/faculty/resources");
    revalidatePath("/student/resources");
    revalidatePath("/admin/resources");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete resource:", error);
    return { success: false, error: "Failed to delete resource." };
  }
}

export interface SectionResourceRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  subjectId: string | null;
  subjectName: string | null;
  fileName: string | null;
  hasFile: boolean;
  uploadedByRole: string;
  uploadedByName: string | null;
  createdAt: string;
}

type RawResourceRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  subjectId: string | null;
  subjectName: string | null;
  fileName: string | null;
  hasFile: boolean;
  uploadedByRole: string;
  uploadedByName: string | null;
  createdAt: Date | string;
};

/** Section resources WITHOUT file payloads. Empty array when unauthorized. */
export async function getSectionResources(
  sectionId: string
): Promise<SectionResourceRow[]> {
  const session = await getSession();
  if (!session) return [];
  if (!z.string().uuid().safeParse(sectionId).success) return [];
  const access = await checkSectionAccess(session, sectionId);
  if (!access.ok) return [];

  const rows = (await db
    .select({
      id: resources.id,
      title: resources.title,
      description: resources.description,
      type: resources.type,
      subjectId: resources.subjectId,
      subjectName: subjects.name,
      fileName: resources.fileName,
      hasFile: sql<boolean>`${resources.fileData} is not null`,
      uploadedByRole: resources.uploadedByRole,
      uploadedByName: sql<string | null>`coalesce(${faculty.fullName}, ${students.fullName})`,
      createdAt: resources.createdAt,
    })
    .from(resources)
    .leftJoin(subjects, eq(resources.subjectId, subjects.id))
    .leftJoin(faculty, eq(resources.uploadedByFacultyId, faculty.id))
    .leftJoin(students, eq(resources.uploadedByStudentId, students.id))
    .where(eq(resources.sectionId, sectionId))
    .orderBy(desc(resources.createdAt))) as unknown as RawResourceRow[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    type: r.type,
    subjectId: r.subjectId ?? null,
    subjectName: r.subjectName ?? null,
    fileName: r.fileName ?? null,
    hasFile: !!r.hasFile,
    uploadedByRole: r.uploadedByRole,
    uploadedByName: r.uploadedByName ?? null,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : new Date(String(r.createdAt)).toISOString(),
  }));
}

export type ResourceFileResult =
  | { ok: true; fileName: string; fileMime: string; dataBase64: string }
  | { ok: false; error: string };

/** Same section access check as the listing; returns the base64 payload. */
export async function getResourceFile(resourceId: string): Promise<ResourceFileResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (!z.string().uuid().safeParse(resourceId).success) {
    return { ok: false, error: "Invalid resource id." };
  }

  const [row] = await db
    .select({ sectionId: resources.sectionId })
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);
  if (!row) return { ok: false, error: "Resource not found." };

  const access = await checkSectionAccess(session, row.sectionId);
  if (!access.ok) return { ok: false, error: access.error };

  const [file] = await db
    .select({
      fileName: resources.fileName,
      fileMime: resources.fileMime,
      fileData: resources.fileData,
    })
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);

  if (!file?.fileData || !file.fileMime) {
    return { ok: false, error: "This resource has no attached file." };
  }
  return {
    ok: true,
    fileName: file.fileName ?? "file.pdf",
    fileMime: file.fileMime,
    dataBase64: file.fileData,
  };
}
