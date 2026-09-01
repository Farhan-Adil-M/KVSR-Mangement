"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { studentBiometrics, studentEnrollments, students } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession, type SessionUser } from "@/lib/auth/session";
import {
  isFacultyAssigned,
  getCurrentAcademicYearId,
  isSectionInHodDepartment,
} from "@/lib/auth/guards";

const descriptorSchema = z
  .array(z.number())
  .length(128)
  .refine(
    (arr) => arr.every((n) => Number.isFinite(n) && Math.abs(n) < 1e3),
    "descriptor must be finite and bounded"
  );
const enrollSchema = z.object({
  studentId: z.string().uuid(),
  descriptor: descriptorSchema,
  // Explicit consent acknowledgement captured in the UI.
  consent: z.literal(true),
});

export type EnrollResult = { success: true } | { success: false; error: string };

type AuthResult = { ok: true; session: SessionUser } | { ok: false; error: string };

async function authorizeSectionAccess(sectionId: string): Promise<AuthResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (session.role === "admin") return { ok: true, session };
  if (session.role === "faculty") {
    const assigned = await isFacultyAssigned(session.id, sectionId);
    if (!assigned) return { ok: false, error: "You are not assigned to this class." };
    return { ok: true, session };
  }
  if (session.role === "hod") {
    // HOD may access any class within their own department.
    const inDept = await isSectionInHodDepartment(session.id, sectionId);
    if (!inDept) return { ok: false, error: "This class is outside your department." };
    return { ok: true, session };
  }
  return { ok: false, error: "Not authorized." };
}

export async function enrollBiometric(input: unknown): Promise<EnrollResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (
    session.role !== "faculty" &&
    session.role !== "hod" &&
    session.role !== "admin"
  )
    return { success: false, error: "Not authorized." };

  const parsed = enrollSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid biometric payload." };
  const { studentId, descriptor } = parsed.data;

  // Faculty must be assigned to the student's section; HOD must own the
  // student's department.
  if (session.role === "faculty" || session.role === "hod") {
    const yearId = await getCurrentAcademicYearId();
    if (!yearId) return { success: false, error: "No active academic year." };
    const [enr] = await db
      .select({ sectionId: studentEnrollments.sectionId })
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.studentId, studentId),
          eq(studentEnrollments.academicYearId, yearId),
          eq(studentEnrollments.isActive, true)
        )
      )
      .limit(1);
    if (!enr) return { success: false, error: "Student is not enrolled." };
    if (session.role === "faculty") {
      const assigned = await isFacultyAssigned(session.id, enr.sectionId);
      if (!assigned)
        return { success: false, error: "You are not assigned to this student's class." };
    } else {
      const inDept = await isSectionInHodDepartment(session.id, enr.sectionId);
      if (!inDept)
        return { success: false, error: "This student is outside your department." };
    }
  }

  try {
    await db
      .insert(studentBiometrics)
      .values({
        studentId,
        descriptor,
        enrolledBy: session.id,
        consentedAt: new Date(),
        consentVersion: "1.0",
      })
      .onConflictDoUpdate({
        target: studentBiometrics.studentId,
        set: {
          descriptor,
          enrolledBy: session.id,
          consentedAt: new Date(),
          consentVersion: "1.0",
          updatedAt: new Date(),
        },
      });
    revalidatePath("/faculty/students");
    return { success: true };
  } catch (error) {
    console.error("Failed to enroll biometric:", error);
    return { success: false, error: "Failed to save biometric." };
  }
}

export type SectionBiometricsResult =
  | { ok: true; biometrics: { studentId: string; descriptor: number[] }[] }
  | { ok: false; error: string };

/** Returns enrolled face descriptors for a section's students (vectors only, never images). */
export async function getSectionBiometrics(sectionId: string): Promise<SectionBiometricsResult> {
  const auth = await authorizeSectionAccess(sectionId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return { ok: false, error: "No active academic year." };

  const rows = await db
    .select({
      studentId: studentBiometrics.studentId,
      descriptor: studentBiometrics.descriptor,
    })
    .from(studentBiometrics)
    .innerJoin(
      studentEnrollments,
      eq(studentEnrollments.studentId, studentBiometrics.studentId)
    )
    .where(
      and(
        eq(studentEnrollments.sectionId, sectionId),
        eq(studentEnrollments.academicYearId, yearId),
        eq(studentEnrollments.isActive, true)
      )
    );

  return {
    ok: true,
    biometrics: rows.map((r) => ({
      studentId: r.studentId,
      descriptor: r.descriptor as unknown as number[],
    })),
  };
}

export type SectionEnrollmentForBiometrics = {
  id: string;
  fullName: string;
  rollNumber: string;
  hasBiometric: boolean;
};

export type SectionStudentsResult =
  | { ok: true; students: SectionEnrollmentForBiometrics[] }
  | { ok: false; error: string };

/** Students in a section with a flag indicating whether they already have a biometric. */
export async function getSectionStudentsForBiometrics(
  sectionId: string
): Promise<SectionStudentsResult> {
  const auth = await authorizeSectionAccess(sectionId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return { ok: false, error: "No active academic year." };

  const enrolled = await db
    .select({
      id: students.id,
      fullName: students.fullName,
      rollNumber: students.rollNumber,
    })
    .from(studentEnrollments)
    .innerJoin(students, eq(studentEnrollments.studentId, students.id))
    .where(
      and(
        eq(studentEnrollments.sectionId, sectionId),
        eq(studentEnrollments.academicYearId, yearId),
        eq(studentEnrollments.isActive, true)
      )
    )
    .orderBy(students.rollNumber);

  if (enrolled.length === 0) return { ok: true, students: [] };

  // Bulk fetch biometric student ids for this section.
  const bioRows = await db
    .select({ studentId: studentBiometrics.studentId })
    .from(studentBiometrics)
    .innerJoin(
      studentEnrollments,
      eq(studentEnrollments.studentId, studentBiometrics.studentId)
    )
    .where(
      and(
        eq(studentEnrollments.sectionId, sectionId),
        eq(studentEnrollments.academicYearId, yearId),
        eq(studentEnrollments.isActive, true)
      )
    );
  const bioSet = new Set(bioRows.map((r) => r.studentId));

  return {
    ok: true,
    students: enrolled.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      rollNumber: s.rollNumber,
      hasBiometric: bioSet.has(s.id),
    })),
  };
}

/* ---------------- Student self-enrollment (frozen after first) ---------------- */

const selfEnrollSchema = z.object({
  studentId: z.string().uuid(),
  descriptor: descriptorSchema,
  consent: z.literal(true),
});

export type SelfEnrollResult = { success: true } | { success: false; error: string };

export async function enrollOwnBiometric(input: unknown): Promise<SelfEnrollResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (session.role !== "student") return { success: false, error: "Not authorized." };

  const parsed = selfEnrollSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid biometric payload." };
  const { studentId, descriptor } = parsed.data;

  // Students may only enroll their own biometric.
  if (session.id !== studentId) return { success: false, error: "Not authorized." };

  // Frozen after first enrollment: cannot change or re-enroll on their own.
  const [existing] = await db
    .select({ id: studentBiometrics.id })
    .from(studentBiometrics)
    .where(eq(studentBiometrics.studentId, studentId))
    .limit(1);
  if (existing) {
    return {
      success: false,
      error: "Biometric already enrolled. Contact faculty or HOD to change it.",
    };
  }

  try {
    await db.insert(studentBiometrics).values({
      studentId,
      descriptor,
      enrolledBy: session.id,
      consentedAt: new Date(),
      consentVersion: "1.0",
    });
    revalidatePath("/student/biometrics");
    return { success: true };
  } catch (error) {
    console.error("Failed to enroll own biometric:", error);
    return { success: false, error: "Failed to save biometric." };
  }
}

export type MyBiometricResult =
  | { ok: true; hasBiometric: boolean; consentedAt: string | null; consentVersion: string | null }
  | { ok: false; error: string };

export async function getMyBiometric(studentId: string): Promise<MyBiometricResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  if (session.role !== "student") return { ok: false, error: "Not authorized." };
  if (session.id !== studentId) return { ok: false, error: "Not authorized." };

  const [row] = await db
    .select({
      consentedAt: studentBiometrics.consentedAt,
      consentVersion: studentBiometrics.consentVersion,
    })
    .from(studentBiometrics)
    .where(eq(studentBiometrics.studentId, studentId))
    .limit(1);

  return {
    ok: true,
    hasBiometric: !!row,
    consentedAt: row?.consentedAt ? row.consentedAt.toISOString() : null,
    consentVersion: row?.consentVersion ?? null,
  };
}
