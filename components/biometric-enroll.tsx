"use client";

import { useRef, useState } from "react";
import { FaceCamera, type FaceCameraHandle } from "./face-camera";
import { enrollBiometric } from "@/lib/actions/biometrics";
import { Camera, Loader2, Check, ShieldCheck } from "lucide-react";

interface Student {
  id: string;
  fullName: string;
  rollNumber: string;
}

export function BiometricEnroll({ student }: { student: Student }) {
  const camRef = useRef<FaceCameraHandle>(null);
  const [status, setStatus] = useState("");
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [live, setLive] = useState(false);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const handleCapture = async () => {
    setResult(null);
    setDescriptor(null);
    setLive(false);
    setStatus("Capturing… keep the face in frame and blink / turn head.");
    const res = await camRef.current?.captureEnrollment(5);
    if (!res) return;
    if (!res.descriptor) {
      setStatus(res.message ?? "No face detected.");
      return;
    }
    if (!res.live) {
      setStatus(res.message ?? "Liveness failed.");
      return;
    }
    setDescriptor(res.descriptor);
    setLive(true);
    setStatus("Face captured. Confirm consent, then save.");
  };

  const handleSave = async () => {
    if (!descriptor || !consent) return;
    setSaving(true);
    setResult(null);
    const r = await enrollBiometric({ studentId: student.id, descriptor, consent: true });
    setSaving(false);
    setResult(
      r.success ? { ok: true, text: "Biometric enrolled successfully." } : { ok: false, text: r.error }
    );
    if (r.success) {
      setDescriptor(null);
      setLive(false);
      setConsent(false);
      setStatus("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-kvsr-navy/[0.06] flex items-center justify-center text-kvsr-navy font-bold">
          {student.fullName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-kvsr-ink">{student.fullName}</p>
          <p className="text-xs text-muted-foreground">Roll #{student.rollNumber}</p>
        </div>
      </div>

      <FaceCamera ref={camRef} onStatus={setStatus} />

      {status && <p className="text-sm text-muted-foreground">{status}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCapture}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-kvsr-navy text-white text-sm font-semibold rounded-xl hover:bg-kvsr-navy/90 disabled:opacity-50 transition-colors"
        >
          <Camera className="w-4 h-4" />
          Capture Face
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!descriptor || !live || !consent || saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-kvsr-cta text-white text-sm font-semibold rounded-xl hover:bg-kvsr-cta/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save Biometric
        </button>
      </div>

      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={!descriptor || !live}
          className="mt-0.5"
        />
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-kvsr-cta shrink-0" />
          I confirm this student has consented to biometric (face) enrollment for attendance.
        </span>
      </label>

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
