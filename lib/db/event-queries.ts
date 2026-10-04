/**
 * Event queries, role-scoped per the backend authorization rules:
 * admin → all events; hod/faculty → institution-wide + own department;
 * student → audience "students"/"both", institution-wide + their active
 * enrollment department (the same department derivation used by the student
 * notifications query in portal-queries.ts).
 */
import { rawSql } from "./index";

export type EventViewRole = "admin" | "hod" | "faculty" | "student";

export interface EventRow {
  id: string;
  departmentId: string | null;
  departmentName: string | null;
  audience: string;
  title: string;
  description: string | null;
  venue: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  createdByRole: string;
  createdByFacultyId: string | null;
  createdByName: string | null;
  createdAt: string;
}

type RawEventRow = {
  id: string;
  departmentId: string | null;
  departmentName: string | null;
  audience: string;
  title: string;
  description: string | null;
  venue: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  createdByRole: string;
  createdByFacultyId: string | null;
  createdByName: string | null;
  createdAt: Date | string;
};

function normalizeEvent(row: RawEventRow): EventRow {
  return {
    id: row.id,
    departmentId: row.departmentId ?? null,
    departmentName: row.departmentName ?? null,
    audience: row.audience,
    title: row.title,
    description: row.description ?? null,
    venue: row.venue ?? null,
    eventDate: String(row.eventDate),
    startTime: row.startTime != null ? String(row.startTime) : null,
    endTime: row.endTime != null ? String(row.endTime) : null,
    createdByRole: row.createdByRole,
    createdByFacultyId: row.createdByFacultyId ?? null,
    createdByName: row.createdByName ?? null,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(String(row.createdAt)).toISOString(),
  };
}

/** All events the given role may see. The scope id comes from the session, never the client. */
export async function getEventsForRole(
  role: EventViewRole,
  opts: { departmentId?: string | null; studentSectionDeptId?: string | null } = {}
): Promise<EventRow[]> {
  if (role === "admin") {
    const rows = (await rawSql`
      SELECT e.id, e.department_id AS "departmentId", d.name AS "departmentName",
             e.audience, e.title, e.description, e.venue,
             to_char(e.event_date, 'YYYY-MM-DD') AS "eventDate",
             to_char(e.start_time, 'HH24:MI:SS') AS "startTime",
             to_char(e.end_time, 'HH24:MI:SS') AS "endTime",
             e.created_by_role AS "createdByRole",
             e.created_by_faculty_id AS "createdByFacultyId",
             f.full_name AS "createdByName", e.created_at AS "createdAt"
      FROM events e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN faculty f ON f.id = e.created_by_faculty_id
      ORDER BY e.event_date DESC, e.start_time NULLS LAST, e.created_at DESC
    `) as unknown as RawEventRow[];
    return rows.map(normalizeEvent);
  }

  if (role === "hod" || role === "faculty") {
    const departmentId = opts.departmentId ?? null;
    const rows = (
      departmentId
        ? await rawSql`
            SELECT e.id, e.department_id AS "departmentId", d.name AS "departmentName",
                   e.audience, e.title, e.description, e.venue,
                   to_char(e.event_date, 'YYYY-MM-DD') AS "eventDate",
                   to_char(e.start_time, 'HH24:MI:SS') AS "startTime",
                   to_char(e.end_time, 'HH24:MI:SS') AS "endTime",
                   e.created_by_role AS "createdByRole",
                   e.created_by_faculty_id AS "createdByFacultyId",
                   f.full_name AS "createdByName", e.created_at AS "createdAt"
            FROM events e
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN faculty f ON f.id = e.created_by_faculty_id
            WHERE e.department_id IS NULL OR e.department_id = ${departmentId}
            ORDER BY e.event_date DESC, e.start_time NULLS LAST, e.created_at DESC
          `
        : await rawSql`
            SELECT e.id, e.department_id AS "departmentId", d.name AS "departmentName",
                   e.audience, e.title, e.description, e.venue,
                   to_char(e.event_date, 'YYYY-MM-DD') AS "eventDate",
                   to_char(e.start_time, 'HH24:MI:SS') AS "startTime",
                   to_char(e.end_time, 'HH24:MI:SS') AS "endTime",
                   e.created_by_role AS "createdByRole",
                   e.created_by_faculty_id AS "createdByFacultyId",
                   f.full_name AS "createdByName", e.created_at AS "createdAt"
            FROM events e
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN faculty f ON f.id = e.created_by_faculty_id
            WHERE e.department_id IS NULL
            ORDER BY e.event_date DESC, e.start_time NULLS LAST, e.created_at DESC
          `
    ) as unknown as RawEventRow[];
    return rows.map(normalizeEvent);
  }

  if (role === "student") {
    const studentSectionDeptId = opts.studentSectionDeptId ?? null;
    const rows = (
      studentSectionDeptId
        ? await rawSql`
            SELECT e.id, e.department_id AS "departmentId", d.name AS "departmentName",
                   e.audience, e.title, e.description, e.venue,
                   to_char(e.event_date, 'YYYY-MM-DD') AS "eventDate",
                   to_char(e.start_time, 'HH24:MI:SS') AS "startTime",
                   to_char(e.end_time, 'HH24:MI:SS') AS "endTime",
                   e.created_by_role AS "createdByRole",
                   e.created_by_faculty_id AS "createdByFacultyId",
                   f.full_name AS "createdByName", e.created_at AS "createdAt"
            FROM events e
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN faculty f ON f.id = e.created_by_faculty_id
            WHERE e.audience IN ('students', 'both')
              AND (e.department_id IS NULL OR e.department_id = ${studentSectionDeptId})
            ORDER BY e.event_date DESC, e.start_time NULLS LAST, e.created_at DESC
          `
        : await rawSql`
            SELECT e.id, e.department_id AS "departmentId", d.name AS "departmentName",
                   e.audience, e.title, e.description, e.venue,
                   to_char(e.event_date, 'YYYY-MM-DD') AS "eventDate",
                   to_char(e.start_time, 'HH24:MI:SS') AS "startTime",
                   to_char(e.end_time, 'HH24:MI:SS') AS "endTime",
                   e.created_by_role AS "createdByRole",
                   e.created_by_faculty_id AS "createdByFacultyId",
                   f.full_name AS "createdByName", e.created_at AS "createdAt"
            FROM events e
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN faculty f ON f.id = e.created_by_faculty_id
            WHERE e.audience IN ('students', 'both') AND e.department_id IS NULL
            ORDER BY e.event_date DESC, e.start_time NULLS LAST, e.created_at DESC
          `
    ) as unknown as RawEventRow[];
    return rows.map(normalizeEvent);
  }

  return [];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Department of a faculty/HOD row (hod and faculty session ids live here). */
export async function getFacultyDepartmentId(
  facultyId: string
): Promise<string | null> {
  if (!UUID_RE.test(facultyId)) return null;
  const rows = (await rawSql`
    SELECT department_id AS "departmentId"
    FROM faculty
    WHERE id = ${facultyId}
    LIMIT 1
  `) as unknown as { departmentId: string | null }[];
  return rows[0]?.departmentId ?? null;
}

/** Department of the student's active enrollment for the current year (the notifications derivation). */
export async function getStudentEnrollmentDepartmentId(
  studentId: string
): Promise<string | null> {
  if (!UUID_RE.test(studentId)) return null;
  const rows = (await rawSql`
    SELECT p.department_id AS "departmentId"
    FROM student_enrollments se
    JOIN sections sec ON sec.id = se.section_id
    JOIN study_years sy ON sy.id = sec.study_year_id
    JOIN programs p ON p.id = sy.program_id
    WHERE se.student_id = ${studentId} AND se.is_active = true
      AND se.academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
    LIMIT 1
  `) as unknown as { departmentId: string }[];
  return rows[0]?.departmentId ?? null;
}
