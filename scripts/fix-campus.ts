import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  // Google Maps place coords for KVSRIT: 15.7410298, 78.0071323 — radius 1.5km
  await sql`
    UPDATE campus_settings
    SET latitude = 15.7410298, longitude = 78.0071323, radius_meters = 1500, updated_at = now()
  `;
  const rows = await sql`SELECT name, latitude, longitude, radius_meters FROM campus_settings`;
  console.log("UPDATED CAMPUS:", JSON.stringify(rows));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
