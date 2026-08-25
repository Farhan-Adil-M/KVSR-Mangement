"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { faculty, students } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { setSession, clearSession, type SessionUser } from "@/lib/auth/session";

export async function login(
  username: string,
  password: string,
  role: "faculty" | "student"
): Promise<{ success: false; error: string } | { success: true; user: SessionUser }> {
  const trimmedUsername = username.trim();
  const trimmedPassword = password.trim();

  if (!trimmedUsername || !trimmedPassword) {
    return { success: false, error: "Username and password are required." };
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

    const user: SessionUser = {
      id: member.id,
      name: member.fullName,
      role: member.isHod ? "admin" : "faculty",
    };

    await setSession(user);
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

  const user: SessionUser = {
    id: student.id,
    name: student.fullName,
    role: "student",
  };

  await setSession(user);
  return { success: true, user };
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
