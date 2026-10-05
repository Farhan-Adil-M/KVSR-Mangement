import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const tree = await sql`
    SELECT d.code AS dept, COUNT(DISTINCT p.id) AS programs, COUNT(DISTINCT sy.id) AS years, COUNT(DISTINCT sec.id) AS sections
    FROM departments d
    LEFT JOIN programs p ON p.department_id = d.id
    LEFT JOIN study_years sy ON sy.program_id = p.id
    LEFT JOIN sections sec ON sec.study_year_id = sy.id
    GROUP BY d.id, d.code
    ORDER BY d.code
  `;
  console.log("TREE:", JSON.stringify(tree));
  const campus = await sql`SELECT name, latitude, longitude, radius_meters FROM campus_settings LIMIT 1`;
  console.log("CAMPUS:", JSON.stringify(campus));
  const summaries = await sql`SELECT COUNT(*)::int AS n FROM student_attendance_summaries`;
  console.log("SUMMARIES ROWS:", JSON.stringify(summaries));
  const sessions = await sql`SELECT COUNT(*)::int AS n FROM attendance_sessions WHERE submitted_at IS NOT NULL`;
  console.log("SUBMITTED SESSIONS:", JSON.stringify(sessions));
  const examTypes = await sql`SELECT exam_type, COUNT(*)::int AS n FROM marks GROUP BY exam_type`;
  console.log("MARKS EXAM TYPES:", JSON.stringify(examTypes));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
