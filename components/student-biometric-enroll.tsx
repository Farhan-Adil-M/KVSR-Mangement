"use client";

import { useEffect, useRef, useState } from "react";
import { FaceCamera, type FaceCameraHandle } from "@/components/face-camera";
import { enrollOwnBiometric, getMyBiometric } from "@/lib/actions/biometrics";

interface Props {
  studentId: string;
}

export function StudentBiometricEnroll({ studentId }: Props) {
  const cameraRef = useRef<FaceCameraHandle>(null);
  const [status, setStatus] = useState<string>("Starting camera...");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    getMyBiometric(studentId).then((res) => {
      if (res.ok && res.hasBiometric) {
        setExisting(true);
        setDone(true);
        setStatus("Your biometric is already enrolled.");
      }
    });
    return () => {
      cancelled.current = true;
    };
  }, [studentId]);

  useEffect(() => {
    if (done || existing) return;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function attempt() {
      if (cancelled.current || !cameraRef.current) return;
      setStatus("Look at the camera and blink...");
      const result = await cameraRef.current.captureEnrollment(5);
      if (cancelled.current) return;
      if (!result.descriptor || !result.live) {
        setStatus(result.message ?? "Keep your face in frame and blink.");
        timeout = setTimeout(attempt, 800);
        return;
      }
      setStatus("Saving biometric...");
      const save = await enrollOwnBiometric({
        studentId,
        descriptor: result.descriptor,
        consent: true,
      });
      if (cancelled.current) return;
      if (save.success) {
        setDone(true);
        setStatus("Biometric enrolled successfully.");
      } else {
        setError(save.error);
        setStatus(save.error);
      }
    }

    timeout = setTimeout(attempt, 1500);
    return () => {
      if (timeout) clearTimeout(timeout);
      cancelled.current = true;
    };
  }, [done, existing, studentId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <FaceCamera ref={cameraRef} onStatus={setStatus} fullscreen />

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-6">
        <div className="rounded-xl bg-black/60 px-5 py-3 text-center text-white backdrop-blur-sm">
          <p className="text-base font-semibold">
            {done ? "Enrolled" : "Enroll your biometric"}
          </p>
          <p className="text-sm text-white/80">{status}</p>
        </div>

        {!done && !error && (
          <div className="rounded-full bg-white/10 px-5 py-2 text-sm text-white/90 backdrop-blur-sm">
            Follow the prompt and blink naturally
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-600/80 px-5 py-3 text-center text-white backdrop-blur-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
