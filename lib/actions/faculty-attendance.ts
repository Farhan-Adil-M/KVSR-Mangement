"use server";

import { db } from "@/lib/db";
import {
  faculty,
  timetableSlots,
  attendanceSessions,
  subjects,
  sections,
  periods,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getCurrentAcademicYearId } from "@/lib/auth/guards";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface FacultyAttendanceSlot {
  slotId: string;
  subjectName: string;
  sectionName: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  marked: boolean;
  sessionId: string | null;
}

export interface FacultyAttendanceRow {
  facultyId: string;
  facultyName: string;
  departmentId: string | null;
  slots: FacultyAttendanceSlot[];
  expected: number;
  marked: number;
}

/**
 * Faculty attendance is DERIVED: for a given date, each faculty member's
 * timetable slots that day are their "expected" attendance, and a matching
 * attendance_sessions row means it was actually conducted/marked.
 */
export async function getFacultyAttendanceReport(
  date: string
): Promise<FacultyAttendanceRow[]> {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "admin" && session.role !== "hod" && session.role !== "faculty")
  )
    return [];

  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return [];

  const dayOfWeek = DAYS[new Date(date + "T00:00:00").getDay()];

  // Scope: HOD sees only their department; admin sees everyone.
  let facultyRows = await db
    .select({
      id: faculty.id,
      fullName: faculty.fullName,
      departmentId: faculty.departmentId,
    })
    .from(faculty)
    .where(eq(faculty.isActive, true));

  if (session.role === "hod") {
    const [me] = await db
      .select({ departmentId: faculty.departmentId })
      .from(faculty)
      .where(eq(faculty.id, session.id))
      .limit(1);
    if (me?.departmentId) {
      facultyRows = facultyRows.filter((f) => f.departmentId === me.departmentId);
    }
  } else if (session.role === "faculty") {
    // A regular faculty member only sees their own derived attendance.
    facultyRows = facultyRows.filter((f) => f.id === session.id);
  }

  if (facultyRows.length === 0) return [];

  const facultyIds = facultyRows.map((f) => f.id);

  const slots = await db
    .select({
      slotId: timetableSlots.id,
      facultyId: timetableSlots.facultyId,
      subjectName: subjects.name,
      sectionName: sections.name,
      periodNumber: periods.periodNumber,
      startTime: periods.startTime,
      endTime: periods.endTime,
      sessionId: attendanceSessions.id,
    })
    .from(timetableSlots)
    .innerJoin(subjects, eq(timetableSlots.subjectId, subjects.id))
    .innerJoin(sections, eq(timetableSlots.sectionId, sections.id))
    .innerJoin(periods, eq(timetableSlots.periodId, periods.id))
    .leftJoin(
      attendanceSessions,
      and(
        eq(attendanceSessions.timetableSlotId, timetableSlots.id),
        eq(attendanceSessions.date, date)
      )
    )
    .where(
      and(
        eq(timetableSlots.academicYearId, yearId),
        eq(timetableSlots.dayOfWeek, dayOfWeek),
        eq(timetableSlots.isActive, true),
        inArray(timetableSlots.facultyId, facultyIds)
      )
    )
    .orderBy(periods.periodNumber);

  const byFaculty = new Map<string, FacultyAttendanceRow>();
  for (const f of facultyRows) {
    byFaculty.set(f.id, {
      facultyId: f.id,
      facultyName: f.fullName,
      departmentId: f.departmentId,
      slots: [],
      expected: 0,
      marked: 0,
    });
  }

  for (const s of slots) {
    if (!s.facultyId) continue;
    const row = byFaculty.get(s.facultyId);
    if (!row) continue;
    const marked = !!s.sessionId;
    row.slots.push({
      slotId: s.slotId,
      subjectName: s.subjectName,
      sectionName: s.sectionName,
      periodNumber: s.periodNumber,
      startTime: String(s.startTime),
      endTime: String(s.endTime),
      marked,
      sessionId: s.sessionId ?? null,
    });
    row.expected += 1;
    if (marked) row.marked += 1;
  }

  return Array.from(byFaculty.values());
}
