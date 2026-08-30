"use client";

import { useRef, useState } from "react";
import { FaceCamera, type FaceCameraHandle } from "./face-camera";
import { getSectionBiometrics } from "@/lib/actions/biometrics";
import { saveAttendance } from "@/lib/actions/attendance";
import { Loader2, Check, ScanFace, Users } from "lucide-react";

interface Student {
  id: string;
  fullName: string;
  rollNumber: string;
}

const MATCH_THRESHOLD = 0.5; // face-api euclidean distance; lower = stricter

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
  const [status, setStatus] = useState("");
  const [scanning, setScanning] = useState(false);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [unknownCount, setUnknownCount] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const handleScan = async () => {
    setResult(null);
    setScanning(true);
    setStatus("Fetching enrolled faces…");
    const bioRes = await getSectionBiometrics(sectionId);
    if (!bioRes.ok) {
      setStatus(bioRes.error);
      setScanning(false);
      return;
    }
    setStatus("Detecting faces in frame…");
    const descriptors = await camRef.current?.capture();
    if (!descriptors || descriptors.length === 0) {
      setStatus("No faces detected. Make sure faces are visible and well-lit.");
      setScanning(false);
      return;
    }

    const matched = new Set<string>();
    let unknown = 0;
    for (const desc of descriptors) {
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const b of bioRes.biometrics) {
        const d = distance(desc, b.descriptor);
        if (d < bestDist) {
          bestDist = d;
          bestId = b.studentId;
        }
      }
      if (bestId && bestDist < MATCH_THRESHOLD) matched.add(bestId);
      else unknown += 1;
    }

    setMatchedIds(matched);
    setSelected(new Set(matched));
    setUnknownCount(unknown);
    setScanning(false);
    setStatus(
      `Recognized ${matched.size} student${matched.size !== 1 ? "s" : ""}` +
        (unknown > 0 ? `, ${unknown} unknown face${unknown !== 1 ? "s" : ""}.` : ".") +
        " Review and confirm below."
    );
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);
    const records = students.map((s) => ({
      studentId: s.id,
      status: selected.has(s.id) ? ("present" as const) : ("absent" as const),
    }));
    const res = await saveAttendance({ sessionDate, timetableSlotId, records });
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
              Camera marks everyone in frame at once. Review before saving.
            </p>
          </div>
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-kvsr-navy text-white text-sm font-semibold rounded-xl hover:bg-kvsr-navy/90 disabled:opacity-50 transition-colors"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanFace className="w-4 h-4" />}
            {scanning ? "Scanning…" : "Scan Faces"}
          </button>
        </div>
        <FaceCamera ref={camRef} onStatus={setStatus} />
        {status && <p className="text-sm text-muted-foreground mt-3">{status}</p>}
      </div>

      {matchedIds.size > 0 || unknownCount > 0 ? (
        <div className="space-y-4">
          {unknownCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              {unknownCount} detected face{unknownCount !== 1 ? "s" : ""} did not match any enrolled
              student. They won&apos;t be marked — add them manually below if needed.
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
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Submit Attendance
          </button>
        </div>
      ) : null}

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
