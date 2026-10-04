"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  averageDescriptors,
  detectDescriptors,
  euclideanDistance,
  loadFaceApi,
} from "@/lib/face-client";
import { getSectionBiometrics, reinforceBiometric } from "@/lib/actions/biometrics";
import { saveAttendance } from "@/lib/actions/attendance";
import { getDeviceLocation } from "@/lib/geolocation";
import {
  MatchResolutionDialog,
  type MatchCandidate,
} from "./match-resolution-dialog";
import { Modal } from "./modal";
import {
  Ban,
  Check,
  CircleHelp,
  ImageUp,
  Loader2,
  RefreshCw,
  ScanFace,
  Search,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";

interface Student {
  id: string;
  fullName: string;
  rollNumber: string;
}

interface DetectedFace {
  id: string;
  photoNumber: number;
  faceNumber: number;
  descriptor: number[];
  status: "confident" | "confused" | "unassigned" | "dismissed";
  studentId: string | null;
  candidates: MatchCandidate[];
  note: string | null;
}

interface ClassifiedDescriptor {
  status: "confident" | "confused" | "unassigned";
  studentId: string | null;
  candidates: MatchCandidate[];
}

const MAX_CANDIDATES = 5;

function classifyDescriptor(
  descriptor: number[],
  biometrics: { studentId: string; descriptor: number[] }[],
  studentById: Map<string, Student>,
  matchThreshold: number,
  confusionBand: number
): ClassifiedDescriptor {
  const scored = biometrics
    .map((b) => ({
      studentId: b.studentId,
      distance: euclideanDistance(descriptor, b.descriptor),
    }))
    .sort((a, b) => a.distance - b.distance);

  const best = scored[0];
  if (!best || best.distance >= matchThreshold) {
    return { status: "unassigned", studentId: null, candidates: [] };
  }

  const second = scored[1];
  if (second && second.distance - best.distance < confusionBand) {
    const limit = best.distance + confusionBand;
    const candidates = scored
      .filter((s) => s.distance <= limit)
      .slice(0, MAX_CANDIDATES)
      .flatMap((s) => {
        const st = studentById.get(s.studentId);
        return st
          ? [
              {
                studentId: s.studentId,
                fullName: st.fullName,
                rollNumber: st.rollNumber,
                distance: s.distance,
              },
            ]
          : [];
      });
    return { status: "confused", studentId: null, candidates };
  }

  return { status: "confident", studentId: best.studentId, candidates: [] };
}

function initials(fullName: string) {
  return fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AttendancePhotoUpload({
  students,
  sectionId,
  timetableSlotId,
  sessionDate,
  slotLabel,
  matchThreshold,
  confusionBand,
  photoMin,
  photoMax,
}: {
  students: Student[];
  sectionId: string;
  timetableSlotId: string;
  sessionDate: string;
  slotLabel: string;
  matchThreshold: number;
  confusionBand: number;
  photoMin: number;
  photoMax: number;
}) {
  const router = useRouter();
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [biometrics, setBiometrics] = useState<
    { studentId: string; descriptor: number[] }[] | null
  >(null);
  const [biometricsError, setBiometricsError] = useState<string | null>(null);
  const [biometricsLoading, setBiometricsLoading] = useState(true);
  const [biometricsReloadKey, setBiometricsReloadKey] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [unreadableCount, setUnreadableCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [autoMatched, setAutoMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogFaceId, setDialogFaceId] = useState<string | null>(null);
  const [rosterPickerFaceId, setRosterPickerFaceId] = useState<string | null>(null);
  const [rosterSearch, setRosterSearch] = useState("");
  const [reinforce, setReinforce] = useState(true);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [reinforceNote, setReinforceNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadFaceApi()
      .then(() => {
        if (!cancelled) setModelReady(true);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setModelError(
            e instanceof Error ? e.message : "Could not load face models."
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBiometricsLoading(true);
    setBiometricsError(null);
    getSectionBiometrics(sectionId)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setBiometrics(
            res.biometrics.filter(
              (b) => Array.isArray(b.descriptor) && b.descriptor.length === 128
            )
          );
          setBiometricsError(null);
        } else {
          setBiometrics(null);
          setBiometricsError(res.error);
        }
        setBiometricsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setBiometrics(null);
        setBiometricsError("Could not load enrolled faces.");
        setBiometricsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sectionId, biometricsReloadKey]);

  const studentById = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const bioStudentIds = useMemo(
    () => new Set((biometrics ?? []).map((b) => b.studentId)),
    [biometrics]
  );

  const confirmedByStudent = useMemo(() => {
    const map = new Map<string, number[][]>();
    for (const f of faces) {
      if (f.status === "confident" && f.studentId) {
        const list = map.get(f.studentId) ?? [];
        list.push(f.descriptor);
        map.set(f.studentId, list);
      }
    }
    return map;
  }, [faces]);

  const needsDecision = faces.filter((f) => f.status === "confused");
  const unassigned = faces.filter((f) => f.status === "unassigned");
  const dismissed = faces.filter((f) => f.status === "dismissed");
  const confidentCount = faces.length - needsDecision.length - unassigned.length - dismissed.length;
  const hasUnresolved = needsDecision.length > 0 || unassigned.length > 0;
  const unenrolledMatchCount = useMemo(
    () =>
      Array.from(confirmedByStudent.keys()).filter((id) => !bioStudentIds.has(id))
        .length,
    [confirmedByStudent, bioStudentIds]
  );

  const addAuto = (studentId: string) => {
    setAutoMatched((prev) => new Set(prev).add(studentId));
    setSelected((prev) => new Set(prev).add(studentId));
  };

  const resolveFace = (
    faceId: string,
    studentId: string | null,
    note: string | null
  ) => {
    setFaces((prev) =>
      prev.map((f) =>
        f.id === faceId
          ? {
              ...f,
              status: studentId ? ("confident" as const) : ("dismissed" as const),
              studentId,
              note,
            }
          : f
      )
    );
  };

  const resolveConfused = (faceId: string, studentId: string) => {
    resolveFace(faceId, studentId, null);
    addAuto(studentId);
    const remaining = faces.filter(
      (f) => f.status === "confused" && f.id !== faceId
    );
    setDialogFaceId(remaining[0]?.id ?? null);
  };

  const dismissFace = (faceId: string, note: string) => {
    resolveFace(faceId, null, note);
    setDialogFaceId(null);
  };

  const leaveUnresolved = () => {
    setFaces((prev) =>
      prev.map((f) =>
        f.status === "unassigned"
          ? { ...f, status: "dismissed" as const, note: "Left unresolved" }
          : f
      )
    );
  };

  const analyze = async (files: File[]) => {
    setAnalyzing(true);
    setPhotoError(null);
    setResult(null);
    setReinforceNote(null);
    setFaces([]);
    setAutoMatched(new Set());
    setSelected(new Set());
    setDialogFaceId(null);
    setRosterPickerFaceId(null);
    try {
      const bitmaps: ImageBitmap[] = [];
      let unreadable = 0;
      for (const file of files) {
        try {
          bitmaps.push(await createImageBitmap(file));
        } catch {
          unreadable += 1;
        }
      }
      if (bitmaps.length === 0) {
        setPhotoCount(0);
        setPhotoError("Could not read any of the selected photos. Try different files.");
        return;
      }
      setProgress(`Scanning photo 1 of ${bitmaps.length}…`);
      const detected: {
        descriptor: number[];
        photoNumber: number;
        faceNumber: number;
      }[] = [];
      for (let p = 0; p < bitmaps.length; p++) {
        setProgress(`Scanning photo ${p + 1} of ${bitmaps.length}…`);
        const descriptors = await detectDescriptors(bitmaps[p]);
        bitmaps[p].close();
        descriptors.forEach((d, i) =>
          detected.push({
            descriptor: d,
            photoNumber: p + 1,
            faceNumber: i + 1,
          })
        );
      }
      setPhotoCount(bitmaps.length);
      setUnreadableCount(unreadable);
      if (detected.length === 0) {
        setFaces([]);
        setProgress(null);
        return;
      }
      const enrolled = biometrics ?? [];
      const classified = detected.map((d, i) => {
        const c = classifyDescriptor(
          d.descriptor,
          enrolled,
          studentById,
          matchThreshold,
          confusionBand
        );
        return {
          id: `face-${i}`,
          photoNumber: d.photoNumber,
          faceNumber: d.faceNumber,
          descriptor: d.descriptor,
          status: c.status,
          studentId: c.studentId,
          candidates: c.candidates,
          note: null,
        } satisfies DetectedFace;
      });
      const confidentIds = new Set(
        classified
          .filter((f) => f.status === "confident" && f.studentId)
          .map((f) => f.studentId as string)
      );
      setAutoMatched(confidentIds);
      setSelected(confidentIds);
      setFaces(classified);
      const firstConfused = classified.find((f) => f.status === "confused");
      if (firstConfused) setDialogFaceId(firstConfused.id);
    } catch (e) {
      setPhotoError(
        e instanceof Error ? e.message : "Could not analyze these photos."
      );
      setFaces([]);
    } finally {
      setAnalyzing(false);
      setProgress(null);
    }
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length === 0) return;
    if (files.length < photoMin || files.length > photoMax) {
      setPhotoError(`Select between ${photoMin} and ${photoMax} photos.`);
      return;
    }
    void analyze(files);
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => {
    setFaces([]);
    setPhotoCount(0);
    setUnreadableCount(0);
    setAutoMatched(new Set());
    setSelected(new Set());
    setResult(null);
    setReinforceNote(null);
    setDialogFaceId(null);
    setRosterPickerFaceId(null);
    setPhotoError(null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);
    setReinforceNote(null);
    const records = students.map((s) => ({
      studentId: s.id,
      status: selected.has(s.id) ? ("present" as const) : ("absent" as const),
    }));
    try {
      const location = await getDeviceLocation();
      const res = await saveAttendance({
        sessionDate,
        timetableSlotId,
        records,
        ...(location ? { location } : {}),
      });
      if (!res.success) {
        setResult({ ok: false, text: res.error });
        return;
      }
      setResult({ ok: true, text: "Attendance saved successfully." });
      router.refresh();
      if (reinforce && confirmedByStudent.size > 0) {
        let improved = 0;
        let failed = 0;
        let skipped = 0;
        for (const [studentId, list] of Array.from(confirmedByStudent.entries())) {
          const hasRow = bioStudentIds.has(studentId);
          if (!hasRow && !consent) {
            skipped += 1;
            continue;
          }
          const averaged = averageDescriptors(list);
          const r = await reinforceBiometric({
            studentId,
            descriptor: averaged,
            ...(hasRow ? {} : { consent: true }),
          });
          if (r.success) improved += 1;
          else failed += 1;
        }
        const parts: string[] = [];
        if (improved > 0) parts.push(`recognition improved for ${improved} student${improved !== 1 ? "s" : ""}`);
        if (failed > 0) parts.push(`${failed} update${failed !== 1 ? "s" : ""} failed`);
        if (skipped > 0)
          parts.push(
            `${skipped} student${skipped !== 1 ? "s" : ""} skipped — no consent for a first-time face save`
          );
        setReinforceNote(parts.join(" · "));
      }
    } catch {
      setResult({ ok: false, text: "Something went wrong. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const dialogFace = faces.find((f) => f.id === dialogFaceId) ?? null;
  const pickerFace = faces.find((f) => f.id === rosterPickerFaceId) ?? null;
  const rosterQuery = rosterSearch.trim().toLowerCase();
  const rosterChoices = rosterQuery
    ? students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(rosterQuery) ||
          s.rollNumber.toLowerCase().includes(rosterQuery)
      )
    : students;

  const inputDisabled = analyzing || !modelReady || biometricsLoading || !!biometricsError;

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold text-kvsr-ink">{slotLabel}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Photos are analyzed on this device — images are never uploaded. Only
              saved face measurements leave the browser.
            </p>
          </div>
          <span
            className={
              "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 " +
              (faces.length > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-700")
            }
          >
            <ScanFace className="w-4 h-4" />
            {analyzing
              ? "Scanning"
              : !modelReady || biometricsLoading
              ? "Loading"
              : faces.length > 0
              ? "Ready"
              : "Idle"}
          </span>
        </div>

        <label
          className={`flex flex-col items-center justify-center gap-2 px-6 py-8 rounded-xl border-2 border-dashed transition-colors ${
            inputDisabled
              ? "border-kvsr-soft bg-kvsr-navy/[0.02] opacity-60"
              : "border-kvsr-soft hover:border-kvsr-cta/60 cursor-pointer"
          }`}
        >
          <ImageUp className="w-6 h-6 text-kvsr-muted" aria-hidden="true" />
          <span className="text-sm font-semibold text-kvsr-ink text-center">
            Choose {photoMin}–{photoMax} photos of the class
          </span>
          <span className="text-xs text-muted-foreground text-center">
            Well-lit group shots work best — the whole class should be visible in at
            least one photo.
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            disabled={inputDisabled}
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="sr-only"
            aria-label={`Choose ${photoMin} to ${photoMax} class photos to mark attendance`}
          />
        </label>

        {(progress || (!modelReady && !modelError) || biometricsLoading) && (
          <p className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            {progress ??
              (!modelReady
                ? "Loading face recognition…"
                : "Loading enrolled faces…")}
          </p>
        )}
        {modelError && (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            <span className="flex-1">{modelError}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[48px] rounded-lg border border-red-300 text-xs font-semibold hover:bg-red-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}
        {biometricsError && (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            <span className="flex-1">{biometricsError}</span>
            <button
              type="button"
              onClick={() => setBiometricsReloadKey((k) => k + 1)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[48px] rounded-lg border border-red-300 text-xs font-semibold hover:bg-red-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}
        {photoError && (
          <p className="mt-3 text-sm text-red-600" role="status">
            {photoError}
          </p>
        )}
        {faces.length === 0 && photoCount > 0 && !analyzing && !photoError && (
          <div className="mt-3">
            <p className="text-sm font-semibold text-kvsr-ink">
              No faces detected in {photoCount} photo{photoCount !== 1 ? "s" : ""}.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Try closer or brighter shots where faces are easier to see.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl border border-kvsr-soft text-sm font-semibold text-kvsr-ink hover:border-kvsr-navy/40 transition-colors"
            >
              <ImageUp className="w-4 h-4" />
              Choose different photos
            </button>
          </div>
        )}
      </div>

      {faces.length > 0 && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700">
                <Check className="w-3.5 h-3.5" />
                {confidentCount} matched
              </span>
              {needsDecision.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700">
                  <TriangleAlert className="w-3.5 h-3.5" />
                  {needsDecision.length} need a decision
                </span>
              )}
              {unassigned.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700">
                  <CircleHelp className="w-3.5 h-3.5" />
                  {unassigned.length} unmatched
                </span>
              )}
              {dismissed.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-kvsr-soft bg-kvsr-navy/[0.03] text-xs font-semibold text-kvsr-muted">
                  <Ban className="w-3.5 h-3.5" />
                  {dismissed.length} not marked
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {photoCount} photo{photoCount !== 1 ? "s" : ""} · {faces.length} face
                {faces.length !== 1 ? "s" : ""} found
              </span>
            </div>
            {unreadableCount > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {unreadableCount} selected file{unreadableCount !== 1 ? "s" : ""}{" "}
                could not be read and {unreadableCount !== 1 ? "were" : "was"} skipped.
              </p>
            )}

            {needsDecision.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-amber-800 mb-2">
                  Similar faces need a decision
                </p>
                <ul className="space-y-2">
                  {needsDecision.map((f) => (
                    <li
                      key={f.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800">
                          Face {f.faceNumber} · photo {f.photoNumber}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {f.candidates.length} enrolled students look alike — decide
                          who this is.
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDialogFaceId(f.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[48px] rounded-lg bg-kvsr-navy text-white text-xs font-semibold hover:bg-kvsr-navy/90 transition-colors"
                        >
                          <Search className="w-3.5 h-3.5" />
                          Decide
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissFace(f.id, "Not present")}
                          className="inline-flex items-center justify-center px-3 py-2 min-h-[48px] rounded-lg border border-amber-300 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                        >
                          Not present
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {unassigned.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-amber-800 flex-1">
                    Unmatched faces
                  </p>
                  <button
                    type="button"
                    onClick={leaveUnresolved}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[48px] rounded-lg border border-amber-300 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    Leave unresolved — mark nobody
                  </button>
                </div>
                <ul className="space-y-2">
                  {unassigned.map((f) => (
                    <li
                      key={f.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800">
                          Face {f.faceNumber} · photo {f.photoNumber}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          No enrolled student matched. Assign it to a student, or leave
                          it unmarked.
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setRosterPickerFaceId(f.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[48px] rounded-lg bg-kvsr-navy text-white text-xs font-semibold hover:bg-kvsr-navy/90 transition-colors"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Assign
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissFace(f.id, "Not present")}
                          className="inline-flex items-center justify-center px-3 py-2 min-h-[48px] rounded-lg border border-amber-300 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                        >
                          Not present
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {dismissed.length > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                {dismissed.length} face{dismissed.length !== 1 ? "s" : ""} won&apos;t
                mark anyone:{" "}
                {dismissed
                  .map((f) => `face ${f.faceNumber} (photo ${f.photoNumber}) — ${f.note}`)
                  .join(", ")}
                .
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            Tap to include/exclude · {selected.size} marked present of {students.length}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {students.map((s) => {
              const on = selected.has(s.id);
              const auto = autoMatched.has(s.id);
              const faceCount = confirmedByStudent.get(s.id)?.length ?? 0;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`text-left p-3 min-h-[48px] rounded-xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold ${
                    on
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-white border-kvsr-soft hover:border-kvsr-navy/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-kvsr-ink truncate">
                      {s.fullName}
                    </span>
                    {on ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-kvsr-soft shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Roll #{s.rollNumber}
                    {auto && (
                      <span className="ml-1 text-kvsr-cta font-semibold">· auto</span>
                    )}
                    {faceCount > 1 && (
                      <span className="ml-1">· matched by {faceCount} faces</span>
                    )}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={reinforce}
                onChange={(e) => setReinforce(e.target.checked)}
                className="mt-0.5"
              />
              <span>Improve future recognition using today&apos;s confirmed matches</span>
            </label>
            {reinforce && unenrolledMatchCount > 0 && (
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="flex items-start gap-1">
                  <ShieldCheck className="w-4 h-4 text-kvsr-cta shrink-0 mt-0.5" />
                  I confirm this student has consented to biometric (face) enrollment
                  for attendance.
                </span>
              </label>
            )}
            {reinforce && unenrolledMatchCount > 0 && !consent && (
              <p className="text-xs text-muted-foreground pl-6">
                {unenrolledMatchCount} matched student
                {unenrolledMatchCount !== 1 ? "s" : ""} ha
                {unenrolledMatchCount === 1 ? "s" : "ve"} no saved face yet — their
                match won&apos;t be saved without this consent.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {hasUnresolved ? (
              <p className="text-sm text-amber-700 flex items-center gap-1.5">
                <TriangleAlert className="w-4 h-4 shrink-0" />
                {unassigned.length > 0
                  ? "Resolve or leave unmatched faces unmarked before saving."
                  : "Decide who the similar faces are before saving."}
              </p>
            ) : (
              <button
                type="button"
                onClick={reset}
                className="text-sm text-muted-foreground hover:text-kvsr-ink transition-colors text-left"
              >
                Start over with different photos
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || hasUnresolved}
              className="inline-flex items-center gap-2 px-5 py-3 min-h-[48px] bg-kvsr-cta text-white text-sm font-semibold rounded-xl hover:bg-kvsr-cta/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Submit Attendance
            </button>
          </div>

          {result && (
            <p
              className={`text-sm font-medium ${
                result.ok ? "text-emerald-600" : "text-red-600"
              }`}
              role="status"
            >
              {result.text}
            </p>
          )}
          {result?.ok && reinforceNote && (
            <p className="text-xs text-muted-foreground" role="status">
              {reinforceNote}
            </p>
          )}
        </div>
      )}

      <MatchResolutionDialog
        open={!!dialogFace}
        candidates={dialogFace?.candidates ?? []}
        matchThreshold={matchThreshold}
        onClose={() => setDialogFaceId(null)}
        onKeep={(studentId) => {
          if (dialogFace) resolveConfused(dialogFace.id, studentId);
        }}
        onNotPresent={() => {
          if (dialogFace) dismissFace(dialogFace.id, "Not present");
        }}
        onUnknown={() => {
          if (dialogFace) {
            setDialogFaceId(null);
            setRosterPickerFaceId(dialogFace.id);
          }
        }}
      />

      <Modal
        open={!!pickerFace}
        onClose={() => setRosterPickerFaceId(null)}
        title="Assign to student"
        description="Who does this face belong to? Pick from the class roster."
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted" />
            <input
              type="text"
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              placeholder="Find a student by name or roll number…"
              aria-label="Search students"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-kvsr-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
            />
          </div>
          {rosterChoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No students match “{rosterSearch}”.
            </p>
          ) : (
            <ul className="max-h-[50vh] overflow-y-auto space-y-1.5">
              {rosterChoices.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (pickerFace) {
                        resolveFace(pickerFace.id, s.id, null);
                        addAuto(s.id);
                      }
                      setRosterPickerFaceId(null);
                      setRosterSearch("");
                    }}
                    className="w-full flex items-center gap-3 p-3 min-h-[48px] rounded-xl border border-kvsr-soft hover:border-kvsr-navy/40 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
                  >
                    <div className="w-10 h-10 rounded-lg bg-kvsr-navy/[0.06] flex items-center justify-center text-kvsr-navy text-sm font-bold shrink-0">
                      {initials(s.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-kvsr-ink truncate text-sm">
                        {s.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Roll #{s.rollNumber}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}
