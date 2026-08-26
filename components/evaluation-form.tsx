"use client";

import { useState } from "react";
import { Star, Check } from "lucide-react";
import { saveEvaluation } from "@/lib/actions/evaluations";

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

export interface EvaluationValues {
  academicPerformance: number;
  behaviour: number;
  participation: number;
  comments: string | null;
}

export function EvaluationForm({
  studentId,
  studentName,
  sectionId,
  existing,
}: {
  studentId: string;
  studentName: string;
  sectionId: string;
  existing: EvaluationValues | null;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<CategoryKey, number>>({
    academicPerformance: existing?.academicPerformance ?? 0,
    behaviour: existing?.behaviour ?? 0,
    participation: existing?.participation ?? 0,
  });
  const [comments, setComments] = useState(existing?.comments ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSave = () => {
    setMessage(null);
    if (CATEGORIES.some((c) => values[c.key] === 0)) {
      setMessage("Rate all three categories first.");
      return;
    }
    setIsPending(true);
    void (async () => {
      try {
        const res = await saveEvaluation({
          studentId,
          sectionId,
          ...values,
          comments: comments.trim() || null,
        });
        setMessage(res.success ? "Evaluation saved." : res.error);
        if (res.success) setOpen(false);
      } finally {
        setIsPending(false);
      }
    })();
  };

  return (
    <div className="border-t border-kvsr-soft pt-3 mt-3">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-kvsr-navy/[0.06] text-kvsr-navy hover:bg-kvsr-navy/10 transition-colors"
        >
          <Star className="w-3.5 h-3.5" />
          {existing ? "Edit Evaluation" : "Evaluate"}
        </button>
        {existing && !open && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Check className="w-3.5 h-3.5" />
            Rated {existing.academicPerformance}/{existing.behaviour}/{existing.participation}
          </span>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-4 p-4 rounded-xl bg-kvsr-navy/[0.02] border border-kvsr-soft">
          <p className="text-sm font-semibold text-kvsr-ink">{studentName}</p>
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
                        ? "bg-kvsr-cta text-white border-kvsr-cta"
                        : "bg-white border-kvsr-soft text-muted-foreground hover:border-kvsr-cta/50"
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
              htmlFor={`comments-${studentId}`}
              className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2"
            >
              Comments (optional)
            </label>
            <textarea
              id={`comments-${studentId}`}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              maxLength={1000}
              className="w-full px-3 py-2 rounded-lg border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
            />
          </div>

          {message && (
            <p className="text-sm text-muted-foreground" role="status">
              {message}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-4 py-2 bg-kvsr-cta text-white text-sm font-medium rounded-lg hover:bg-kvsr-cta/90 disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save Evaluation"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 border border-kvsr-soft text-sm font-medium rounded-lg text-muted-foreground hover:bg-kvsr-navy/[0.04]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
