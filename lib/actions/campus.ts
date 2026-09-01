import { db } from "@/lib/db";
import { campusSettings } from "@/lib/db/schema";

export interface CampusSettings {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export async function getCampusSettings(): Promise<CampusSettings | null> {
  const [row] = await db
    .select({
      id: campusSettings.id,
      name: campusSettings.name,
      latitude: campusSettings.latitude,
      longitude: campusSettings.longitude,
      radiusMeters: campusSettings.radiusMeters,
    })
    .from(campusSettings)
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radiusMeters: row.radiusMeters,
  };
}

/** Great-circle distance in meters between two lat/lng points. */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Returns true if the point is within the campus radius (or no campus configured). */
export async function isOnCampus(
  lat: number,
  lng: number
): Promise<{ onCampus: boolean; distance: number; radius: number }> {
  const campus = await getCampusSettings();
  if (!campus) return { onCampus: true, distance: 0, radius: 0 };
  const distance = haversineMeters(lat, lng, campus.latitude, campus.longitude);
  return {
    onCampus: distance <= campus.radiusMeters,
    distance: Math.round(distance),
    radius: campus.radiusMeters,
  };
}
