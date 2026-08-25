import { db } from "./index";
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
import { eq, and, asc, sql } from "drizzle-orm";

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
    .where(eq(timetableSlots.sectionId, sectionId))
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

export async function getStudentsWithEnrollments(filters?: {
  sectionId?: string;
  year?: string;
  search?: string;
}) {
  const currentYear = await getCurrentAcademicYear();
  if (!currentYear) return [];

  const conditions = [eq(studentEnrollments.academicYearId, currentYear.id)];

  if (filters?.sectionId) {
    conditions.push(eq(studentEnrollments.sectionId, filters.sectionId));
  }

  const query = db
    .select({
      id: students.id,
      rollNumber: students.rollNumber,
      fullName: students.fullName,
      email: students.email,
      phone: students.phone,
      sectionId: sections.id,
      sectionName: sections.name,
      year: studyYears.label,
      yearNumber: studyYears.yearNumber,
    })
    .from(studentEnrollments)
    .innerJoin(students, eq(studentEnrollments.studentId, students.id))
    .innerJoin(sections, eq(studentEnrollments.sectionId, sections.id))
    .innerJoin(studyYears, eq(sections.studyYearId, studyYears.id))
    .where(and(...conditions))
    .orderBy(asc(studyYears.yearNumber), asc(sections.name), asc(students.rollNumber));

  const results = await query;

  if (filters?.year && filters.year !== "all") {
    const filtered = results.filter((r) => r.year === filters.year);
    return applySearch(filtered, filters.search);
  }

  return applySearch(results, filters?.search);
}

function applySearch<T extends { fullName: string | null; rollNumber: string | null }>(
  items: T[],
  search?: string
) {
  if (!search || search.trim() === "") return items;
  const term = search.toLowerCase();
  return items.filter(
    (item) =>
      item.fullName?.toLowerCase().includes(term) ||
      item.rollNumber?.toLowerCase().includes(term)
  );
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

export async function getAttendanceReportBySection(sectionId: string) {
  const currentYear = await getCurrentAcademicYear();
  if (!currentYear) return [];

  return db
    .select({
      studentId: students.id,
      rollNumber: students.rollNumber,
      fullName: students.fullName,
      subject: subjects.name,
      subjectId: subjects.id,
      classesHeld: studentAttendanceSummaries.classesHeld,
      classesAttended: studentAttendanceSummaries.classesAttended,
    })
    .from(studentAttendanceSummaries)
    .innerJoin(students, eq(studentAttendanceSummaries.studentId, students.id))
    .innerJoin(subjects, eq(studentAttendanceSummaries.subjectId, subjects.id))
    .innerJoin(
      studentEnrollments,
      eq(studentEnrollments.studentId, students.id)
    )
    .where(
      and(
        eq(studentEnrollments.sectionId, sectionId),
        eq(studentEnrollments.academicYearId, currentYear.id),
        eq(studentEnrollments.isActive, true)
      )
    )
    .orderBy(asc(students.rollNumber), asc(subjects.name));
}
