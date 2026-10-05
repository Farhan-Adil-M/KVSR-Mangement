import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const dups = await sql`
    SELECT program_id, year_number, COUNT(*)::int AS n
    FROM study_years
    GROUP BY program_id, year_number
    HAVING COUNT(*) > 1
  `;
  console.log("duplicate program/year pairs:", dups.length);
  if (dups.length > 0) console.log(JSON.stringify(dups));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
