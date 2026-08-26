/**
 * Backfill faculty_assignments from timetable_slots.
 * - Uses COALESCE(slot.faculty_id, lab_group.faculty_id) so lab instructors are included.
 * - Excludes inactive slots; skips rows where both faculty sources are null.
 * - Idempotent: onConflictDoNothing against the unique index.
 * Run once after migration 0001, BEFORE deploying enforcement.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { facultyAssignments } from "../lib/db/schema";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const neonSql = neon(url);
const db = drizzle(neonSql, { schema: { facultyAssignments } });

async function main() {
  const result = await neonSql`
    INSERT INTO faculty_assignments (faculty_id, subject_id, section_id, academic_year_id)
    SELECT DISTINCT
      COALESCE(ts.faculty_id, lg.faculty_id) AS faculty_id,
      ts.subject_id,
      ts.section_id,
      ts.academic_year_id
    FROM timetable_slots ts
    LEFT JOIN lab_groups lg ON ts.lab_group_id = lg.id
    WHERE ts.is_active = true
      AND COALESCE(ts.faculty_id, lg.faculty_id) IS NOT NULL
    ON CONFLICT DO NOTHING
  `;

  console.log("Backfill command executed.");

  const [{ count: total }] = (await neonSql`
    SELECT COUNT(*)::int AS count FROM faculty_assignments
  `) as { count: number }[];
  console.log(`Total faculty_assignments rows: ${total}`);

  const [{ count: withLabs }] = (await neonSql`
    SELECT COUNT(DISTINCT ts.id)::int AS count
    FROM timetable_slots ts
    LEFT JOIN lab_groups lg ON ts.lab_group_id = lg.id
    WHERE ts.is_active = true AND ts.faculty_id IS NULL AND lg.faculty_id IS NOT NULL
  `) as { count: number }[];
  console.log(`Lab-only slots (faculty from lab_groups) covered: ${withLabs}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
