"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { studentBiometrics, students } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { setSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/session";

const MATCH_THRESHOLD = 0.5; // face-api euclidean distance; lower = stricter

function distance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Identify a person by their face descriptor. Matches against enrolled
 * student biometrics (the primary face-identified role). Returns the user
 * to establish a session for, or ok:false when there is no confident match.
 */
export async function identifyByFace(
  descriptor: number[]
): Promise<
  | { ok: true; user: { id: string; name: string; role: "student" } }
  | { ok: false }
> {
  if (!Array.isArray(descriptor) || descriptor.length === 0) {
    return { ok: false };
  }

  const rows = await db
    .select({
      studentId: studentBiometrics.studentId,
      descriptor: studentBiometrics.descriptor,
      name: students.fullName,
    })
    .from(studentBiometrics)
    .leftJoin(students, eq(studentBiometrics.studentId, students.id));

  let bestId: string | null = null;
  let bestName: string | null = null;
  let bestDist = Infinity;

  for (const r of rows) {
    if (!Array.isArray(r.descriptor)) continue;
    const d = distance(descriptor, r.descriptor as number[]);
    if (d < bestDist) {
      bestDist = d;
      bestId = r.studentId;
      bestName = r.name;
    }
  }

  if (bestId && bestDist < MATCH_THRESHOLD) {
    return {
      ok: true,
      user: { id: bestId, name: bestName ?? "Student", role: "student" },
    };
  }
  return { ok: false };
}

/** Establish a session for an already-identified user and route to their portal. */
export async function loginByIdentified(user: {
  id: string;
  name: string;
  role: SessionUser["role"];
}) {
  const sessionUser: Omit<SessionUser, "exp"> = {
    id: user.id,
    name: user.name,
    role: user.role,
  };
  await setSession(sessionUser);
  const home: Record<SessionUser["role"], string> = {
    admin: "/admin/dashboard",
    hod: "/faculty/dashboard",
    faculty: "/faculty/dashboard",
    student: "/student/dashboard",
  };
  redirect(home[user.role]);
}
