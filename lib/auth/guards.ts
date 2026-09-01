import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  facultyAssignments,
  studentEnrollments,
  sections,
  studyYears,
  academicYears,
  subjects,
  students,
} from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { getSession, type SessionUser } from "./session";

export type Role = SessionUser["role"];

/** Faculty, HOD and admin are all "staff" with teaching/management powers. */
export function isStaffRole(role: Role): boolean {
  return role === "admin" || role === "hod" || role === "faculty";
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "hod":
      return "/faculty/dashboard";
    case "faculty":
      return "/faculty/dashboard";
    case "student":
      return "/student/dashboard";
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(role: Role): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== role) redirect(homeForRole(session.role));
  return session;
}

export async function requireAdmin() {
  return requireRole("admin");
}

export async function requireHod() {
  const session = await requireSession();
  if (session.role !== "hod" && session.role !== "admin") {
    redirect(homeForRole(session.role));
  }
  return session;
}

export async function requireFaculty() {
  const session = await requireSession();
  if (session.role !== "faculty" && session.role !== "hod") {
    redirect(homeForRole(session.role));
  }
  return session;
}

export async function requireStudent() {
  return requireRole("student");
}

/** Staff (faculty/hod/admin) or a student matching the given id. */
export async function requireStudentSelfOrStaff(studentId: string) {
  const session = await requireSession();
  if (session.role === "student") {
    if (session.id !== studentId) redirect("/student/dashboard");
    return session;
  }
  if (!isStaffRole(session.role)) redirect(homeForRole(session.role));
  return session;
}

export async function getCurrentAcademicYearId(): Promise<string | null> {
  const [year] = await db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(eq(academicYears.isCurrent, true))
    .limit(1);
  return year?.id ?? null;
}

/** All subject+section classes assigned to a faculty member for the current year. */
export async function getFacultyAssignments(facultyId: string) {
  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return [];

  return db
    .select({
      assignmentId: facultyAssignments.id,
      subjectId: subjects.id,
      subjectName: subjects.name,
      isLab: subjects.isLab,
      sectionId: sections.id,
      sectionName: sections.name,
      yearLabel: studyYears.label,
    })
    .from(facultyAssignments)
    .innerJoin(subjects, eq(facultyAssignments.subjectId, subjects.id))
    .innerJoin(sections, eq(facultyAssignments.sectionId, sections.id))
    .innerJoin(studyYears, eq(sections.studyYearId, studyYears.id))
    .where(
      and(
        eq(facultyAssignments.facultyId, facultyId),
        eq(facultyAssignments.academicYearId, yearId)
      )
    )
    .orderBy(asc(studyYears.yearNumber), asc(sections.name), asc(subjects.name));
}

/**
 * Backend authorization check: is this faculty assigned to this subject+section
 * (or to the section for any subject when subjectId is omitted) this year?
 */
export async function isFacultyAssigned(
  facultyId: string,
  sectionId: string,
  subjectId?: string
): Promise<boolean> {
  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return false;

  const conditions = [
    eq(facultyAssignments.facultyId, facultyId),
    eq(facultyAssignments.sectionId, sectionId),
    eq(facultyAssignments.academicYearId, yearId),
  ];
  if (subjectId) conditions.push(eq(facultyAssignments.subjectId, subjectId));

  const [row] = await db
    .select({ id: facultyAssignments.id })
    .from(facultyAssignments)
    .where(and(...conditions))
    .limit(1);

  return !!row;
}

export interface StudentContext {
  studentId: string;
  sectionId: string;
  sectionName: string;
  studyYearId: string;
  yearLabel: string;
  academicYearId: string;
  rollNumber: string;
}

/** The authenticated student's enrollment context for the current year. Null if not enrolled. */
export async function getStudentContext(
  studentId: string
): Promise<StudentContext | null> {
  const yearId = await getCurrentAcademicYearId();
  if (!yearId) return null;

  const [row] = await db
    .select({
      studentId: students.id,
      rollNumber: students.rollNumber,
      sectionId: sections.id,
      sectionName: sections.name,
      studyYearId: studyYears.id,
      yearLabel: studyYears.label,
      academicYearId: academicYears.id,
    })
    .from(studentEnrollments)
    .innerJoin(students, eq(studentEnrollments.studentId, students.id))
    .innerJoin(sections, eq(studentEnrollments.sectionId, sections.id))
    .innerJoin(studyYears, eq(sections.studyYearId, studyYears.id))
    .innerJoin(academicYears, eq(studentEnrollments.academicYearId, academicYears.id))
    .where(
      and(
        eq(studentEnrollments.studentId, studentId),
        eq(studentEnrollments.academicYearId, yearId),
        eq(studentEnrollments.isActive, true)
      )
    )
    .limit(1);

  return row ?? null;
}
