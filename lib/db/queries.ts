import { db } from "./index";
import {
  timetableSlots,
  sections,
  studyYears,
  subjects,
  faculty,
  periods,
  academicYears,
} from "./schema";
import { eq, asc, sql } from "drizzle-orm";

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
