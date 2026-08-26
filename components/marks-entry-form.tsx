"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { saveMarks } from "@/lib/actions/teaching";

interface StudentRow {
  id: string;
  rollNumber: string;
  fullName: string;
}

const EXAM_TYPES = [
  { value: "internal", label: "Internal" },
  { value: "assignment", label: "Assignment" },
  { value: "midterm", label: "Mid-term" },
  { value: "external", label: "External" },
  { value: "other", label: "Other" },
];

export function MarksEntryForm({
  subjectId,
  sectionId,
  students,
  existingMarks,
}: {
  subjectId: string;
  sectionId: string;
  students: StudentRow[];
  /** title -> (studentId -> { obtained, max, examType }) */
  existingMarks: Record<string, Record<string, { obtained: string; max: string; examType: string }>>;
}) {
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState("internal");
  const [maxMarks, setMaxMarks] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const existingTitles = Object.keys(existingMarks);

  const loadExisting = (t: string) => {
    const perStudent = existingMarks[t];
    if (!perStudent) return false;
    const next: Record<string, string> = {};
    students.forEach((s) => {
      const m = perStudent[s.id];
      if (m) next[s.id] = m.obtained;
    });
    setScores(next);
    const first = Object.values(perStudent)[0];
    if (first) {
      setMaxMarks(first.max);
      setExamType(first.examType);
    }
    return true;
  };

  const handleTitleChange = (t: string) => {
    setTitle(t);
    const match = existingTitles.find((x) => x.toLowerCase() === t.trim().toLowerCase());
    if (match) loadExisting(match);
  };

  const maxNum = useMemo(() => Number(maxMarks), [maxMarks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!title.trim() || !maxMarks || maxNum <= 0) {
      setMessage("Enter a title and a valid maximum.");
      return;
    }
    // Only include rows the faculty actually filled in — blanks are never saved.
    const rows = students.flatMap((s) => {
      const v = scores[s.id]?.trim();
      if (!v) return [];
      const n = Number(v);
      return Number.isNaN(n) ? [] : [{ studentId: s.id, marksObtained: n }];
    });

    if (rows.length === 0) {
      setMessage("Enter marks for at least one student.");
      return;
    }

    setIsPending(true);
    void (async () => {
      try {
        const res = await saveMarks({
          subjectId,
          sectionId,
          title: title.trim(),
          examType,
          maxMarks: maxNum,
          rows,
        });
        setMessage(res.success ? "Marks saved." : res.error);
      } finally {
        setIsPending(false);
      }
    })();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="marks-title" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Test / Title
          </label>
          <input
            id="marks-title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            maxLength={120}
            placeholder="Internal 1"
            className="w-full px-3 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
          />
          {existingTitles.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Existing: {existingTitles.slice(0, 3).join(", ")}
              {existingTitles.length > 3 ? "…" : ""} — type a matching title to edit.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="marks-type" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Type
          </label>
          <select
            id="marks-type"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-kvsr-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
          >
            {EXAM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="marks-max" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Max marks
          </label>
          <input
            id="marks-max"
            type="number"
            min={1}
            max={1000}
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-kvsr-soft shadow-sm overflow-hidden">
        <div className="grid grid-cols-[70px_1fr_110px] sm:grid-cols-[90px_1fr_130px] gap-3 px-5 py-3 bg-kvsr-navy/[0.03] text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Roll #</span>
          <span>Name</span>
          <span className="text-right">Marks</span>
        </div>
        <div className="divide-y divide-kvsr-soft">
          {students.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-[70px_1fr_110px] sm:grid-cols-[90px_1fr_130px] gap-3 px-5 py-2.5 items-center"
            >
              <span className="text-sm text-kvsr-muted">{s.rollNumber}</span>
              <span className="text-sm font-medium text-kvsr-ink truncate">{s.fullName}</span>
              <input
                type="number"
                min={0}
                max={maxNum || undefined}
                step="0.5"
                value={scores[s.id] ?? ""}
                onChange={(e) => setScores((prev) => ({ ...prev, [s.id]: e.target.value }))}
                aria-label={`Marks for ${s.fullName}`}
                placeholder="—"
                className="w-full px-3 py-1.5 rounded-lg border border-kvsr-soft text-sm text-right focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
              />
            </div>
          ))}
        </div>
      </div>

      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-3 bg-kvsr-cta text-white font-medium rounded-full hover:bg-kvsr-cta/90 disabled:opacity-50 flex items-center gap-2"
      >
        <Save className="w-4 h-4" />
        {isPending ? "Saving…" : "Save Marks"}
      </button>
    </form>
  );
}
