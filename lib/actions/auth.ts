"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { faculty, students, admins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { setSession, clearSession, type SessionUser } from "@/lib/auth/session";
import { getAppConfig } from "@/lib/app-config";

export async function login(
  username: string,
  password: string,
  role: "admin" | "faculty" | "student"
): Promise<{ success: false; error: string } | { success: true; user: Omit<SessionUser, "exp"> }> {
  const trimmedUsername = username.trim();
  const trimmedPassword = password.trim();

  if (!trimmedUsername || !trimmedPassword) {
    return { success: false, error: "Username and password are required." };
  }

  const { sessionDays } = await getAppConfig();

  if (role === "admin") {
    const [admin] = await db
      .select({
        id: admins.id,
        fullName: admins.fullName,
        username: admins.username,
        passwordHash: admins.passwordHash,
      })
      .from(admins)
      .where(eq(admins.username, trimmedUsername))
      .limit(1);

    if (!admin || !admin.passwordHash) {
      return { success: false, error: "Invalid admin username or password." };
    }

    // Plaintext comparison (consistent with the rest of the app)
    if (admin.passwordHash !== trimmedPassword) {
      return { success: false, error: "Invalid admin username or password." };
    }

    const user: Omit<SessionUser, "exp"> = {
      id: admin.id,
      name: admin.fullName,
      role: "admin",
    };

    await setSession(user, sessionDays);
    return { success: true, user };
  }

  if (role === "faculty") {
    const [member] = await db
      .select({
        id: faculty.id,
        fullName: faculty.fullName,
        username: faculty.username,
        passwordHash: faculty.passwordHash,
        isHod: faculty.isHod,
      })
      .from(faculty)
      .where(eq(faculty.username, trimmedUsername))
      .limit(1);

    if (!member || !member.passwordHash) {
      return { success: false, error: "Invalid username or password." };
    }

    // Plaintext comparison as requested
    if (member.passwordHash !== trimmedPassword) {
      return { success: false, error: "Invalid username or password." };
    }

    const user: Omit<SessionUser, "exp"> = {
      id: member.id,
      name: member.fullName,
      role: member.isHod ? "hod" : "faculty",
    };

    await setSession(user, sessionDays);
    return { success: true, user };
  }

  // Student login by roll number
  const [student] = await db
    .select({ id: students.id, fullName: students.fullName, rollNumber: students.rollNumber })
    .from(students)
    .where(eq(students.rollNumber, trimmedUsername))
    .limit(1);

  if (!student) {
    return { success: false, error: "Invalid roll number or password." };
  }

  // For students, password is roll number for simplicity in dev mode
  if (trimmedPassword !== student.rollNumber) {
    return { success: false, error: "Invalid roll number or password." };
  }

  const user: Omit<SessionUser, "exp"> = {
    id: student.id,
    name: student.fullName,
    role: "student",
  };

  await setSession(user, sessionDays);
  return { success: true, user };
}

export async function logout() {
  await clearSession();
  redirect("/identify");
}
