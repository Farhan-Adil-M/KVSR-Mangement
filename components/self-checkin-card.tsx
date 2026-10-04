"use client";

import { useEffect, useRef, useState } from "react";
import { FaceCamera, type FaceCameraHandle } from "./face-camera";
import { selfCheckIn } from "@/lib/actions/attendance";
import { getDeviceLocation } from "@/lib/geolocation";
import {
  BadgeCheck,
  Check,
  Loader2,
  ScanFace,
  Timer,
} from "lucide-react";

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function SelfCheckinCard({
  timetableSlotId,
  subject,
  periodLabel,
  openedAt,
  windowMinutes,
}: {
  timetableSlotId: string;
  subject: string;
  periodLabel: string;
  openedAt: string;
  windowMinutes: number;
}) {
  const camRef = useRef<FaceCameraHandle>(null);
  const [now, setNow] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const openedMs = new Date(openedAt).getTime();
  const remainingMs = now !== null ? openedMs + windowMinutes * 60_000 - now : null;
  const remainingSeconds =
    remainingMs !== null ? Math.max(0, remainingMs / 1000) : null;
  const closingSoon = remainingSeconds !== null && remainingSeconds < 60;

  if (remainingMs !== null && remainingMs <= 0) return null;

  const startScan = async () => {
    setError(null);
    setChecking(false);
    const loc = await getDeviceLocation();
    setLocation(loc);
    setScanning(true);
  };

  const handleCheckIn = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await camRef.current?.captureEnrollment(5);
      if (!res || !res.descriptor || !res.live) {
        setError(res?.message ?? "No face detected. Try again.");
        return;
      }
      const server = await selfCheckIn({
        timetableSlotId,
        descriptor: res.descriptor,
        ...(location ? { location } : {}),
      });
      if (server.success) {
        setDone(true);
        setScanning(false);
      } else {
        setError(server.error);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
            <ScanFace className="w-4 h-4" />
            Self check-in open
          </p>
          <h3 className="text-lg font-bold text-kvsr-ink mt-1 truncate">{subject}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{periodLabel}</p>
        </div>
        {remainingSeconds !== null && (
          <div className="text-left sm:text-right shrink-0">
            <div
              className={`text-3xl font-bold tabular-nums ${
                closingSoon ? "text-amber-600" : "text-kvsr-navy"
              }`}
            >
              {formatCountdown(remainingSeconds)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 sm:justify-end mt-0.5">
              <Timer className="w-3.5 h-3.5" />
              {closingSoon ? "closing soon" : "left to check in"}
            </p>
          </div>
        )}
      </div>

      {done ? (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-700">
          <BadgeCheck className="w-4 h-4 shrink-0" />
          Marked present
        </div>
      ) : scanning ? (
        <div className="mt-4 space-y-3">
          <FaceCamera
            ref={camRef}
            onStatus={setCameraStatus}
            onReady={() => setCameraReady(true)}
          />
          {cameraStatus && (
            <p className="text-sm text-muted-foreground">{cameraStatus}</p>
          )}
          {error && (
            <p className="text-sm text-red-600" role="status">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={!cameraReady || checking}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-kvsr-cta text-white text-sm font-semibold rounded-xl hover:bg-kvsr-cta/90 disabled:opacity-50 transition-colors"
          >
            {checking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {checking ? "Checking in…" : "Check in now"}
          </button>
          <button
            type="button"
            onClick={() => {
              setScanning(false);
              setCameraReady(false);
              setChecking(false);
            }}
            className="w-full inline-flex items-center justify-center px-5 py-2.5 min-h-[48px] rounded-xl border border-kvsr-soft text-sm font-semibold text-kvsr-ink hover:border-kvsr-navy/40 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {error && (
            <p className="text-sm text-red-600" role="status">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={startScan}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-kvsr-navy text-white text-sm font-semibold rounded-xl hover:bg-kvsr-navy/90 transition-colors"
          >
            <ScanFace className="w-4 h-4" />
            Scan my face
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Your face is measured on this device — the scan itself is never uploaded.
          </p>
        </div>
      )}
    </div>
  );
}
