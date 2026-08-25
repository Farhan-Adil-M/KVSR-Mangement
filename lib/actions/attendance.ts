"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  attendanceSessions,
  attendanceRecords,
  studentAttendanceSummaries,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface AttendanceRecordInput {
  studentId: string;
  status: "present" | "absent";
}

export async function saveAttendance(
  sessionDate: string,
  timetableSlotId: string,
  subjectId: string,
  sectionId: string,
  records: AttendanceRecordInput[]
) {
  try {
    // Check for existing session
    const [existingSession] = await db
      .select()
      .from(attendanceSessions)
      .where(
        and(
          eq(attendanceSessions.timetableSlotId, timetableSlotId),
          eq(attendanceSessions.date, sessionDate)
        )
      )
      .limit(1);

    let sessionId: string;

    if (existingSession) {
      sessionId = existingSession.id;
      // Delete existing records to re-save
      await db
        .delete(attendanceRecords)
        .where(eq(attendanceRecords.sessionId, sessionId));
    } else {
      const [newSession] = await db
        .insert(attendanceSessions)
        .values({
          date: sessionDate,
          timetableSlotId,
          subjectId,
          sectionId,
          status: "conducted",
          submittedAt: new Date(),
        })
        .returning({ id: attendanceSessions.id });
      sessionId = newSession.id;
    }

    if (records.length > 0) {
      await db.insert(attendanceRecords).values(
        records.map((record) => ({
          sessionId,
          studentId: record.studentId,
          status: record.status,
          recordedAt: new Date(),
        }))
      );
    }

    // Update summary (simplified: aggregate by subject)
    await updateAttendanceSummary(subjectId, records);

    revalidatePath("/attendance");
    return { success: true, sessionId };
  } catch (error) {
    console.error("Failed to save attendance:", error);
    return { success: false, error: "Failed to save attendance" };
  }
}

async function updateAttendanceSummary(
  subjectId: string,
  records: AttendanceRecordInput[]
) {
  for (const record of records) {
    const [existing] = await db
      .select()
      .from(studentAttendanceSummaries)
      .where(
        and(
          eq(studentAttendanceSummaries.studentId, record.studentId),
          eq(studentAttendanceSummaries.subjectId, subjectId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(studentAttendanceSummaries)
        .set({
          classesHeld: (existing.classesHeld ?? 0) + 1,
          classesAttended:
            (existing.classesAttended ?? 0) +
            (record.status === "present" ? 1 : 0),
          updatedAt: new Date(),
        })
        .where(eq(studentAttendanceSummaries.id, existing.id));
    } else {
      await db.insert(studentAttendanceSummaries).values({
        studentId: record.studentId,
        subjectId,
        classesHeld: 1,
        classesAttended: record.status === "present" ? 1 : 0,
      });
    }
  }
}
