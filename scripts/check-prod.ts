import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
const ping = await sql`SELECT 1 AS ok`;
console.log("connection:", JSON.stringify(ping));

const dups = await sql`
  SELECT student_id, academic_year_id, COUNT(*)::int AS n
  FROM student_enrollments
  WHERE is_active = true
  GROUP BY student_id, academic_year_id
  HAVING COUNT(*) > 1
`;
console.log("duplicate active enrollments:", dups.length);
if (dups.length > 0) console.log(JSON.stringify(dups.slice(0, 5), null, 2));

const counts = await sql`
  SELECT
    (SELECT COUNT(*) FROM students) AS students,
    (SELECT COUNT(*) FROM faculty) AS faculty,
    (SELECT COUNT(*) FROM admins) AS admins,
    (SELECT COUNT(*) FROM timetable_slots) AS slots,
    (SELECT COUNT(*) FROM student_biometrics) AS biometrics
`;
console.log("row counts:", JSON.stringify(counts[0]));

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('app_settings', 'events')
`;
console.log("new tables already present:", JSON.stringify(tables));

const idx = await sql`
  SELECT indexname FROM pg_indexes
  WHERE schemaname = 'public' AND indexname = 'unique_active_enrollment'
`;
console.log("partial index already present:", idx.length > 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
