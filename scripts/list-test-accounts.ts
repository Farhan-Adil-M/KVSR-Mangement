import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const admins = await sql`
    SELECT username, "password_hash" AS password FROM admins LIMIT 3
  `;
  console.log("ADMIN ACCOUNTS:", JSON.stringify(admins, null, 2));
  const facultySample = await sql`
    SELECT username, is_hod AS "isHod", department_id IS NOT NULL AS "hasDept"
    FROM faculty WHERE username IS NOT NULL AND is_active = true LIMIT 5
  `;
  console.log("FACULTY USERNAMES (sample):", JSON.stringify(facultySample, null, 2));
  const studentSample = await sql`
    SELECT roll_number FROM students WHERE is_active = true ORDER BY roll_number LIMIT 3
  `;
  console.log("STUDENT ROLL NUMBERS (sample):", JSON.stringify(studentSample, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
