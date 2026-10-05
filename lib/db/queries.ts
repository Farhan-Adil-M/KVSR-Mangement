import { db, rawSql } from "./index";
import {
  timetableSlots,
  sections,
  studyYears,
  subjects,
  faculty,
  periods,
  academicYears,
  programs,
  students,
  studentEnrollments,
  attendanceSessions,
  attendanceRecords,
  studentAttendanceSummaries,
  departments,
} from "./schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { getAppConfig } from "@/lib/app-config";

export type TimetableSlotWithDetails = {
  id: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  faculty: string | null;
  section: string;
  year: string;
  isLab: boolean;
  labPeriods: number | null;
};

export async function getTimetableForSection(
  sectionId: string
): Promise<TimetableSlotWithDetails[]> {
  const slots = await db
    .select({
      id: timetableSlots.id,
      dayOfWeek: timetableSlots.dayOfWeek,
      periodNumber: periods.periodNumber,
      startTime: periods.startTime,
      endTime: periods.endTime,
      subject: subjects.name,
      faculty: faculty.fullName,
      section: sections.name,
      year: studyYears.label,
      isLab: timetableSlots.isLab,
      labGroupId: timetableSlots.labGroupId,
    })
    .from(timetableSlots)
    .innerJoin(sections, eq(timetableSlots.sectionId, sections.id))
    .innerJoin(studyYears, eq(sections.studyYearId, studyYears.id))
    .innerJoin(subjects, eq(timetableSlots.subjectId, subjects.id))
    .innerJoin(periods, eq(timetableSlots.periodId, periods.id))
    .leftJoin(faculty, eq(timetableSlots.facultyId, faculty.id))
    .innerJoin(
      academicYears,
      eq(timetableSlots.academicYearId, academicYears.id)
    )
    .where(
      and(
        eq(timetableSlots.sectionId, sectionId),
        eq(timetableSlots.isActive, true),
        eq(academicYears.isCurrent, true)
      )
    )
    .orderBy(
      sql`CASE ${timetableSlots.dayOfWeek}
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
      END`,
      asc(periods.periodNumber)
    );

  // Calculate lab periods for each lab slot
  const labGroupPeriods = new Map<string, number>();
  for (const slot of slots) {
    if (slot.labGroupId) {
      const existing = labGroupPeriods.get(slot.labGroupId) || 0;
      labGroupPeriods.set(slot.labGroupId, existing + 1);
    }
  }

  return slots.map((slot) => ({
    id: slot.id,
    dayOfWeek: slot.dayOfWeek,
    periodNumber: slot.periodNumber,
    startTime: slot.startTime,
    endTime: slot.endTime,
    subject: slot.subject,
    faculty: slot.faculty,
    section: slot.section,
    year: slot.year,
    isLab: !!slot.isLab,
    labPeriods: slot.labGroupId ? labGroupPeriods.get(slot.labGroupId) || null : null,
  }));
}

export async function getSections() {
  return db
    .select({
      id: sections.id,
      name: sections.name,
      year: studyYears.label,
      yearNumber: studyYears.yearNumber,
    })
    .from(sections)
    .innerJoin(studyYears, eq(sections.studyYearId, studyYears.id))
    .orderBy(asc(studyYears.yearNumber), asc(sections.name));
}

export async function getCurrentAcademicYear() {
  const [year] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isCurrent, true))
    .limit(1);
  return year;
}

export async function getDashboardStats() {
  const [studentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(students);

  const [facultyCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(faculty);

  const [slotCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(timetableSlots);

  const [periodCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(periods);

  return {
    students: studentCount?.count ?? 0,
    faculty: facultyCount?.count ?? 0,
    slots: slotCount?.count ?? 0,
    periods: periodCount?.count ?? 0,
  };
}

export async function getStudentsBySection(sectionId: string) {
  const currentYear = await getCurrentAcademicYear();
  if (!currentYear) return [];

  return db
    .select({
      id: students.id,
      rollNumber: students.rollNumber,
      fullName: students.fullName,
      enrollmentId: studentEnrollments.id,
    })
    .from(studentEnrollments)
    .innerJoin(students, eq(studentEnrollments.studentId, students.id))
    .where(
      and(
        eq(studentEnrollments.sectionId, sectionId),
        eq(studentEnrollments.academicYearId, currentYear.id),
        eq(studentEnrollments.isActive, true)
      )
    )
    .orderBy(asc(students.rollNumber));
}

export async function getTimetableSlotsForSectionAndDay(
  sectionId: string,
  dayOfWeek: string
) {
  const currentYear = await getCurrentAcademicYear();
  if (!currentYear) return [];

  return db
    .select({
      id: timetableSlots.id,
      dayOfWeek: timetableSlots.dayOfWeek,
      periodNumber: periods.periodNumber,
      startTime: periods.startTime,
      endTime: periods.endTime,
      subject: subjects.name,
      subjectId: subjects.id,
      faculty: faculty.fullName,
      facultyId: faculty.id,
      isLab: timetableSlots.isLab,
    })
    .from(timetableSlots)
    .innerJoin(periods, eq(timetableSlots.periodId, periods.id))
    .innerJoin(subjects, eq(timetableSlots.subjectId, subjects.id))
    .leftJoin(faculty, eq(timetableSlots.facultyId, faculty.id))
    .where(
      and(
        eq(timetableSlots.sectionId, sectionId),
        eq(timetableSlots.academicYearId, currentYear.id),
        eq(timetableSlots.dayOfWeek, dayOfWeek),
        eq(timetableSlots.isActive, true)
      )
    )
    .orderBy(asc(periods.periodNumber));
}

export async function getAttendanceSessionForSlot(
  slotId: string,
  sessionDate: string
) {
  const [session] = await db
    .select()
    .from(attendanceSessions)
    .where(
      and(
        eq(attendanceSessions.timetableSlotId, slotId),
        eq(attendanceSessions.date, sessionDate)
      )
    )
    .limit(1);

  return session;
}

export async function getAttendanceRecordsForSession(sessionId: string) {
  return db
    .select({
      id: attendanceRecords.id,
      studentId: attendanceRecords.studentId,
      status: attendanceRecords.status,
    })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.sessionId, sessionId));
}

export async function getAttendanceSummaryForStudent(studentId: string) {
  return db
    .select({
      subject: subjects.name,
      classesHeld: studentAttendanceSummaries.classesHeld,
      classesAttended: studentAttendanceSummaries.classesAttended,
    })
    .from(studentAttendanceSummaries)
    .innerJoin(subjects, eq(studentAttendanceSummaries.subjectId, subjects.id))
    .where(eq(studentAttendanceSummaries.studentId, studentId));
}

export async function getFacultyList(search?: string) {
  const query = db
    .select({
      id: faculty.id,
      fullName: faculty.fullName,
      email: faculty.email,
      phone: faculty.phone,
      isHod: faculty.isHod,
      department: departments.name,
    })
    .from(faculty)
    .leftJoin(departments, eq(faculty.departmentId, departments.id))
    .where(eq(faculty.isActive, true))
    .orderBy(asc(faculty.fullName));

  const results = await query;

  if (!search || search.trim() === "") return results;

  const term = search.toLowerCase();
  return results.filter(
    (f) =>
      f.fullName?.toLowerCase().includes(term) ||
      f.email?.toLowerCase().includes(term)
  );
}

export async function getSystemConfig() {
  const [deptCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(departments);

  const [programCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(programs);

  const [yearCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(academicYears);

  const [currentYear] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isCurrent, true))
    .limit(1);

  return {
    departments: deptCount?.count ?? 0,
    programs: programCount?.count ?? 0,
    academicYears: yearCount?.count ?? 0,
    currentYear,
  };
}

export async function getDepartmentsWithPrograms() {
  return db
    .select({
      departmentId: departments.id,
      departmentCode: departments.code,
      departmentName: departments.name,
      programId: programs.id,
      programCode: programs.code,
      programName: programs.name,
      durationYears: programs.durationYears,
    })
    .from(departments)
    .leftJoin(programs, eq(programs.departmentId, departments.id))
    .orderBy(asc(departments.code), asc(programs.code));
}

export async function getPeriods() {
  return db
    .select()
    .from(periods)
    .orderBy(asc(periods.periodNumber));
}

export async function getFacultySchedule(facultyId: string) {
  const currentYear = await getCurrentAcademicYear();
  if (!currentYear) return [];

  return db
    .select({
      id: timetableSlots.id,
      dayOfWeek: timetableSlots.dayOfWeek,
      periodNumber: periods.periodNumber,
      startTime: periods.startTime,
      endTime: periods.endTime,
      subject: subjects.name,
      section: sections.name,
      year: studyYears.label,
      isLab: timetableSlots.isLab,
    })
    .from(timetableSlots)
    .innerJoin(periods, eq(timetableSlots.periodId, periods.id))
    .innerJoin(subjects, eq(timetableSlots.subjectId, subjects.id))
    .innerJoin(sections, eq(timetableSlots.sectionId, sections.id))
    .innerJoin(studyYears, eq(sections.studyYearId, studyYears.id))
    .where(
      and(
        eq(timetableSlots.facultyId, facultyId),
        eq(timetableSlots.academicYearId, currentYear.id),
        eq(timetableSlots.isActive, true)
      )
    )
    .orderBy(
      sql`CASE ${timetableSlots.dayOfWeek}
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
      END`,
      asc(periods.periodNumber)
    );
}

export interface AttendanceReportRow {
  studentId: string;
  rollNumber: string;
  fullName: string;
  subjectId: string;
  subject: string;
  classesHeld: number;
  classesAttended: number;
}

/**
 * LIVE per (student, subject) attendance for a section, aggregated from
 * attendance_records ⋈ attendance_sessions (submitted rosters only, current
 * year). Subjects come from the section's active timetable slots (so subjects
 * with zero sessions still appear); students from active enrollments. Every
 * (student, subject) pair appears — 0/0 when there are no records.
 */
export async function getAttendanceReportBySection(
  sectionId: string
): Promise<AttendanceReportRow[]> {
  const rows = (await rawSql`
    WITH current_year AS (
      SELECT id FROM academic_years WHERE is_current = true
    ),
    section_subjects AS (
      SELECT DISTINCT sub.id AS subject_id, sub.name AS subject
      FROM timetable_slots ts
      JOIN subjects sub ON sub.id = ts.subject_id
      WHERE ts.section_id = ${sectionId}
        AND ts.academic_year_id = (SELECT id FROM current_year)
        AND ts.is_active = true
    ),
    section_students AS (
      SELECT st.id AS student_id, st.roll_number, st.full_name
      FROM student_enrollments se
      JOIN students st ON st.id = se.student_id
      WHERE se.section_id = ${sectionId}
        AND se.academic_year_id = (SELECT id FROM current_year)
        AND se.is_active = true
    ),
    subject_held AS (
      SELECT sess.subject_id, COUNT(*) AS held
      FROM attendance_sessions sess
      JOIN timetable_slots ts ON ts.id = sess.timetable_slot_id
        AND ts.academic_year_id = (SELECT id FROM current_year)
      WHERE sess.section_id = ${sectionId}
        AND sess.submitted_at IS NOT NULL
      GROUP BY sess.subject_id
    ),
    subject_attended AS (
      SELECT sess.subject_id, r.student_id, COUNT(*) AS attended
      FROM attendance_sessions sess
      JOIN timetable_slots ts ON ts.id = sess.timetable_slot_id
        AND ts.academic_year_id = (SELECT id FROM current_year)
      JOIN attendance_records r
        ON r.session_id = sess.id AND r.status = 'present'
      WHERE sess.section_id = ${sectionId}
        AND sess.submitted_at IS NOT NULL
      GROUP BY sess.subject_id, r.student_id
    )
    SELECT st.student_id AS "studentId", st.roll_number AS "rollNumber",
           st.full_name AS "fullName",
           sub.subject_id AS "subjectId", sub.subject,
           COALESCE(h.held, 0) AS "classesHeld",
           COALESCE(a.attended, 0) AS "classesAttended"
    FROM section_students st
    CROSS JOIN section_subjects sub
    LEFT JOIN subject_held h ON h.subject_id = sub.subject_id
    LEFT JOIN subject_attended a
      ON a.subject_id = sub.subject_id AND a.student_id = st.student_id
    ORDER BY st.roll_number, sub.subject
  `) as unknown as {
    studentId: string;
    rollNumber: string;
    fullName: string;
    subjectId: string;
    subject: string;
    classesHeld: string | number;
    classesAttended: string | number;
  }[];

  // neon-http returns bigint counts as strings — coerce before arithmetic.
  return rows.map((r) => ({
    studentId: r.studentId,
    rollNumber: r.rollNumber,
    fullName: r.fullName,
    subjectId: r.subjectId,
    subject: r.subject,
    classesHeld: Number(r.classesHeld) || 0,
    classesAttended: Number(r.classesAttended) || 0,
  }));
}

/**
 * Same live aggregation for ONE student: every subject in the section's active
 * timetable with held/attended counts (0 defaults). Empty when the student is
 * not actively enrolled in the section for the current year.
 */
export async function getStudentSubjectAttendance(
  studentId: string,
  sectionId: string
): Promise<AttendanceReportRow[]> {
  const rows = (await rawSql`
    WITH current_year AS (
      SELECT id FROM academic_years WHERE is_current = true
    ),
    section_subjects AS (
      SELECT DISTINCT sub.id AS subject_id, sub.name AS subject
      FROM timetable_slots ts
      JOIN subjects sub ON sub.id = ts.subject_id
      WHERE ts.section_id = ${sectionId}
        AND ts.academic_year_id = (SELECT id FROM current_year)
        AND ts.is_active = true
    ),
    me AS (
      SELECT st.id AS student_id, st.roll_number, st.full_name
      FROM student_enrollments se
      JOIN students st ON st.id = se.student_id
      WHERE se.student_id = ${studentId}
        AND se.section_id = ${sectionId}
        AND se.academic_year_id = (SELECT id FROM current_year)
        AND se.is_active = true
      LIMIT 1
    ),
    subject_held AS (
      SELECT sess.subject_id, COUNT(*) AS held
      FROM attendance_sessions sess
      JOIN timetable_slots ts ON ts.id = sess.timetable_slot_id
        AND ts.academic_year_id = (SELECT id FROM current_year)
      WHERE sess.section_id = ${sectionId}
        AND sess.submitted_at IS NOT NULL
      GROUP BY sess.subject_id
    ),
    subject_attended AS (
      SELECT sess.subject_id, COUNT(*) AS attended
      FROM attendance_sessions sess
      JOIN timetable_slots ts ON ts.id = sess.timetable_slot_id
        AND ts.academic_year_id = (SELECT id FROM current_year)
      JOIN attendance_records r
        ON r.session_id = sess.id AND r.status = 'present'
      WHERE sess.section_id = ${sectionId}
        AND sess.submitted_at IS NOT NULL
        AND r.student_id = ${studentId}
      GROUP BY sess.subject_id
    )
    SELECT me.student_id AS "studentId", me.roll_number AS "rollNumber",
           me.full_name AS "fullName",
           sub.subject_id AS "subjectId", sub.subject,
           COALESCE(h.held, 0) AS "classesHeld",
           COALESCE(a.attended, 0) AS "classesAttended"
    FROM me
    CROSS JOIN section_subjects sub
    LEFT JOIN subject_held h ON h.subject_id = sub.subject_id
    LEFT JOIN subject_attended a ON a.subject_id = sub.subject_id
    ORDER BY sub.subject
  `) as unknown as {
    studentId: string;
    rollNumber: string;
    fullName: string;
    subjectId: string;
    subject: string;
    classesHeld: string | number;
    classesAttended: string | number;
  }[];

  return rows.map((r) => ({
    studentId: r.studentId,
    rollNumber: r.rollNumber,
    fullName: r.fullName,
    subjectId: r.subjectId,
    subject: r.subject,
    classesHeld: Number(r.classesHeld) || 0,
    classesAttended: Number(r.classesAttended) || 0,
  }));
}

export interface OpenSelfCheckin {
  id: string;
  /** ISO instant the window was opened; deadline = openedAt + selfCheckinWindowMinutes. */
  selfCheckinOpenedAt: string;
  slotId: string;
  subject: string;
  startTime: string;
  endTime: string;
}

/** The still-open self check-in window for a section today (excludes expired windows). */
export async function getOpenSelfCheckinForSection(
  sectionId: string,
  date: string
): Promise<OpenSelfCheckin | null> {
  const config = await getAppConfig();
  const cutoff = new Date(Date.now() - config.selfCheckinWindowMinutes * 60_000);
  const rows = (await rawSql`
    SELECT s.id, s.self_checkin_opened_at AS "selfCheckinOpenedAt",
           ts.id AS "slotId", sub.name AS subject,
           p.start_time AS "startTime", p.end_time AS "endTime"
    FROM attendance_sessions s
    JOIN timetable_slots ts ON ts.id = s.timetable_slot_id
    JOIN subjects sub ON sub.id = s.subject_id
    JOIN periods p ON p.id = ts.period_id
    WHERE s.section_id = ${sectionId} AND s.date = ${date}
      AND s.submitted_at IS NULL
      AND s.self_checkin_opened_at IS NOT NULL
      AND s.self_checkin_opened_at > ${cutoff}
    LIMIT 1
  `) as unknown as {
    id: string;
    selfCheckinOpenedAt: Date | string;
    slotId: string;
    subject: string;
    startTime: string;
    endTime: string;
  }[];
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    selfCheckinOpenedAt:
      row.selfCheckinOpenedAt instanceof Date
        ? row.selfCheckinOpenedAt.toISOString()
        : new Date(String(row.selfCheckinOpenedAt)).toISOString(),
    slotId: row.slotId,
    subject: row.subject,
    startTime: String(row.startTime),
    endTime: String(row.endTime),
  };
}

/* ---------------- Admin Setup lists ---------------- */

export interface StudentAdminRow {
  id: string;
  rollNumber: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean | null;
  contactLockedAt: Date | null;
}

export async function getStudentsAdminList(search?: string): Promise<StudentAdminRow[]> {
  const rows = await db
    .select({
      id: students.id,
      rollNumber: students.rollNumber,
      fullName: students.fullName,
      email: students.email,
      phone: students.phone,
      isActive: students.isActive,
      contactLockedAt: students.contactLockedAt,
    })
    .from(students)
    .orderBy(asc(students.rollNumber));

  if (!search || search.trim() === "") return rows;

  const term = search.toLowerCase();
  return rows.filter(
    (s) =>
      s.rollNumber?.toLowerCase().includes(term) ||
      s.fullName?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term)
  );
}

export async function getSectionsFull() {
  return db
    .select({
      id: sections.id,
      name: sections.name,
      studyYearId: studyYears.id,
      year: studyYears.label,
      yearNumber: studyYears.yearNumber,
      programId: programs.id,
      program: programs.name,
      departmentId: programs.departmentId,
      department: departments.name,
      classTeacherId: sections.classTeacherId,
      classTeacher: faculty.fullName,
    })
    .from(sections)
    .innerJoin(studyYears, eq(sections.studyYearId, studyYears.id))
    .innerJoin(programs, eq(studyYears.programId, programs.id))
    .innerJoin(departments, eq(programs.departmentId, departments.id))
    .leftJoin(faculty, eq(sections.classTeacherId, faculty.id))
    .orderBy(asc(departments.name), asc(studyYears.yearNumber), asc(sections.name));
}

export async function getSubjectsList() {
  return db
    .select({
      id: subjects.id,
      name: subjects.name,
      code: subjects.code,
      shortName: subjects.shortName,
      isLab: subjects.isLab,
      isElective: subjects.isElective,
      departmentId: subjects.departmentId,
      department: departments.name,
    })
    .from(subjects)
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .orderBy(asc(subjects.name));
}

export async function getAcademicYearsList() {
  return db
    .select({
      id: academicYears.id,
      name: academicYears.name,
      startDate: academicYears.startDate,
      endDate: academicYears.endDate,
      isCurrent: academicYears.isCurrent,
    })
    .from(academicYears)
    .orderBy(desc(academicYears.startDate));
}

/* ---------------- Admin exams & study years ---------------- */

export interface ExamAdminRow {
  id: string;
  title: string;
  examDate: string;
  startTime: string | null;
  instructions: string | null;
  subjectName: string;
  /** Coalesced to "Year-wide" when the exam has no section. */
  sectionName: string;
  studyYearLabel: string | null;
  academicYearName: string;
  isCurrentYear: boolean;
}

/** All exams for the admin exams page: current year first, then examDate desc. */
export async function getExamsAdmin(): Promise<ExamAdminRow[]> {
  const rows = (await rawSql`
    SELECT e.id, e.title,
           to_char(e.exam_date, 'YYYY-MM-DD') AS "examDate",
           to_char(e.start_time, 'HH24:MI') AS "startTime",
           e.instructions,
           sub.name AS "subjectName",
           COALESCE(sec.name, 'Year-wide') AS "sectionName",
           sy.label AS "studyYearLabel",
           ay.name AS "academicYearName",
           ay.is_current AS "isCurrentYear"
    FROM exams e
    JOIN subjects sub ON sub.id = e.subject_id
    JOIN academic_years ay ON ay.id = e.academic_year_id
    LEFT JOIN sections sec ON sec.id = e.section_id
    LEFT JOIN study_years sy ON sy.id = COALESCE(e.study_year_id, sec.study_year_id)
    ORDER BY ay.is_current DESC, e.exam_date DESC, e.start_time NULLS LAST, e.created_at DESC
  `) as unknown as ExamAdminRow[];

  return rows;
}

export interface StudyYearAdminRow {
  id: string;
  yearNumber: number;
  label: string;
}

export interface ProgramWithStudyYears {
  id: string;
  name: string;
  departmentName: string | null;
  studyYears: StudyYearAdminRow[];
}

/** Programs with their study years, grouped for the admin study-years UI. */
export async function getStudyYearsAdmin(): Promise<ProgramWithStudyYears[]> {
  const programRows = await db
    .select({
      id: programs.id,
      name: programs.name,
      departmentName: departments.name,
    })
    .from(programs)
    .leftJoin(departments, eq(programs.departmentId, departments.id))
    .orderBy(asc(departments.name), asc(programs.name));

  const yearRows = await db
    .select({
      id: studyYears.id,
      programId: studyYears.programId,
      yearNumber: studyYears.yearNumber,
      label: studyYears.label,
    })
    .from(studyYears)
    .orderBy(asc(studyYears.yearNumber), asc(studyYears.label));

  const yearsByProgram = new Map<string, StudyYearAdminRow[]>();
  for (const year of yearRows) {
    const list = yearsByProgram.get(year.programId) ?? [];
    list.push({ id: year.id, yearNumber: year.yearNumber, label: year.label });
    yearsByProgram.set(year.programId, list);
  }

  return programRows.map((program) => ({
    id: program.id,
    name: program.name,
    departmentName: program.departmentName ?? null,
    studyYears: yearsByProgram.get(program.id) ?? [],
  }));
}
