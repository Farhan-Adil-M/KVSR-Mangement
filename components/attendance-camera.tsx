"use client";

import { useRef, useState, useEffect } from "react";
import { FaceCamera, type FaceCameraHandle } from "./face-camera";
import { getSectionBiometrics } from "@/lib/actions/biometrics";
import { saveAttendance } from "@/lib/actions/attendance";
import { getDeviceLocation } from "@/lib/geolocation";
import { Loader2, Check, Users, ScanFace } from "lucide-react";

interface Student {
  id: string;
  fullName: string;
  rollNumber: string;
}

const MATCH_THRESHOLD = 0.5; // face-api euclidean distance; lower = stricter
const SCAN_INTERVAL_MS = 1500;

function distance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function AttendanceCamera({
  students,
  sectionId,
  timetableSlotId,
  sessionDate,
  slotLabel,
}: {
  students: Student[];
  sectionId: string;
  timetableSlotId: string;
  sessionDate: string;
  slotLabel: string;
}) {
  const camRef = useRef<FaceCameraHandle>(null);
  const [status, setStatus] = useState("Starting camera…");
  const [ready, setReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [unknownCount, setUnknownCount] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const bioRef = useRef<{ studentId: string; descriptor: number[] }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanningRef = useRef(false);

  // Fetch enrolled biometrics once the camera is ready, then start live scanning.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setStatus("Fetching enrolled faces…");
      const bioRes = await getSectionBiometrics(sectionId);
      if (cancelled) return;
      if (!bioRes.ok) {
        setStatus(bioRes.error);
        return;
      }
      bioRef.current = bioRes.biometrics;
      startScanning();
    })();
    return () => {
      cancelled = true;
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sectionId]);

  function stopScanning() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    scanningRef.current = false;
    setScanning(false);
  }

  function startScanning() {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    setStatus("Live scanning — faces are marked automatically.");
    intervalRef.current = setInterval(async () => {
      const descriptors = await camRef.current?.capture();
      if (!descriptors || descriptors.length === 0) {
        setStatus("No faces detected. Position students in frame.");
        return;
      }
      const matched = new Set<string>();
      let unknown = 0;
      for (const desc of descriptors) {
        let bestId: string | null = null;
        let bestDist = Infinity;
        for (const b of bioRef.current) {
          const d = distance(desc, b.descriptor);
          if (d < bestDist) {
            bestDist = d;
            bestId = b.studentId;
          }
        }
        if (bestId && bestDist < MATCH_THRESHOLD) matched.add(bestId);
        else unknown += 1;
      }
      setMatchedIds((prev) => {
        const next = new Set(prev);
        matched.forEach((id) => next.add(id));
        return next;
      });
      setSelected((prev) => {
        const next = new Set(prev);
        matched.forEach((id) => next.add(id));
        return next;
      });
      setUnknownCount(unknown);
      setStatus(
        `Live scanning — ${matched.size} recognized this frame` +
          (unknown > 0 ? `, ${unknown} unknown.` : ".")
      );
    }, SCAN_INTERVAL_MS);
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    stopScanning();
    setSubmitting(true);
    setResult(null);
    const records = students.map((s) => ({
      studentId: s.id,
      status: selected.has(s.id) ? ("present" as const) : ("absent" as const),
    }));
    const location = await getDeviceLocation();
    const res = await saveAttendance({
      sessionDate,
      timetableSlotId,
      records,
      ...(location ? { location } : {}),
    });
    setSubmitting(false);
    setResult(
      res.success
        ? { ok: true, text: "Attendance saved successfully." }
        : { ok: false, text: res.error }
    );
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold text-kvsr-ink">{slotLabel}</h3>
            <p className="text-xs text-muted-foreground">
              Camera marks everyone in frame automatically. Review before saving.
            </p>
          </div>
          <span
            className={
              "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold " +
              (scanning
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500")
            }
          >
            <ScanFace className="w-4 h-4" />
            {scanning ? "Live" : "Idle"}
          </span>
        </div>
        <FaceCamera ref={camRef} onStatus={setStatus} onReady={() => setReady(true)} />
        {status && <p className="text-sm text-muted-foreground mt-3">{status}</p>}
      </div>

      {(matchedIds.size > 0 || unknownCount > 0) && (
        <div className="space-y-4">
          {unknownCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              {unknownCount} detected face{unknownCount !== 1 ? "s" : ""} did not match any
              enrolled student. They won&apos;t be marked — add them manually below if needed.
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            Tap to include/exclude · {selected.size} marked present of {students.length}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {students.map((s) => {
              const on = selected.has(s.id);
              const auto = matchedIds.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    on
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-white border-kvsr-soft hover:border-kvsr-navy/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-kvsr-ink truncate">{s.fullName}</span>
                    {on ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-kvsr-soft shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Roll #{s.rollNumber}
                    {auto && <span className="ml-1 text-kvsr-cta font-semibold">· auto</span>}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-3 bg-kvsr-cta text-white text-sm font-semibold rounded-xl hover:bg-kvsr-cta/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Submit Attendance
          </button>
        </div>
      )}

      {result && (
        <p
          className={`text-sm font-medium ${result.ok ? "text-emerald-600" : "text-red-600"}`}
          role="status"
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
