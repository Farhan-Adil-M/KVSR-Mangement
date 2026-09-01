"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { BiometricEnroll } from "@/components/biometric-enroll";
import { saveEvaluation } from "@/lib/actions/evaluations";
import { Fingerprint, Star, Mail, Phone, Users } from "lucide-react";

export interface HubStudent {
  id: string;
  fullName: string;
  rollNumber: string;
  year: string;
  section: string;
  sectionId: string;
  email?: string | null;
  phone?: string | null;
}

export interface EvaluationValues {
  academicPerformance: number;
  behaviour: number;
  participation: number;
  comments: string | null;
}

const SCALE = [
  { value: 1, label: "Very Poor" },
  { value: 2, label: "Below Avg" },
  { value: 3, label: "Average" },
  { value: 4, label: "Good" },
  { value: 5, label: "Excellent" },
];

const CATEGORIES = [
  { key: "academicPerformance", label: "Academic Performance" },
  { key: "behaviour", label: "Behaviour" },
  { key: "participation", label: "Class Participation" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function FacultyStudentHub({
  students,
  sectionId,
  biometricEnrolledIds,
  evaluations,
}: {
  students: HubStudent[];
  sectionId: string | null;
  biometricEnrolledIds: string[];
  evaluations: Record<string, EvaluationValues>;
}) {
  const router = useRouter();
  const [activeEnroll, setActiveEnroll] = useState<HubStudent | null>(null);
  const [activeEvaluate, setActiveEvaluate] = useState<HubStudent | null>(null);

  const [values, setValues] = useState<Record<CategoryKey, number>>({
    academicPerformance: 0,
    behaviour: 0,
    participation: 0,
  });
  const [comments, setComments] = useState("");
  const [evalMessage, setEvalMessage] = useState<string | null>(null);
  const [evalPending, setEvalPending] = useState(false);

  const enrolledSet = new Set(biometricEnrolledIds);

  const openEvaluate = (student: HubStudent) => {
    const existing = evaluations[student.id];
    setValues({
      academicPerformance: existing?.academicPerformance ?? 0,
      behaviour: existing?.behaviour ?? 0,
      participation: existing?.participation ?? 0,
    });
    setComments(existing?.comments ?? "");
    setEvalMessage(null);
    setActiveEvaluate(student);
  };

  const handleEvaluateSave = () => {
    if (!activeEvaluate || !sectionId) return;
    setEvalMessage(null);
    if (CATEGORIES.some((c) => values[c.key] === 0)) {
      setEvalMessage("Rate all three categories first.");
      return;
    }
    setEvalPending(true);
    void (async () => {
      try {
        const res = await saveEvaluation({
          studentId: activeEvaluate.id,
          sectionId,
          ...values,
          comments: comments.trim() || null,
        });
        if (res.success) {
          setActiveEvaluate(null);
          router.refresh();
        } else {
          setEvalMessage(res.error);
        }
      } finally {
        setEvalPending(false);
      }
    })();
  };

  if (!sectionId) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white border border-kvsr-soft shadow-sm">
        <Users className="w-8 h-8 text-kvsr-muted mx-auto mb-3" />
        <p className="text-muted-foreground">Select a class above to view its students.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        {students.length} student{students.length !== 1 ? "s" : ""}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {students.map((s) => {
          const hasBio = enrolledSet.has(s.id);
          const hasEval = !!evaluations[s.id];
          return (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-kvsr-navy/[0.06] text-kvsr-navy text-sm font-bold shrink-0">
                    {initials(s.fullName)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-kvsr-ink leading-tight truncate">
                      {s.fullName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Roll #{s.rollNumber}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full bg-kvsr-navy/[0.06] text-kvsr-navy text-xs font-semibold shrink-0">
                  {s.year}-{s.section}
                </span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-kvsr-soft mb-3">
                {s.email && (
                  <a
                    href={`mailto:${s.email}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-kvsr-cta transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </a>
                )}
                {s.phone && (
                  <a
                    href={`tel:${s.phone}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-kvsr-cta transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{s.phone}</span>
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    hasBio
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-kvsr-navy/[0.06] text-slate-700 border border-kvsr-soft"
                  }`}
                >
                  <Fingerprint className="w-3 h-3" />
                  {hasBio ? "Biometric set" : "No biometric"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    hasEval
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-kvsr-navy/[0.06] text-slate-700 border border-kvsr-soft"
                  }`}
                >
                  <Star className="w-3 h-3" />
                  {hasEval ? "Evaluated" : "Not evaluated"}
                </span>
              </div>

              <div className="mt-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveEnroll(s)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-kvsr-soft text-kvsr-ink hover:border-kvsr-navy/30 transition-colors"
                >
                  <Fingerprint className="w-4 h-4" />
                  Enroll Biometric
                </button>
                <button
                  type="button"
                  onClick={() => openEvaluate(s)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-kvsr-navy text-white hover:bg-kvsr-navy/90 transition-colors"
                >
                  <Star className="w-4 h-4" />
                  Evaluate
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!activeEnroll}
        onClose={() => {
          setActiveEnroll(null);
          router.refresh();
        }}
        title={activeEnroll ? `Enroll Biometric — ${activeEnroll.fullName}` : ""}
        description={activeEnroll ? `Roll #${activeEnroll.rollNumber}` : undefined}
      >
        {activeEnroll && <BiometricEnroll student={activeEnroll} />}
      </Modal>

      <Modal
        open={!!activeEvaluate}
        onClose={() => setActiveEvaluate(null)}
        title={activeEvaluate ? activeEvaluate.fullName : ""}
        description={activeEvaluate ? `Roll #${activeEvaluate.rollNumber}` : undefined}
      >
        <div className="space-y-5">
          {CATEGORIES.map((cat) => (
            <fieldset key={cat.key}>
              <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {cat.label}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {SCALE.map((sc) => (
                  <button
                    key={sc.value}
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, [cat.key]: sc.value }))}
                    aria-pressed={values[cat.key] === sc.value}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      values[cat.key] === sc.value
                        ? "bg-kvsr-cta text-white border-kvsr-cta shadow-sm"
                        : "bg-white border-kvsr-soft text-muted-foreground hover:border-kvsr-cta/50 hover:text-kvsr-ink"
                    }`}
                  >
                    {sc.value} · {sc.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          <div>
            <label
              htmlFor="hub-eval-comments"
              className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2"
            >
              Comments (optional)
            </label>
            <textarea
              id="hub-eval-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Anything worth noting about this student…"
              className="w-full px-3 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
            />
          </div>

          {evalMessage && (
            <p className="text-sm text-red-600" role="alert">
              {evalMessage}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleEvaluateSave}
              disabled={evalPending}
              className="flex-1 px-5 py-3 bg-kvsr-cta text-white text-sm font-semibold rounded-xl hover:bg-kvsr-cta/90 disabled:opacity-50 transition-colors"
            >
              {evalPending ? "Saving…" : "Save Evaluation"}
            </button>
            <button
              onClick={() => setActiveEvaluate(null)}
              className="px-5 py-3 border border-kvsr-soft text-sm font-medium rounded-xl text-muted-foreground hover:bg-kvsr-navy/[0.04] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
