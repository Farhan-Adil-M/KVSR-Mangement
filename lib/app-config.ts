import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Typed app configuration accessor. Server-only: client components receive
 * config values as props from server pages, never import this module.
 */

export interface AppConfig {
  attendanceGoodPct: number;
  attendanceWarnPct: number;
  matchThreshold: number;
  confusionBand: number;
  selfCheckinWindowMinutes: number;
  photoMin: number;
  photoMax: number;
  scanIntervalMs: number;
  identifyScanIntervalMs: number;
  marksGoodPct: number;
  marksWarnPct: number;
  evalWeightAcademic: number;
  evalWeightBehaviour: number;
  evalWeightParticipation: number;
  teachingDays: string[];
  sessionDays: number;
  institutionName: string;
  institutionShortName: string;
  institutionPhone: string;
  institutionEmail: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  attendanceGoodPct: 75,
  attendanceWarnPct: 60,
  matchThreshold: 0.5,
  confusionBand: 0.15,
  selfCheckinWindowMinutes: 10,
  photoMin: 3,
  photoMax: 6,
  scanIntervalMs: 1500,
  identifyScanIntervalMs: 1200,
  marksGoodPct: 60,
  marksWarnPct: 40,
  evalWeightAcademic: 0.5,
  evalWeightBehaviour: 0.2,
  evalWeightParticipation: 0.3,
  teachingDays: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  sessionDays: 7,
  institutionName: "Dr. K.V. Subba Reddy Institute of Technology",
  institutionShortName: "KVSRIT",
  institutionPhone: "+918518200000",
  institutionEmail: "support@kvsrit.edu.in",
};

let cache: { value: AppConfig; at: number } | null = null;
const CACHE_MS = 30_000;

export function invalidateAppConfigCache(): void {
  cache = null;
}

export async function getAppConfig(): Promise<AppConfig> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  try {
    const [row] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.id, 1))
      .limit(1);
    if (!row) {
      cache = { value: APP_CONFIG_DEFAULTS, at: Date.now() };
      return APP_CONFIG_DEFAULTS;
    }
    const value: AppConfig = {
      attendanceGoodPct: row.attendanceGoodPct,
      attendanceWarnPct: row.attendanceWarnPct,
      matchThreshold: row.matchThreshold,
      confusionBand: row.confusionBand,
      selfCheckinWindowMinutes: row.selfCheckinWindowMinutes,
      photoMin: row.photoMin,
      photoMax: row.photoMax,
      scanIntervalMs: row.scanIntervalMs,
      identifyScanIntervalMs: row.identifyScanIntervalMs,
      marksGoodPct: row.marksGoodPct,
      marksWarnPct: row.marksWarnPct,
      evalWeightAcademic: row.evalWeightAcademic,
      evalWeightBehaviour: row.evalWeightBehaviour,
      evalWeightParticipation: row.evalWeightParticipation,
      teachingDays: Array.isArray(row.teachingDays)
        ? (row.teachingDays as string[])
        : APP_CONFIG_DEFAULTS.teachingDays,
      sessionDays: row.sessionDays,
      institutionName: row.institutionName,
      institutionShortName: row.institutionShortName,
      institutionPhone: row.institutionPhone,
      institutionEmail: row.institutionEmail,
    };
    cache = { value, at: Date.now() };
    return value;
  } catch {
    return APP_CONFIG_DEFAULTS;
  }
}
