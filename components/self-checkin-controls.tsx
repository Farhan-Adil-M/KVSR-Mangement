"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { closeSelfCheckin, openSelfCheckin } from "@/lib/actions/attendance";
import { getDeviceLocation } from "@/lib/geolocation";
import { Loader2, ScanFace, Square, Timer } from "lucide-react";

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function SelfCheckinControls({
  timetableSlotId,
  sessionDate,
  selfCheckinOpenedAt,
  selfCheckinWindowMinutes,
}: {
  timetableSlotId: string;
  sessionDate: string;
  selfCheckinOpenedAt: string | null;
  selfCheckinWindowMinutes: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"open" | "close" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const openedMs = selfCheckinOpenedAt ? new Date(selfCheckinOpenedAt).getTime() : null;
  const windowMs = selfCheckinWindowMinutes * 60_000;
  const remainingMs =
    openedMs !== null && now !== null ? openedMs + windowMs - now : null;
  const open = remainingMs !== null && remainingMs > 0;
  const expired = openedMs !== null && remainingMs !== null && remainingMs <= 0;

  const handleOpen = async () => {
    setBusy("open");
    setError(null);
    const location = await getDeviceLocation();
    const res = await openSelfCheckin({
      timetableSlotId,
      sessionDate,
      ...(location ? { location } : {}),
    });
    setBusy(null);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  const handleClose = async () => {
    setBusy("close");
    setError(null);
    const res = await closeSelfCheckin({ timetableSlotId });
    setBusy(null);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-kvsr-ink flex items-center gap-2">
            <ScanFace className="w-4 h-4 text-kvsr-cta" />
            Self check-in
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {open
              ? "Students of this class can scan their own face until the timer ends."
              : expired
              ? "The window has ended. Open it again to restart the timer."
              : `Students scan their own face to mark themselves present — the window stays open for ${selfCheckinWindowMinutes} minutes.`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {open && remainingMs !== null && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[48px] rounded-xl text-sm font-bold tabular-nums ${
                remainingMs < 60_000
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              <Timer className="w-4 h-4" />
              {formatCountdown(remainingMs / 1000)} left
            </span>
          )}
          {open ? (
            <button
              type="button"
              onClick={handleClose}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl border border-kvsr-soft text-sm font-semibold text-kvsr-ink hover:border-kvsr-navy/40 disabled:opacity-50 transition-colors"
            >
              {busy === "close" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Close window
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpen}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[48px] bg-kvsr-navy text-white text-sm font-semibold rounded-xl hover:bg-kvsr-navy/90 disabled:opacity-50 transition-colors"
            >
              {busy === "open" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ScanFace className="w-4 h-4" />
              )}
              {expired ? "Open again" : "Open window"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
