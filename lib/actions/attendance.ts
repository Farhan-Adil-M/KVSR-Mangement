"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  attendanceSessions,
  attendanceRecords,
  timetableSlots,
  studentEnrollments,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { isFacultyAssigned } from "@/lib/auth/guards";

const recordSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(["present", "absent"]),
});

const saveAttendanceSchema = z.object({
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timetableSlotId: z.string().uuid(),
  records: z.array(recordSchema).min(1),
});

export type SaveAttendanceResult =
  | { success: true; sessionId: string }
  | { success: false; error: string };

export async function saveAttendance(input: unknown): Promise<SaveAttendanceResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };

  const parsed = saveAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid attendance payload." };
  }
  const { sessionDate, timetableSlotId, records } = parsed.data;

  // Derive scope from the slot row — never trust client-supplied section/subject.
  const [slot] = await db
    .select({
      id: timetableSlots.id,
      sectionId: timetableSlots.sectionId,
      subjectId: timetableSlots.subjectId,
      academicYearId: timetableSlots.academicYearId,
      facultyId: timetableSlots.facultyId,
      labGroupId: timetableSlots.labGroupId,
    })
    .from(timetableSlots)
    .where(eq(timetableSlots.id, timetableSlotId))
    .limit(1);

  if (!slot) return { success: false, error: "Timetable slot not found." };

  // Authorization: faculty must be assigned to the slot's section (and subject);
  // admins may mark any class.
  if (session.role === "faculty") {
    const assigned = await isFacultyAssigned(
      session.id,
      slot.sectionId,
      slot.subjectId
    );
    if (!assigned) {
      return { success: false, error: "You are not assigned to this class." };
    }
  } else if (session.role !== "admin") {
    return { success: false, error: "Not authorized to mark attendance." };
  }

  // Verify every student is actively enrolled in the slot's section for the slot's year.
  // Dedupe first so repeated rows can't slip duplicate inserts past the count check.
  const uniqueRecords = Array.from(
    new Map(records.map((r) => [r.studentId, r])).entries()
  ).map(([, r]) => r);
  const studentIds = uniqueRecords.map((r) => r.studentId);
  const enrolled = await db
    .select({ studentId: studentEnrollments.studentId })
    .from(studentEnrollments)
    .where(
      and(
        inArray(studentEnrollments.studentId, studentIds),
        eq(studentEnrollments.sectionId, slot.sectionId),
        eq(studentEnrollments.academicYearId, slot.academicYearId),
        eq(studentEnrollments.isActive, true)
      )
    );

  const enrolledSet = new Set(enrolled.map((e) => e.studentId));
  if (enrolledSet.size !== new Set(studentIds).size) {
    return {
      success: false,
      error: "One or more students are not enrolled in this section.",
    };
  }

  try {
    const sessionId = await db.transaction(async (tx) => {
      const [existingSession] = await tx
        .select({ id: attendanceSessions.id })
        .from(attendanceSessions)
        .where(
          and(
            eq(attendanceSessions.timetableSlotId, timetableSlotId),
            eq(attendanceSessions.date, sessionDate)
          )
        )
        .limit(1);

      if (existingSession) {
        await tx
          .delete(attendanceRecords)
          .where(eq(attendanceRecords.sessionId, existingSession.id));
        return existingSession.id;
      }

      const [newSession] = await tx
        .insert(attendanceSessions)
        .values({
          date: sessionDate,
          timetableSlotId,
          facultyId: session.role === "faculty" ? session.id : slot.facultyId,
          subjectId: slot.subjectId,
          sectionId: slot.sectionId,
          status: "conducted",
          submittedAt: new Date(),
          submittedBy: session.role === "faculty" ? session.id : null,
        })
        .returning({ id: attendanceSessions.id });
      return newSession.id;
    });

    await db.transaction(async (tx) => {
      await tx.insert(attendanceRecords).values(
        uniqueRecords.map((record) => ({
          sessionId,
          studentId: record.studentId,
          status: record.status,
          recordedBy: session.role === "faculty" ? session.id : null,
          recordedAt: new Date(),
        }))
      );
    });

    revalidatePath("/faculty/attendance");
    revalidatePath("/faculty/dashboard");
    revalidatePath("/student/attendance");
    revalidatePath("/student/dashboard");
    revalidatePath("/admin/attendance/reports");
    return { success: true, sessionId };
  } catch (error) {
    console.error("Failed to save attendance:", error);
    return { success: false, error: "Failed to save attendance." };
  }
}
