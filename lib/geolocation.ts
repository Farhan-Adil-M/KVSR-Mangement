/**
 * Best-effort device location for client components. Resolves to null when
 * geolocation is unavailable or the user denies permission (so callers can
 * decide whether to proceed without the on-campus gate).
 */
export async function getDeviceLocation(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}
