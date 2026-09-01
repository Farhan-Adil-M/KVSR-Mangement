"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import type * as FaceApi from "@vladmandic/face-api";
import { SwitchCamera } from "lucide-react";

export interface FaceCameraHandle {
  /** Descriptors (128-d) of every face currently in frame. */
  capture: () => Promise<number[][]>;
  /** Averaged descriptor across several frames + a basic liveness signal. */
  captureEnrollment: (
    frames?: number
  ) => Promise<{ descriptor: number[] | null; live: boolean; message?: string }>;
}

interface Props {
  onStatus?: (msg: string) => void;
  width?: number;
  height?: number;
  fullscreen?: boolean;
  onReady?: () => void;
}

const MODEL_URL = "/models";

export const FaceCamera = forwardRef<FaceCameraHandle, Props>(function FaceCamera(
  { onStatus, width = 640, height = 480, fullscreen, onReady },
  ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceapiRef = useRef<typeof FaceApi | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Keep latest callbacks in refs so parent re-renders NEVER restart the
  // camera stream (inline callbacks in effect deps caused the flicker).
  const onStatusRef = useRef(onStatus);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onStatusRef.current = onStatus;
    onReadyRef.current = onReady;
  });

  // Load face-api models once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        onStatusRef.current?.("Loading face models…");
        const faceapi = await import("@vladmandic/face-api");
        if (cancelled) return;
        faceapiRef.current = faceapi;
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load face models.";
        setError(msg);
        onStatusRef.current?.(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Start/restart the camera ONLY when facing mode or size changes.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width, height },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setReady(true);
        onReadyRef.current?.();
        onStatusRef.current?.(
          `Camera ready (${facingMode === "user" ? "front" : "back"}) — position faces in frame.`
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not start camera.";
        setError(msg);
        onStatusRef.current?.(msg);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, width, height]);

  const switchCamera = () => {
    setFacingMode((m) => (m === "user" ? "environment" : "user"));
  };

  const detect = async (withDescriptor: boolean) => {
    const faceapi = faceapiRef.current;
    const video = videoRef.current;
    if (!faceapi || !video) return [];
    const opts = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5,
    });
    if (withDescriptor) {
      return faceapi
        .detectAllFaces(video, opts)
        .withFaceLandmarks()
        .withFaceDescriptors();
    }
    return faceapi.detectAllFaces(video, opts);
  };

  useImperativeHandle(ref, () => ({
    capture: async () => {
      const dets = (await detect(true)) as Array<{ descriptor: Float32Array }>;
      return dets.map((d) => Array.from(d.descriptor));
    },
    captureEnrollment: async (frames = 5) => {
      const video = videoRef.current;
      if (!faceapiRef.current || !video)
        return { descriptor: null, live: false, message: "Camera not ready." };
      const descs: number[][] = [];
      const centers: { x: number; y: number }[] = [];
      let minEar = 1;
      for (let i = 0; i < frames; i++) {
        const dets = (await detect(true)) as Array<{
          descriptor: Float32Array;
          detection: { box: { x: number; y: number; width: number; height: number } };
          landmarks: { getLeftEye(): { x: number; y: number }[]; getRightEye(): { x: number; y: number }[] };
        }>;
        if (dets.length > 0) {
          const d = dets[0];
          descs.push(Array.from(d.descriptor));
          const b = d.detection.box;
          centers.push({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
          const ear = eyeAspectRatio(d.landmarks.getLeftEye(), d.landmarks.getRightEye());
          if (ear < minEar) minEar = ear;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      if (descs.length === 0)
        return { descriptor: null, live: false, message: "No face detected. Try again." };
      // Liveness: require either a detected blink (eye closes) or clear head movement.
      const moved =
        centers.length >= 2
          ? Math.hypot(
              centers[centers.length - 1].x - centers[0].x,
              centers[centers.length - 1].y - centers[0].y
            )
          : 0;
      const live = minEar < 0.22 || moved > 12;
      const len = descs[0].length;
      const avg = new Array(len).fill(0);
      descs.forEach((d) => d.forEach((v, i) => (avg[i] += v)));
      const descriptor = avg.map((v) => v / descs.length);
      return {
        descriptor,
        live,
        message: live
          ? undefined
          : "Liveness check failed — please blink or turn your head, then retry.",
      };
    },
  }));

  return (
    <div
      className={
        fullscreen
          ? "absolute inset-0 overflow-hidden bg-black"
          : "relative overflow-hidden rounded-2xl bg-black aspect-video"
      }
    >
      <video
        ref={videoRef}
        width={fullscreen ? undefined : width}
        height={fullscreen ? undefined : height}
        className="h-full w-full object-cover"
        muted
        playsInline
      />

      <button
        type="button"
        onClick={switchCamera}
        aria-label="Switch camera"
        title="Switch front / back camera"
        className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/50 text-white text-xs font-semibold backdrop-blur-sm hover:bg-black/70 transition-colors"
      >
        <SwitchCamera className="w-4 h-4" />
        {facingMode === "user" ? "Front" : "Back"}
      </button>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white/80">
          {error ?? "Starting camera…"}
        </div>
      )}
    </div>
  );
});

/** Eye Aspect Ratio from face-api 68-point landmarks (left + right eye point arrays). */
function eyeAspectRatio(
  left: { x: number; y: number }[],
  right: { x: number; y: number }[]
): number {
  const ear = (eye: { x: number; y: number }[]) => {
    const d = (a: number, b: number) => Math.hypot(eye[a].x - eye[b].x, eye[a].y - eye[b].y);
    const v = (d(1, 5) + d(2, 4)) / (2 * d(0, 3));
    return v;
  };
  return Math.min(ear(left), ear(right));
}
