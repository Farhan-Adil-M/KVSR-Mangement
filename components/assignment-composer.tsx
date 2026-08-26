"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createAssignment } from "@/lib/actions/teaching";

interface ClassOption {
  subjectId: string;
  sectionId: string;
  label: string;
}

export function AssignmentComposer({ classes }: { classes: ClassOption[] }) {
  const [classKey, setClassKey] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const selected = classes.find((c) => `${c.subjectId}:${c.sectionId}` === classKey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!selected) {
      setMessage("Pick a class first.");
      return;
    }
    setIsPending(true);
    void (async () => {
      try {
        const res = await createAssignment({
          subjectId: selected.subjectId,
          sectionId: selected.sectionId,
          title,
          description: description.trim() || null,
          dueDate: dueDate || null,
        });
        if (res.success) {
          setTitle("");
          setDescription("");
          setDueDate("");
          setMessage("Assignment created.");
        } else {
          setMessage(res.error);
        }
      } finally {
        setIsPending(false);
      }
    })();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="asg-class" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Class
        </label>
        <select
          id="asg-class"
          value={classKey}
          onChange={(e) => setClassKey(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-kvsr-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
        >
          <option value="">Select class…</option>
          {classes.map((c) => (
            <option key={`${c.subjectId}:${c.sectionId}`} value={`${c.subjectId}:${c.sectionId}`}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="asg-title" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Title
        </label>
        <input
          id="asg-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Assignment 1 — Linked Lists"
          className="w-full px-3 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
        />
      </div>

      <div>
        <label htmlFor="asg-desc" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Description (optional)
        </label>
        <textarea
          id="asg-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full px-3 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
        />
      </div>

      <div>
        <label htmlFor="asg-due" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Due date (optional)
        </label>
        <input
          id="asg-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
        />
      </div>

      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-5 py-2.5 bg-kvsr-cta text-white text-sm font-medium rounded-xl hover:bg-kvsr-cta/90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        {isPending ? "Creating…" : "Create Assignment"}
      </button>
    </form>
  );
}
