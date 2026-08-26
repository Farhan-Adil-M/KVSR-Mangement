/**
 * Role-scoped queries. Every function takes identity (facultyId / studentId /
 * sectionId) from the SERVER-SIDE session context — never from client input.
 * Attendance is always computed from raw attendance_records (source of truth).
 */
import { rawSql } from "./index";

/* ================= FACULTY ================= */

export interface FacultySlot {
  id: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  subjectId: string;
  sectionId: string;
  section: string;
  year: string;
  isLab: boolean;
}

/** Faculty's own weekly timetable, including lab slots taught via lab_groups. */
export async function getFacultyTimetable(facultyId: string): Promise<FacultySlot[]> {
  const rows = await rawSql`
    SELECT ts.id, ts.day_of_week AS "dayOfWeek", p.period_number AS "periodNumber",
           p.start_time AS "startTime", p.end_time AS "endTime",
           sub.name AS subject, sub.id AS "subjectId",
           sec.id AS "sectionId", sec.name AS section, sy.label AS year,
           COALESCE(ts.is_lab, false) AS "isLab"
    FROM timetable_slots ts
    JOIN periods p ON ts.period_id = p.id
    JOIN subjects sub ON ts.subject_id = sub.id
    JOIN sections sec ON ts.section_id = sec.id
    JOIN study_years sy ON sec.study_year_id = sy.id
    JOIN academic_years ay ON ts.academic_year_id = ay.id AND ay.is_current = true
    WHERE ts.is_active = true
      AND (ts.faculty_id = ${facultyId}
           OR (ts.faculty_id IS NULL AND ts.lab_group_id IN (
                SELECT id FROM lab_groups WHERE faculty_id = ${facultyId})))
    ORDER BY CASE ts.day_of_week
        WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END,
      p.period_number
  `;
  return rows as unknown as FacultySlot[];
}

/** Slots for a given day (for attendance picking), with conducted-session flag. */
export async function getFacultyDaySlots(facultyId: string, day: string) {
  const rows = await rawSql`
    SELECT ts.id, p.period_number AS "periodNumber", p.start_time AS "startTime",
           p.end_time AS "endTime", sub.name AS subject, sub.id AS "subjectId",
           sec.id AS "sectionId", sec.name AS section, sy.label AS year,
           COALESCE(ts.is_lab, false) AS "isLab",
           sess.id AS "sessionId"
    FROM timetable_slots ts
    JOIN periods p ON ts.period_id = p.id
    JOIN subjects sub ON ts.subject_id = sub.id
    JOIN sections sec ON ts.section_id = sec.id
    JOIN study_years sy ON sec.study_year_id = sy.id
    JOIN academic_years ay ON ts.academic_year_id = ay.id AND ay.is_current = true
    LEFT JOIN attendance_sessions sess
      ON sess.timetable_slot_id = ts.id AND sess.date = CURRENT_DATE
    WHERE ts.is_active = true AND ts.day_of_week = ${day}
      AND (ts.faculty_id = ${facultyId}
           OR (ts.faculty_id IS NULL AND ts.lab_group_id IN (
                SELECT id FROM lab_groups WHERE faculty_id = ${facultyId})))
    ORDER BY p.period_number
  `;
  return rows as unknown as (FacultySlot & { sessionId: string | null })[];
}

/** Distinct students across the faculty's assigned sections. */
export async function getFacultyStudents(facultyId: string) {
  const rows = await rawSql`
    SELECT st.id, st.roll_number AS "rollNumber", st.full_name AS "fullName",
           sec.id AS "sectionId", sec.name AS section, sy.label AS year,
           sy.year_number AS "yearNumber"
    FROM faculty_assignments fa
    JOIN sections sec ON fa.section_id = sec.id
    JOIN study_years sy ON sec.study_year_id = sy.id
    JOIN student_enrollments se ON se.section_id = sec.id
      AND se.academic_year_id = fa.academic_year_id AND se.is_active = true
    JOIN students st ON se.student_id = st.id
    JOIN academic_years ay ON fa.academic_year_id = ay.id AND ay.is_current = true
    WHERE fa.faculty_id = ${facultyId}
    GROUP BY st.id, st.roll_number, st.full_name, sec.id, sec.name, sy.label, sy.year_number
    ORDER BY sy.year_number, sec.name, st.roll_number
  `;
  return rows as unknown as {
    id: string;
    rollNumber: string;
    fullName: string;
    sectionId: string;
    section: string;
    year: string;
  }[];
}

/** All evaluations by this faculty for one section, in a single round-trip. */
export async function getFacultySectionEvaluations(
  facultyId: string,
  sectionId: string
) {
  const rows = await rawSql`
    SELECT student_id AS "studentId", academic_performance AS "academicPerformance",
           behaviour, participation, comments
    FROM student_evaluations
    WHERE faculty_id = ${facultyId} AND section_id = ${sectionId}
      AND academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
  `;
  return rows as unknown as {
    studentId: string;
    academicPerformance: number;
    behaviour: number;
    participation: number;
    comments: string | null;
  }[];
}

/** Existing holistic evaluation by this faculty for a student in a section. */
export async function getFacultyEvaluationForStudent(
  facultyId: string,
  studentId: string,
  sectionId: string
) {
  const rows = await rawSql`
    SELECT academic_performance AS "academicPerformance", behaviour,
           participation, comments
    FROM student_evaluations
    WHERE faculty_id = ${facultyId} AND student_id = ${studentId}
      AND section_id = ${sectionId}
      AND academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
    LIMIT 1
  `;
  return (rows[0] as unknown as {
    academicPerformance: number;
    behaviour: number;
    participation: number;
    comments: string | null;
  }) ?? null;
}

/** Assignments created for the faculty's classes (theirs + admin-created for same classes). */
export async function getFacultyAssignmentsFeed(facultyId: string) {
  const rows = await rawSql`
    SELECT a.id, a.title, a.description, a.due_date AS "dueDate", a.created_at AS "createdAt",
           sub.name AS subject, sec.name AS section, sy.label AS year,
           f.full_name AS "createdBy"
    FROM assignments a
    JOIN subjects sub ON a.subject_id = sub.id
    JOIN sections sec ON a.section_id = sec.id
    JOIN study_years sy ON sec.study_year_id = sy.id
    LEFT JOIN faculty f ON a.faculty_id = f.id
    JOIN academic_years ay ON a.academic_year_id = ay.id AND ay.is_current = true
    WHERE a.section_id IN (
      SELECT section_id FROM faculty_assignments
      WHERE faculty_id = ${facultyId}
        AND academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
    )
    ORDER BY a.created_at DESC
  `;
  return rows as unknown as {
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    createdAt: string;
    subject: string;
    section: string;
    year: string;
    createdBy: string | null;
  }[];
}

/* ================= STUDENT ================= */

export interface SubjectAttendance {
  subjectId: string;
  subject: string;
  held: number;
  attended: number;
  percentage: number;
}

/** Own attendance from raw records: per-subject held/attended + overall. */
export async function getStudentAttendance(studentId: string, sectionId: string) {
  const rows = await rawSql`
    SELECT sub.id AS "subjectId", sub.name AS subject,
           COUNT(DISTINCT sess.id) AS held,
           COUNT(DISTINCT CASE WHEN r.status = 'present' THEN sess.id END) AS attended
    FROM attendance_sessions sess
    JOIN timetable_slots ts
      ON sess.timetable_slot_id = ts.id
      AND ts.academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
      AND ts.is_active = true
    JOIN subjects sub ON sess.subject_id = sub.id
    LEFT JOIN attendance_records r
      ON r.session_id = sess.id AND r.student_id = ${studentId}
    WHERE sess.section_id = ${sectionId}
    GROUP BY sub.id, sub.name
    ORDER BY sub.name
  `;

  const subjects = (rows as unknown as {
    subjectId: string;
    subject: string;
    held: number;
    attended: number;
  }[]).map((s) => ({
    ...s,
    // neon-http returns bigint counts as strings — coerce before arithmetic.
    held: Number(s.held),
    attended: Number(s.attended),
    percentage:
      Number(s.held) > 0 ? Math.round((Number(s.attended) / Number(s.held)) * 100) : 0,
  }));

  const totalHeld = subjects.reduce((acc, s) => acc + s.held, 0);
  const totalAttended = subjects.reduce((acc, s) => acc + s.attended, 0);

  return {
    subjects,
    totalHeld,
    totalAttended,
    overallPercentage:
      totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 100) : 0,
  };
}

export async function getStudentMarks(studentId: string) {
  const rows = await rawSql`
    SELECT m.id, m.title, m.exam_type AS "examType",
           m.marks_obtained AS "marksObtained", m.max_marks AS "maxMarks",
           sub.name AS subject, m.updated_at AS "updatedAt"
    FROM marks m
    JOIN subjects sub ON m.subject_id = sub.id
    WHERE m.student_id = ${studentId}
      AND m.academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
    ORDER BY sub.name, m.title
  `;
  return rows as unknown as {
    id: string;
    title: string;
    examType: string;
    marksObtained: string;
    maxMarks: string;
    subject: string;
    updatedAt: string;
  }[];
}

export async function getStudentAssignments(sectionId: string) {
  const rows = await rawSql`
    SELECT a.id, a.title, a.description, a.due_date AS "dueDate",
           sub.name AS subject, f.full_name AS "createdBy"
    FROM assignments a
    JOIN subjects sub ON a.subject_id = sub.id
    LEFT JOIN faculty f ON a.faculty_id = f.id
    WHERE a.section_id = ${sectionId}
      AND a.academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
    ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
  `;
  return rows as unknown as {
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    subject: string;
    createdBy: string | null;
  }[];
}

export async function getStudentExams(sectionId: string, studyYearId: string) {
  const rows = await rawSql`
    SELECT e.id, e.title, e.exam_date AS "examDate", e.start_time AS "startTime",
           e.instructions, sub.name AS subject,
           (e.section_id IS NULL) AS "isYearWide"
    FROM exams e
    JOIN subjects sub ON e.subject_id = sub.id
    WHERE e.academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
      AND (e.section_id = ${sectionId}
           OR (e.section_id IS NULL AND e.study_year_id = ${studyYearId}))
    ORDER BY e.exam_date ASC
  `;
  return rows as unknown as {
    id: string;
    title: string;
    examDate: string;
    startTime: string | null;
    instructions: string | null;
    subject: string;
    isYearWide: boolean;
  }[];
}

/** Subjects for a section + their syllabus units. */
export async function getStudentSyllabus(sectionId: string) {
  const rows = await rawSql`
    SELECT sub.id AS "subjectId", sub.name AS subject,
           u.unit_number AS "unitNumber", u.title AS "unitTitle", u.description AS "unitDescription"
    FROM timetable_slots ts
    JOIN subjects sub ON ts.subject_id = sub.id
    LEFT JOIN syllabus_units u ON u.subject_id = sub.id
    WHERE ts.section_id = ${sectionId} AND ts.is_active = true
      AND ts.academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
    ORDER BY sub.name, u.unit_number
  `;

  const map = new Map<string, { subjectId: string; subject: string; units: { unitNumber: number; title: string; description: string | null }[] }>();
  for (const row of rows as unknown as {
    subjectId: string;
    subject: string;
    unitNumber: number | null;
    unitTitle: string | null;
    unitDescription: string | null;
  }[]) {
    if (!map.has(row.subjectId)) {
      map.set(row.subjectId, { subjectId: row.subjectId, subject: row.subject, units: [] });
    }
    if (row.unitNumber != null) {
      map.get(row.subjectId)!.units.push({
        unitNumber: row.unitNumber,
        title: row.unitTitle ?? "",
        description: row.unitDescription,
      });
    }
  }
  return Array.from(map.values());
}

export async function getStudentNotifications(studentId: string) {
  const rows = await rawSql`
    SELECT id, title, body, is_read AS "isRead", created_at AS "createdAt"
    FROM notifications
    WHERE target_student_id = ${studentId}
       OR (target_role = 'student' AND target_faculty_id IS NULL AND target_student_id IS NULL)
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return rows as unknown as {
    id: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
  }[];
}

export async function getFacultyNotifications(facultyId: string) {
  const rows = await rawSql`
    SELECT id, title, body, is_read AS "isRead", created_at AS "createdAt"
    FROM notifications
    WHERE target_faculty_id = ${facultyId}
       OR (target_role = 'faculty' AND target_faculty_id IS NULL AND target_student_id IS NULL)
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return rows as unknown as {
    id: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
  }[];
}

/* ================= ADMIN ANALYTICS ================= */

export interface StudentAnalyticsRow {
  id: string;
  rollNumber: string;
  fullName: string;
  section: string;
  year: string;
  held: number | null;
  attended: number | null;
  attendancePct: number | null;
  academic: string | null;
  behaviour: string | null;
  participation: string | null;
  evaluators: number | null;
  overallPct: number | null;
}

/**
 * Per-student performance for the current year. Aggregates ALL evaluations
 * (avg across evaluators) — one faculty rating never defines the score.
 * overall = (academic*0.5 + behaviour*0.2 + participation*0.3) / 5 * 100
 */
export async function getStudentAnalytics(): Promise<StudentAnalyticsRow[]> {
  const rows = await rawSql`
    WITH att AS (
      SELECT se.student_id,
             COUNT(DISTINCT sess.id) AS held,
             COUNT(DISTINCT CASE WHEN r.status = 'present' THEN sess.id END) AS attended
      FROM student_enrollments se
      JOIN timetable_slots ts
        ON ts.section_id = se.section_id AND ts.academic_year_id = se.academic_year_id
        AND ts.is_active = true
      JOIN attendance_sessions sess ON sess.timetable_slot_id = ts.id
      LEFT JOIN attendance_records r
        ON r.session_id = sess.id AND r.student_id = se.student_id
      WHERE se.academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
        AND se.is_active = true
      GROUP BY se.student_id
    ),
    eval AS (
      SELECT student_id,
             AVG(academic_performance) AS academic,
             AVG(behaviour) AS behaviour,
             AVG(participation) AS participation,
             COUNT(*) AS evaluators
      FROM student_evaluations
      WHERE academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
      GROUP BY student_id
    )
    SELECT st.id, st.roll_number AS "rollNumber", st.full_name AS "fullName",
           sec.name AS section, sy.label AS year,
           att.held, att.attended,
           CASE WHEN att.held > 0 THEN ROUND(att.attended::numeric * 100 / att.held, 0) ELSE NULL END AS "attendancePct",
           eval.academic, eval.behaviour, eval.participation, eval.evaluators,
           CASE WHEN eval.academic IS NOT NULL
                THEN ROUND(((eval.academic * 0.5 + eval.behaviour * 0.2 + eval.participation * 0.3) / 5) * 100, 0)
                ELSE NULL END AS "overallPct"
    FROM students st
    JOIN student_enrollments se ON se.student_id = st.id
      AND se.academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
      AND se.is_active = true
    JOIN sections sec ON sec.id = se.section_id
    JOIN study_years sy ON sy.id = sec.study_year_id
    LEFT JOIN att ON att.student_id = st.id
    LEFT JOIN eval ON eval.student_id = st.id
    ORDER BY sy.year_number, sec.name, st.roll_number
  `;
  return rows as unknown as StudentAnalyticsRow[];
}

export async function getAllNotifications() {
  const rows = await rawSql`
    SELECT n.id, n.title, n.body, n.target_role AS "targetRole",
           n.created_at AS "createdAt",
           tf.full_name AS "facultyName", ts.full_name AS "studentName"
    FROM notifications n
    LEFT JOIN faculty tf ON n.target_faculty_id = tf.id
    LEFT JOIN students ts ON n.target_student_id = ts.id
    ORDER BY n.created_at DESC
    LIMIT 100
  `;
  return rows as unknown as {
    id: string;
    title: string;
    body: string;
    targetRole: string | null;
    createdAt: string;
    facultyName: string | null;
    studentName: string | null;
  }[];
}
