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
import { and, eq, inArray, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { isFacultyAssigned, isStaffRole } from "@/lib/auth/guards";
import { isOnCampus } from "@/lib/actions/campus";

const recordSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(["present", "absent"]),
});

const saveAttendanceSchema = z.object({
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timetableSlotId: z.string().uuid(),
  records: z.array(recordSchema).min(1),
  // Optional device location, used to enforce on-campus attendance.
  location: z
    .object({ lat: z.number(), lng: z.number() })
    .optional(),
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
  const { sessionDate, timetableSlotId, records, location } = parsed.data;

  // On-campus gate: if the client supplies a location, it must be within the
  // campus radius. (Admins marking remotely may omit location.)
  if (location) {
    const geo = await isOnCampus(location.lat, location.lng);
    if (!geo.onCampus) {
      return {
        success: false,
        error: `Attendance can only be marked on campus (you are ~${geo.distance}m from campus, limit ${geo.radius}m).`,
      };
    }
  }

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

  // Authorization: faculty/HOD must be assigned to the slot's section (and subject);
  // admins may mark any class.
  if (isStaffRole(session.role) && session.role !== "admin") {
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

  const recordedById =
    session.role === "admin" ? null : session.id;

  try {
    // neon-http driver does NOT support db.transaction(); resolve the session
    // with sequential queries. Unique indexes (unique_session_slot_day on
    // sessions, unique_attendance_record on records) keep this safe.
    const [existingSession] = await db
      .select({ id: attendanceSessions.id })
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
    } else {
      const [newSession] = await db
        .insert(attendanceSessions)
        .values({
          date: sessionDate,
          timetableSlotId,
          facultyId: session.role === "admin" ? slot.facultyId : session.id,
          subjectId: slot.subjectId,
          sectionId: slot.sectionId,
          status: "conducted",
          submittedAt: new Date(),
          submittedBy: recordedById,
        })
        .returning({ id: attendanceSessions.id });
      sessionId = newSession.id;
    }

    // MERGE: upsert per student so a later camera scan ADDS to existing marks
    // instead of wiping them. Never deletes other students' records.
    await db
      .insert(attendanceRecords)
      .values(
        uniqueRecords.map((record) => ({
          sessionId,
          studentId: record.studentId,
          status: record.status,
          recordedBy: recordedById,
          recordedAt: new Date(),
        }))
      )
      .onConflictDoUpdate({
        target: [attendanceRecords.sessionId, attendanceRecords.studentId],
        set: {
          status: sql`excluded.status`,
          recordedBy: recordedById,
          recordedAt: new Date(),
        },
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
