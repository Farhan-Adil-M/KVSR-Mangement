"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, rawSql } from "@/lib/db";
import { faculty, facultyRatings } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

const rateFacultySchema = z.object({
  facultyId: z.string().uuid(),
  subjectId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable(),
});

export type RateFacultyResult =
  | { success: true }
  | { success: false; error: string };

export async function rateFaculty(input: unknown): Promise<RateFacultyResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated." };
  if (session.role !== "student") {
    return { success: false, error: "Only students can rate faculty." };
  }

  const parsed = rateFacultySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid rating payload." };
  const { facultyId, subjectId, rating, comment } = parsed.data;
  const studentId = session.id;

  // Authorization: the student must be actively enrolled (current year) in a
  // section where this faculty is assigned to this subject. The same join
  // yields the section + academic year to stamp on the rating row — never
  // client input.
  const rows = (await rawSql`
    SELECT fa.section_id AS "sectionId", fa.academic_year_id AS "academicYearId"
    FROM faculty_assignments fa
    JOIN student_enrollments se
      ON se.section_id = fa.section_id
      AND se.academic_year_id = fa.academic_year_id
      AND se.is_active = true
    WHERE fa.faculty_id = ${facultyId}
      AND fa.subject_id = ${subjectId}
      AND se.student_id = ${studentId}
      AND fa.academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
    LIMIT 1
  `) as unknown as { sectionId: string; academicYearId: string }[];

  const scope = rows[0];
  if (!scope) {
    return { success: false, error: "You can only rate faculty who teach your class." };
  }

  try {
    await db
      .insert(facultyRatings)
      .values({
        studentId,
        facultyId,
        subjectId,
        sectionId: scope.sectionId,
        academicYearId: scope.academicYearId,
        rating,
        comment: comment ?? null,
      })
      .onConflictDoUpdate({
        target: [
          facultyRatings.studentId,
          facultyRatings.facultyId,
          facultyRatings.subjectId,
          facultyRatings.academicYearId,
        ],
        set: {
          rating,
          comment: comment ?? null,
          sectionId: scope.sectionId,
          updatedAt: new Date(),
        },
      });
    revalidatePath("/student/ratings");
    return { success: true };
  } catch (error) {
    console.error("Failed to save rating:", error);
    return { success: false, error: "Failed to save rating." };
  }
}

export interface MyRatingRow {
  facultyId: string;
  facultyName: string;
  subjectId: string;
  subjectName: string;
  rating: number;
  comment: string | null;
  updatedAt: string;
}

type RawMyRatingRow = {
  facultyId: string;
  facultyName: string;
  subjectId: string;
  subjectName: string;
  rating: number;
  comment: string | null;
  updatedAt: Date | string;
};

/** The student's own ratings (studentId from the session, never the client). */
export async function getMyRatings(): Promise<MyRatingRow[]> {
  const session = await getSession();
  if (!session || session.role !== "student") return [];

  const rows = (await rawSql`
    SELECT fr.faculty_id AS "facultyId", f.full_name AS "facultyName",
           fr.subject_id AS "subjectId", sub.name AS "subjectName",
           fr.rating, fr.comment, fr.updated_at AS "updatedAt"
    FROM faculty_ratings fr
    JOIN faculty f ON f.id = fr.faculty_id
    JOIN subjects sub ON sub.id = fr.subject_id
    WHERE fr.student_id = ${session.id}
    ORDER BY fr.updated_at DESC
  `) as unknown as RawMyRatingRow[];

  return rows.map((r) => ({
    facultyId: r.facultyId,
    facultyName: r.facultyName,
    subjectId: r.subjectId,
    subjectName: r.subjectName,
    rating: Number(r.rating),
    comment: r.comment ?? null,
    updatedAt:
      r.updatedAt instanceof Date
        ? r.updatedAt.toISOString()
        : new Date(String(r.updatedAt)).toISOString(),
  }));
}

export interface RateableFacultyRow {
  facultyId: string;
  facultyName: string;
  subjectId: string;
  subjectName: string;
  myRating: number | null;
  myComment: string | null;
}

/**
 * Distinct faculty+subject pairs assigned to the student's active section for
 * the current year, with the student's existing rating when present.
 */
export async function getRateableFaculty(): Promise<RateableFacultyRow[]> {
  const session = await getSession();
  if (!session || session.role !== "student") return [];

  const rows = (await rawSql`
    SELECT DISTINCT fa.faculty_id AS "facultyId", f.full_name AS "facultyName",
           fa.subject_id AS "subjectId", sub.name AS "subjectName",
           fr.rating AS "myRating", fr.comment AS "myComment"
    FROM faculty_assignments fa
    JOIN student_enrollments se
      ON se.section_id = fa.section_id
      AND se.academic_year_id = fa.academic_year_id
      AND se.is_active = true
    JOIN faculty f ON f.id = fa.faculty_id
    JOIN subjects sub ON sub.id = fa.subject_id
    LEFT JOIN faculty_ratings fr
      ON fr.faculty_id = fa.faculty_id
      AND fr.subject_id = fa.subject_id
      AND fr.student_id = ${session.id}
      AND fr.academic_year_id = fa.academic_year_id
    WHERE se.student_id = ${session.id}
      AND fa.academic_year_id = (SELECT id FROM academic_years WHERE is_current = true)
    ORDER BY "subjectName", "facultyName"
  `) as unknown as RateableFacultyRow[];

  return rows.map((r) => ({
    facultyId: r.facultyId,
    facultyName: r.facultyName,
    subjectId: r.subjectId,
    subjectName: r.subjectName,
    myRating: r.myRating == null ? null : Number(r.myRating),
    myComment: r.myComment ?? null,
  }));
}

export interface FacultyRatingSummary {
  count: number;
  average: number;
}

/** Open read for profile display: aggregate count + average (1dp). */
export async function getFacultyRatingSummary(
  facultyId: string
): Promise<FacultyRatingSummary> {
  if (!z.string().uuid().safeParse(facultyId).success) {
    return { count: 0, average: 0 };
  }
  const rows = (await rawSql`
    SELECT COUNT(*) AS count, COALESCE(AVG(rating), 0) AS average
    FROM faculty_ratings
    WHERE faculty_id = ${facultyId}
  `) as unknown as { count: string | number; average: string | number }[];

  const row = rows[0];
  const count = Number(row?.count ?? 0);
  const average = count > 0 ? Math.round(Number(row?.average ?? 0) * 10) / 10 : 0;
  return { count, average };
}

export interface RatingCommentRow {
  rating: number;
  comment: string | null;
  subjectName: string;
  createdAt: string;
}

export interface RatingSummaryRow {
  facultyId: string;
  facultyName: string;
  departmentName: string | null;
  average: number;
  count: number;
  latestComments: RatingCommentRow[];
}

type RawRatingSummaryRow = {
  facultyId: string;
  facultyName: string;
  departmentName: string | null;
  average: string | number;
  count: string | number;
  commentRating: string | number | null;
  comment: string | null;
  subjectName: string | null;
  commentCreatedAt: Date | string | null;
};

/**
 * Rating summaries for admin (all faculty) or HOD (own department only).
 * Faculty/student/no session → []. Anonymous: no student ids or names are
 * ever selected.
 */
export async function getRatingSummaries(): Promise<RatingSummaryRow[]> {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "hod")) {
    return [];
  }

  let departmentId: string | null = null;
  if (session.role === "hod") {
    const [me] = await db
      .select({ departmentId: faculty.departmentId })
      .from(faculty)
      .where(eq(faculty.id, session.id))
      .limit(1);
    // Fail closed: a HOD without a department sees no ratings, not all of them.
    departmentId = me?.departmentId ?? null;
    if (!departmentId) return [];
  }

  const rows = (
    departmentId
      ? await rawSql`
          SELECT agg.faculty_id AS "facultyId", f.full_name AS "facultyName",
                 d.name AS "departmentName", agg.average, agg.count,
                 c.rating AS "commentRating", c.comment, c.subject_name AS "subjectName",
                 c.created_at AS "commentCreatedAt"
          FROM (
            SELECT faculty_id, ROUND(AVG(rating)::numeric, 1) AS average, COUNT(*) AS count
            FROM faculty_ratings
            GROUP BY faculty_id
          ) agg
          JOIN faculty f ON f.id = agg.faculty_id
          LEFT JOIN departments d ON d.id = f.department_id
          LEFT JOIN LATERAL (
            SELECT fr.rating, fr.comment, fr.created_at, sub.name AS "subject_name"
            FROM faculty_ratings fr
            JOIN subjects sub ON sub.id = fr.subject_id
            WHERE fr.faculty_id = agg.faculty_id
              AND fr.comment IS NOT NULL
              AND btrim(fr.comment) <> ''
            ORDER BY fr.created_at DESC
            LIMIT 3
          ) c ON true
          WHERE f.department_id = ${departmentId}
          ORDER BY agg.average DESC, agg.count DESC, f.full_name
        `
      : await rawSql`
          SELECT agg.faculty_id AS "facultyId", f.full_name AS "facultyName",
                 d.name AS "departmentName", agg.average, agg.count,
                 c.rating AS "commentRating", c.comment, c.subject_name AS "subjectName",
                 c.created_at AS "commentCreatedAt"
          FROM (
            SELECT faculty_id, ROUND(AVG(rating)::numeric, 1) AS average, COUNT(*) AS count
            FROM faculty_ratings
            GROUP BY faculty_id
          ) agg
          JOIN faculty f ON f.id = agg.faculty_id
          LEFT JOIN departments d ON d.id = f.department_id
          LEFT JOIN LATERAL (
            SELECT fr.rating, fr.comment, fr.created_at, sub.name AS "subject_name"
            FROM faculty_ratings fr
            JOIN subjects sub ON sub.id = fr.subject_id
            WHERE fr.faculty_id = agg.faculty_id
              AND fr.comment IS NOT NULL
              AND btrim(fr.comment) <> ''
            ORDER BY fr.created_at DESC
            LIMIT 3
          ) c ON true
          ORDER BY agg.average DESC, agg.count DESC, f.full_name
        `
  ) as unknown as RawRatingSummaryRow[];

  const byFaculty = new Map<string, RatingSummaryRow>();
  for (const r of rows) {
    let summary = byFaculty.get(r.facultyId);
    if (!summary) {
      summary = {
        facultyId: r.facultyId,
        facultyName: r.facultyName,
        departmentName: r.departmentName ?? null,
        average: Number(r.average),
        count: Number(r.count),
        latestComments: [],
      };
      byFaculty.set(r.facultyId, summary);
    }
    if (r.commentRating != null && r.subjectName != null) {
      summary.latestComments.push({
        rating: Number(r.commentRating),
        comment: r.comment ?? null,
        subjectName: r.subjectName,
        createdAt:
          r.commentCreatedAt instanceof Date
            ? r.commentCreatedAt.toISOString()
            : new Date(String(r.commentCreatedAt)).toISOString(),
      });
    }
  }
  return Array.from(byFaculty.values());
}
