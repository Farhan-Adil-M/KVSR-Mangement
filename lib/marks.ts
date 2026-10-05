/**
 * JNTUA R23 maximum marks per exam type. Lives in a pure module (not a
 * "use server" file) so client components can import it for UI hints —
 * Next.js only allows async-function exports from "use server" files.
 * "midterm" and "other" have no default; saveMarks requires an explicit
 * maxMarks for those.
 */
export const MAX_MARKS_BY_EXAM_TYPE = {
  internal: 30,
  external: 70,
  assignment: 5,
} as const;

export type MaxMarksExamType = keyof typeof MAX_MARKS_BY_EXAM_TYPE;

export function defaultMaxMarks(examType: string): number | undefined {
  return (MAX_MARKS_BY_EXAM_TYPE as Record<string, number | undefined>)[examType];
}
