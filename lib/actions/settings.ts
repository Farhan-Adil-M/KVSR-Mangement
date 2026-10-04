"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/guards";
import { invalidateAppConfigCache } from "@/lib/app-config";

const updateAppSettingsSchema = z
  .object({
    attendanceGoodPct: z.number().int().min(0).max(100),
    attendanceWarnPct: z.number().int().min(0).max(100),
    matchThreshold: z.number().min(0.2).max(0.6),
    confusionBand: z.number().min(0).max(0.4),
    selfCheckinWindowMinutes: z.number().int().min(2).max(120),
    photoMin: z.number().int().min(1).max(10),
    photoMax: z.number().int().min(1).max(20),
    scanIntervalMs: z.number().int().min(500).max(10000),
    identifyScanIntervalMs: z.number().int().min(500).max(10000),
    marksGoodPct: z.number().int().min(0).max(100),
    marksWarnPct: z.number().int().min(0).max(100),
    evalWeightAcademic: z.number().min(0).max(1),
    evalWeightBehaviour: z.number().min(0).max(1),
    evalWeightParticipation: z.number().min(0).max(1),
    teachingDays: z
      .array(
        z.enum([
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ])
      )
      .min(1)
      .max(7),
    sessionDays: z.number().int().min(1).max(31),
    institutionName: z.string().min(1).max(200),
    institutionShortName: z.string().min(1).max(20),
    institutionPhone: z.string().min(1).max(20),
    institutionEmail: z.string().email(),
  })
  .refine((d) => d.attendanceWarnPct <= d.attendanceGoodPct, {
    message: "Attendance warning % must be ≤ good %.",
  })
  .refine((d) => d.marksWarnPct <= d.marksGoodPct, {
    message: "Marks warning % must be ≤ good %.",
  })
  .refine(
    (d) =>
      Math.abs(
        d.evalWeightAcademic + d.evalWeightBehaviour + d.evalWeightParticipation - 1
      ) < 0.001,
    { message: "Evaluation weights must sum to 1." }
  )
  .refine((d) => d.photoMin <= d.photoMax, {
    message: "Minimum photos must be ≤ maximum photos.",
  });

export type UpdateAppSettingsResult =
  | { success: true }
  | { success: false; error: string };

export async function updateAppSettings(
  input: unknown
): Promise<UpdateAppSettingsResult> {
  await requireAdmin();

  const parsed = updateAppSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { success: false, error: issue?.message ?? "Invalid settings payload." };
  }
  const data = parsed.data;

  try {
    await db
      .insert(appSettings)
      .values({ id: 1, ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: { ...data, updatedAt: new Date() },
      });
    invalidateAppConfigCache();
    revalidatePath("/admin/settings");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to update app settings:", error);
    return { success: false, error: "Failed to save settings." };
  }
}
