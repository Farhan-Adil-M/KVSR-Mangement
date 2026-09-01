import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  // Default admin
  const existingAdmin = await db
    .select({ id: schema.admins.id })
    .from(schema.admins)
    .where(eq(schema.admins.username, "admin"))
    .limit(1);
  if (existingAdmin.length === 0) {
    await db.insert(schema.admins).values({
      username: "admin",
      passwordHash: "KVSR2026",
      fullName: "Administrator",
    });
    console.log("Created default admin (admin / KVSR2026)");
  } else {
    console.log("Admin already exists");
  }

  // Campus geofence (single row)
  const existingCampus = await db
    .select({ id: schema.campusSettings.id })
    .from(schema.campusSettings)
    .limit(1);
  if (existingCampus.length === 0) {
    await db.insert(schema.campusSettings).values({
      name: "KVSB - Dr. K.V.Subba Reddy School of Business Management",
      latitude: "15.7408548",
      longitude: "78.0075588",
      radiusMeters: 200,
    });
    console.log("Created campus geofence (15.7408548, 78.0075588, r=200m)");
  } else {
    console.log("Campus geofence already exists");
  }
}

import { eq } from "drizzle-orm";

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
