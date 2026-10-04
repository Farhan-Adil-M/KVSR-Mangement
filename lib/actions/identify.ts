"use server";

import { db } from "@/lib/db";
import { studentBiometrics, students } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { setSession } from "@/lib/auth/session";
import { getAppConfig } from "@/lib/app-config";
import { descriptorSchema, euclideanDistance } from "@/lib/validation/biometric";
import { homeForRole } from "@/lib/auth/guards";

export type IdentifyAndLoginResult =
  | { success: true; redirect: string }
  | { success: false; error: string };

/**
 * Face sign-in: matches the descriptor against enrolled+active student
 * biometrics server-side and establishes the session from the DB row.
 * The client never supplies identity — only the raw descriptor.
 */
export async function identifyAndLogin(
  descriptor: number[]
): Promise<IdentifyAndLoginResult> {
  const parsed = descriptorSchema.safeParse(descriptor);
  if (!parsed.success) {
    return { success: false, error: "No matching face. Use password sign-in." };
  }

  const config = await getAppConfig();

  const rows = await db
    .select({
      studentId: studentBiometrics.studentId,
      descriptor: studentBiometrics.descriptor,
      name: students.fullName,
    })
    .from(studentBiometrics)
    .innerJoin(students, eq(studentBiometrics.studentId, students.id))
    .where(eq(students.isActive, true));

  let bestId: string | null = null;
  let bestName: string | null = null;
  let bestDist = Infinity;

  for (const r of rows) {
    if (!Array.isArray(r.descriptor)) continue;
    const d = euclideanDistance(parsed.data, r.descriptor as number[]);
    if (d < bestDist) {
      bestDist = d;
      bestId = r.studentId;
      bestName = r.name;
    }
  }

  if (!bestId || bestDist >= config.matchThreshold) {
    return { success: false, error: "No matching face. Use password sign-in." };
  }

  await setSession(
    { id: bestId, name: bestName ?? "Student", role: "student" },
    config.sessionDays
  );
  return { success: true, redirect: homeForRole("student") };
}
