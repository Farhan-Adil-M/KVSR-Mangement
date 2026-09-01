"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campusSettings } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { getCampusSettings } from "./campus";

const updateCampusSettingsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().min(10).max(5000),
});

export type UpdateCampusSettingsResult =
  | { success: true }
  | { success: false; error: string };

/** Admin-only: update (or seed) the single-row campus geofence config. */
export async function updateCampusSettings(
  input: unknown
): Promise<UpdateCampusSettingsResult> {
  await requireAdmin();

  const parsed = updateCampusSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid campus settings payload." };
  }
  const { latitude, longitude, radiusMeters } = parsed.data;

  try {
    const existing = await getCampusSettings();
    if (existing) {
      await db
        .update(campusSettings)
        .set({
          latitude: String(latitude),
          longitude: String(longitude),
          radiusMeters,
          updatedAt: new Date(),
        })
        .where(eq(campusSettings.id, existing.id));
    } else {
      await db.insert(campusSettings).values({
        latitude: String(latitude),
        longitude: String(longitude),
        radiusMeters,
      });
    }
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update campus settings:", error);
    return { success: false, error: "Failed to update campus settings." };
  }
}
