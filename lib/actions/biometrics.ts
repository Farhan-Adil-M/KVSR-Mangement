"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { studentBiometrics, studentEnrollments, students } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { isFacultyAssigned, getCurrentAcademicYearId } from "@/lib/auth/guards";

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
  if (session.role === "faculty") {
    const assigned = await isFacultyAssigned(session.id, sectionId);
    if (!assigned) return { ok: false, error: "You are not assigned to this class." };
  } else if (session.role !== "admin") {
    return { ok: false, error: "Not authorized." };
  }
  return { ok: true, session };
}

export async function enrollBiometric(input: unknown): Promise<EnrollResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (session.role !== "faculty" && session.role !== "admin")
    return { success: false, error: "Not authorized." };

  const parsed = enrollSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid biometric payload." };
  const { studentId, descriptor } = parsed.data;

  // Faculty must be assigned to the student's section (any subject).
  if (session.role === "faculty") {
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
    const assigned = await isFacultyAssigned(session.id, enr.sectionId);
    if (!assigned)
      return { success: false, error: "You are not assigned to this student's class." };
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
    revalidatePath("/faculty/biometrics");
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
