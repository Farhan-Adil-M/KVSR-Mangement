"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  assignFacultyToClass,
  removeFacultyAssignment,
} from "@/lib/actions/admin";

interface ExistingAssignment {
  assignmentId: string;
  subjectId: string;
  subjectName: string;
  sectionId: string;
  sectionName: string;
  yearLabel: string;
}

interface Option {
  id: string;
  label: string;
}

export function AssignmentManager({
  facultyId,
  existing,
  subjects,
  sections,
}: {
  facultyId: string;
  existing: ExistingAssignment[];
  subjects: Option[];
  sections: Option[];
}) {
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleAssign = () => {
    setMessage(null);
    if (!subjectId || !sectionId) {
      setMessage("Pick a subject and a section.");
      return;
    }
    setIsPending(true);
    void (async () => {
      try {
        const res = await assignFacultyToClass({ facultyId, subjectId, sectionId });
        setMessage(res.success ? "Assignment added." : res.error);
        if (res.success) setSubjectId("");
      } finally {
        setIsPending(false);
      }
    })();
  };

  const handleRemove = (id: string) => {
    setMessage(null);
    setIsPending(true);
    void (async () => {
      try {
        const res = await removeFacultyAssignment(id);
        setMessage(res.success ? "Assignment removed." : res.error);
      } finally {
        setIsPending(false);
      }
    })();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          aria-label="Subject"
          className="flex-1 px-3 py-2.5 rounded-xl border border-kvsr-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
        >
          <option value="">Select subject…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          aria-label="Section"
          className="flex-1 px-3 py-2.5 rounded-xl border border-kvsr-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
        >
          <option value="">Select section…</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleAssign}
          disabled={isPending}
          className="px-4 py-2.5 bg-kvsr-cta text-white text-sm font-medium rounded-xl hover:bg-kvsr-cta/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Assign
        </button>
      </div>

      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}

      <ul className="space-y-2">
        {existing.length === 0 && (
          <li className="text-sm text-muted-foreground">No class assignments yet.</li>
        )}
        {existing.map((a) => (
          <li
            key={a.assignmentId}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-kvsr-soft bg-kvsr-navy/[0.02]"
          >
            <div>
              <p className="text-sm font-medium text-kvsr-ink">{a.subjectName}</p>
              <p className="text-xs text-muted-foreground">
                {a.yearLabel}-{a.sectionName}
              </p>
            </div>
            <button
              onClick={() => handleRemove(a.assignmentId)}
              disabled={isPending}
              aria-label={`Remove ${a.subjectName} for ${a.yearLabel}-${a.sectionName}`}
              className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
