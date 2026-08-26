"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, Star, Check, Users } from "lucide-react";
import { Modal } from "@/components/modal";
import { saveEvaluation } from "@/lib/actions/evaluations";

export interface StudentCard {
  id: string;
  rollNumber: string;
  fullName: string;
}

export interface EvaluationValues {
  academicPerformance: number;
  behaviour: number;
  participation: number;
  comments: string | null;
}

const SCALE = [
  { value: 1, label: "Very Poor" },
  { value: 2, label: "Below Average" },
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

function scoreChip(values: EvaluationValues) {
  return `Acad ${values.academicPerformance} · Beh ${values.behaviour} · Part ${values.participation}`;
}

export function EvaluationsGrid({
  students,
  evaluations,
  sectionId,
}: {
  students: StudentCard[];
  evaluations: Record<string, EvaluationValues>;
  sectionId: string;
}) {
  const [search, setSearch] = useState("");
  const [activeStudent, setActiveStudent] = useState<StudentCard | null>(null);
  const [values, setValues] = useState<Record<CategoryKey, number>>({
    academicPerformance: 0,
    behaviour: 0,
    participation: 0,
  });
  const [comments, setComments] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [savedMap, setSavedMap] = useState<Record<string, EvaluationValues>>(
    () => ({ ...evaluations })
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
    );
  }, [students, search]);

  const evaluatedCount = students.filter((s) => savedMap[s.id]).length;

  const openModal = (student: StudentCard) => {
    const existing = savedMap[student.id];
    setValues({
      academicPerformance: existing?.academicPerformance ?? 0,
      behaviour: existing?.behaviour ?? 0,
      participation: existing?.participation ?? 0,
    });
    setComments(existing?.comments ?? "");
    setMessage(null);
    setActiveStudent(student);
  };

  const handleSave = () => {
    if (!activeStudent) return;
    setMessage(null);
    if (CATEGORIES.some((c) => values[c.key] === 0)) {
      setMessage("Rate all three categories first.");
      return;
    }
    setIsPending(true);
    void (async () => {
      try {
        const res = await saveEvaluation({
          studentId: activeStudent.id,
          sectionId,
          ...values,
          comments: comments.trim() || null,
        });
        if (res.success) {
          setSavedMap((prev) => ({
            ...prev,
            [activeStudent.id]: { ...values, comments: comments.trim() || null },
          }));
          setActiveStudent(null);
        } else {
          setMessage(res.error);
        }
      } finally {
        setIsPending(false);
      }
    })();
  };

  return (
    <div className="space-y-5">
      {/* Search + count */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name or roll number…"
            aria-label="Search students"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-kvsr-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
          />
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
          <Users className="w-4 h-4" />
          {filtered.length} of {students.length} · {evaluatedCount} evaluated
        </p>
      </div>

      {/* Card grid — 3 per row on desktop */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-kvsr-soft p-12 text-center shadow-sm">
          <p className="text-muted-foreground">
            No students match “{search}”.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((student, index) => {
            const existing = savedMap[student.id];
            return (
              <motion.button
                key={student.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.4) }}
                whileHover={{ y: -3 }}
                onClick={() => openModal(student)}
                aria-haspopup="dialog"
                className={`text-left p-5 rounded-2xl border shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold ${
                  existing
                    ? "bg-white border-emerald-200 hover:border-emerald-300"
                    : "bg-white border-kvsr-soft hover:border-kvsr-navy/25 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-kvsr-navy/[0.06] text-kvsr-navy text-sm font-bold shrink-0">
                      {initials(student.fullName)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-kvsr-ink leading-tight truncate">
                        {student.fullName}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Roll #{student.rollNumber}
                      </p>
                    </div>
                  </div>
                  {existing ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold shrink-0">
                      <Check className="w-3 h-3" />
                      Done
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-kvsr-navy/[0.06] text-kvsr-muted text-[11px] font-semibold shrink-0">
                      Pending
                    </span>
                  )}
                </div>
                <div className="pt-3 border-t border-kvsr-soft flex items-center justify-between gap-2">
                  {existing ? (
                    <span className="text-xs font-medium text-kvsr-ink">
                      {scoreChip(existing)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Not evaluated yet
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-kvsr-cta">
                    <Star className="w-3.5 h-3.5" />
                    {existing ? "Edit" : "Evaluate"}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Evaluation popup */}
      <Modal
        open={!!activeStudent}
        onClose={() => setActiveStudent(null)}
        title={activeStudent ? activeStudent.fullName : ""}
        description={activeStudent ? `Roll #${activeStudent.rollNumber}` : undefined}
      >
        <div className="space-y-5">
          {CATEGORIES.map((cat) => (
            <fieldset key={cat.key}>
              <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {cat.label}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {SCALE.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, [cat.key]: s.value }))}
                    aria-pressed={values[cat.key] === s.value}
                    title={s.label}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      values[cat.key] === s.value
                        ? "bg-kvsr-cta text-white border-kvsr-cta shadow-sm"
                        : "bg-white border-kvsr-soft text-muted-foreground hover:border-kvsr-cta/50 hover:text-kvsr-ink"
                    }`}
                  >
                    {s.value} · {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          <div>
            <label
              htmlFor="eval-comments"
              className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2"
            >
              Comments (optional)
            </label>
            <textarea
              id="eval-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Anything worth noting about this student…"
              className="w-full px-3 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
            />
          </div>

          {message && (
            <p className="text-sm text-red-600" role="alert">
              {message}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 px-5 py-3 bg-kvsr-cta text-white text-sm font-semibold rounded-xl hover:bg-kvsr-cta/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving…" : "Save Evaluation"}
            </button>
            <button
              onClick={() => setActiveStudent(null)}
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
