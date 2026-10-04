"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  attendanceSessions,
  attendanceRecords,
  timetableSlots,
  studentEnrollments,
  studentBiometrics,
} from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { isFacultyAssigned, isStaffRole } from "@/lib/auth/guards";
import { getCampusSettings, haversineMeters } from "@/lib/actions/campus";
import { getAppConfig } from "@/lib/app-config";
import { descriptorSchema, euclideanDistance } from "@/lib/validation/biometric";
import { getCollegeNow } from "@/lib/utils";

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

type SlotScope = { sectionId: string; subjectId: string };

/**
 * Staff guard shared by saveAttendance and the self check-in open/close
 * actions: faculty/HOD must be assigned to the slot's section+subject
 * (derived from the slot row, never client IDs); admins may act on any class.
 * Returns an error message, or null when authorized.
 */
async function staffSlotGuard(
  session: SessionUser,
  slot: SlotScope
): Promise<string | null> {
  if (isStaffRole(session.role) && session.role !== "admin") {
    const assigned = await isFacultyAssigned(
      session.id,
      slot.sectionId,
      slot.subjectId
    );
    if (!assigned) return "You are not assigned to this class.";
    return null;
  }
  if (session.role !== "admin") return "Not authorized to mark attendance.";
  return null;
}

export async function saveAttendance(input: unknown): Promise<SaveAttendanceResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };

  const parsed = saveAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid attendance payload." };
  }
  const { sessionDate, timetableSlotId, records, location } = parsed.data;

  // On-campus gate: with a campus configured, staff callers must be on campus;
  // admins marking remotely may omit location. Without a campus row, location
  // is optional and ignored.
  const campus = await getCampusSettings();
  if (campus) {
    if (session.role !== "admin" && !location) {
      return {
        success: false,
        error: "Location is required to mark attendance.",
      };
    }
    if (location) {
      const distanceMeters = haversineMeters(
        location.lat,
        location.lng,
        campus.latitude,
        campus.longitude
      );
      if (distanceMeters > campus.radiusMeters) {
        return {
          success: false,
          error: `Attendance can only be marked on campus (you are ~${Math.round(distanceMeters)}m from campus, limit ${campus.radiusMeters}m).`,
        };
      }
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
  const guardError = await staffSlotGuard(session, slot);
  if (guardError) return { success: false, error: guardError };

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
      .select({
        id: attendanceSessions.id,
        submittedAt: attendanceSessions.submittedAt,
      })
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
      // Submitting the roster closes out an open self check-in session:
      // held-class counting filters submitted_at IS NOT NULL, so a window with
      // no submitted roster does not count as a held class until confirmed.
      if (!existingSession.submittedAt) {
        await db
          .update(attendanceSessions)
          .set({
            submittedAt: new Date(),
            submittedBy: recordedById,
            selfCheckinOpenedAt: null,
          })
          .where(eq(attendanceSessions.id, sessionId));
      }
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

/* ---------------- Self check-in (third attendance mode) ---------------- */

export type SelfCheckinActionResult =
  | { success: true }
  | { success: false; error: string };

const openSelfCheckinSchema = z.object({
  timetableSlotId: z.string().uuid(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z
    .object({ lat: z.number(), lng: z.number() })
    .optional(),
});

/** Staff opens (or refreshes) the self check-in window for a slot's session. */
export async function openSelfCheckin(
  input: unknown
): Promise<SelfCheckinActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };

  const parsed = openSelfCheckinSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid self check-in payload." };
  const { sessionDate, timetableSlotId, location } = parsed.data;

  const campus = await getCampusSettings();
  if (campus) {
    if (session.role !== "admin" && !location) {
      return {
        success: false,
        error: "Location is required to open self check-in.",
      };
    }
    if (location) {
      const distanceMeters = haversineMeters(
        location.lat,
        location.lng,
        campus.latitude,
        campus.longitude
      );
      if (distanceMeters > campus.radiusMeters) {
        return {
          success: false,
          error: `Self check-in can only be opened on campus (you are ~${Math.round(distanceMeters)}m from campus, limit ${campus.radiusMeters}m).`,
        };
      }
    }
  }

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

  const guardError = await staffSlotGuard(session, slot);
  if (guardError) return { success: false, error: guardError };

  try {
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

    const openedAt = new Date();
    if (existingSession) {
      // Re-opening refreshes the anchor — the window restarts.
      await db
        .update(attendanceSessions)
        .set({ selfCheckinOpenedAt: openedAt })
        .where(eq(attendanceSessions.id, existingSession.id));
    } else {
      // created with submittedAt = null so it does NOT count as a held class
      // until the roster is submitted via saveAttendance.
      await db.insert(attendanceSessions).values({
        date: sessionDate,
        timetableSlotId,
        facultyId: session.role === "admin" ? slot.facultyId : session.id,
        subjectId: slot.subjectId,
        sectionId: slot.sectionId,
        status: "conducted",
        submittedAt: null,
        submittedBy: null,
        selfCheckinOpenedAt: openedAt,
      });
    }

    revalidatePath("/faculty/attendance");
    revalidatePath("/faculty/dashboard");
    revalidatePath("/student/attendance");
    revalidatePath("/student/dashboard");
    revalidatePath("/admin/attendance/reports");
    return { success: true };
  } catch (error) {
    console.error("Failed to open self check-in:", error);
    return { success: false, error: "Failed to open self check-in." };
  }
}

const closeSelfCheckinSchema = z.object({
  timetableSlotId: z.string().uuid(),
});

/** Staff closes today's open self check-in window for a slot (if any). */
export async function closeSelfCheckin(
  input: unknown
): Promise<SelfCheckinActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };

  const parsed = closeSelfCheckinSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid self check-in payload." };
  const { timetableSlotId } = parsed.data;

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

  const guardError = await staffSlotGuard(session, slot);
  if (guardError) return { success: false, error: guardError };

  try {
    await db
      .update(attendanceSessions)
      .set({ selfCheckinOpenedAt: null })
      .where(
        and(
          eq(attendanceSessions.timetableSlotId, timetableSlotId),
          eq(attendanceSessions.date, getCollegeNow().date)
        )
      );
    revalidatePath("/faculty/attendance");
    revalidatePath("/faculty/dashboard");
    revalidatePath("/student/attendance");
    revalidatePath("/student/dashboard");
    revalidatePath("/admin/attendance/reports");
    return { success: true };
  } catch (error) {
    console.error("Failed to close self check-in:", error);
    return { success: false, error: "Failed to close self check-in." };
  }
}

const selfCheckInSchema = z.object({
  timetableSlotId: z.string().uuid(),
  descriptor: descriptorSchema,
  location: z
    .object({ lat: z.number(), lng: z.number() })
    .optional(),
});

/**
 * Student self check-in. All checks server-side, in order: role → slot row →
 * active enrollment → open window (absolute-instant math) → geofence (required
 * when campus is configured) → own-descriptor face match → present upsert.
 * studentId always comes from the session, never the payload.
 */
export async function selfCheckIn(
  input: unknown
): Promise<SelfCheckinActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (session.role !== "student") return { success: false, error: "Not authorized." };

  const parsed = selfCheckInSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid self check-in payload." };
  const { timetableSlotId, descriptor, location } = parsed.data;
  const studentId = session.id;

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

  const [enrollment] = await db
    .select({ id: studentEnrollments.id })
    .from(studentEnrollments)
    .where(
      and(
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollments.sectionId, slot.sectionId),
        eq(studentEnrollments.academicYearId, slot.academicYearId),
        eq(studentEnrollments.isActive, true)
      )
    )
    .limit(1);
  if (!enrollment) {
    return { success: false, error: "You are not enrolled in this class." };
  }

  const today = getCollegeNow().date;
  const [attendanceSession] = await db
    .select({
      id: attendanceSessions.id,
      submittedAt: attendanceSessions.submittedAt,
      selfCheckinOpenedAt: attendanceSessions.selfCheckinOpenedAt,
    })
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.timetableSlotId, timetableSlotId),
        eq(attendanceSessions.date, today)
      )
    )
    .limit(1);

  if (attendanceSession?.submittedAt) {
    return {
      success: false,
      error: "Attendance for this class has already been submitted.",
    };
  }

  const config = await getAppConfig();
  const openedAt = attendanceSession?.selfCheckinOpenedAt ?? null;
  // Absolute instants only: openedAt + window vs Date.now().
  if (
    !attendanceSession ||
    !openedAt ||
    Date.now() >= openedAt.getTime() + config.selfCheckinWindowMinutes * 60_000
  ) {
    return { success: false, error: "Self check-in window is closed." };
  }

  const campus = await getCampusSettings();
  if (campus) {
    if (!location) {
      return { success: false, error: "Location is required for self check-in." };
    }
    const distanceMeters = haversineMeters(
      location.lat,
      location.lng,
      campus.latitude,
      campus.longitude
    );
    if (distanceMeters > campus.radiusMeters) {
      return {
        success: false,
        error: `Self check-in can only be done on campus (you are ~${Math.round(distanceMeters)}m from campus, limit ${campus.radiusMeters}m).`,
      };
    }
  }

  const [biometric] = await db
    .select({ descriptor: studentBiometrics.descriptor })
    .from(studentBiometrics)
    .where(eq(studentBiometrics.studentId, studentId))
    .limit(1);
  if (!biometric || !Array.isArray(biometric.descriptor)) {
    return { success: false, error: "No biometric enrolled; contact your faculty." };
  }
  const faceDistance = euclideanDistance(
    descriptor,
    biometric.descriptor as number[]
  );
  if (faceDistance >= config.matchThreshold) {
    return {
      success: false,
      error: "Face did not match. Ask your faculty to mark you present.",
    };
  }

  try {
    // Same merge semantics as saveAttendance: a second check-in upserts
    // harmlessly (unique_attendance_record on (session, student)).
    await db
      .insert(attendanceRecords)
      .values({
        sessionId: attendanceSession.id,
        studentId,
        status: "present",
        recordedBy: null,
        recordedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [attendanceRecords.sessionId, attendanceRecords.studentId],
        set: {
          status: "present",
          recordedBy: null,
          recordedAt: new Date(),
        },
      });
    revalidatePath("/student/attendance");
    revalidatePath("/student/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to save self check-in:", error);
    return { success: false, error: "Failed to save self check-in." };
  }
}
