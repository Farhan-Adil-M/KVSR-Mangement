"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { Modal } from "@/components/modal";
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

interface ScheduledPeriod {
  day: string;
  periodNumber: number;
  time: string;
}

interface AssignmentWithSlots extends ExistingAssignment {
  periods: ScheduledPeriod[];
}

interface Option {
  id: string;
  label: string;
}

interface PeriodOption {
  id: string;
  periodNumber: number;
  time: string;
}

export function AssignmentManager({
  facultyId,
  existing,
  subjects,
  sections,
  periods,
  teachingDays,
  slotsByAssignment,
}: {
  facultyId: string;
  existing: ExistingAssignment[];
  subjects: Option[];
  sections: Option[];
  periods: PeriodOption[];
  teachingDays: string[];
  slotsByAssignment: AssignmentWithSlots[];
}) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [removing, setRemoving] = useState<AssignmentWithSlots | null>(null);

  const periodsForAssignment = (assignmentId: string) =>
    slotsByAssignment.find((s) => s.assignmentId === assignmentId)?.periods ?? [];

  const toggleCell = (day: string, periodId: string) => {
    const key = `${day}|${periodId}`;
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedSummary = useMemo(() => {
    const parts: string[] = [];
    for (const day of teachingDays) {
      const cells = periods
        .filter((p) => selectedCells.has(`${day}|${p.id}`))
        .map((p) => `P${p.periodNumber}`);
      if (cells.length > 0) parts.push(`${day.slice(0, 3)} ${cells.join(", ")}`);
    }
    return parts.join(" · ");
  }, [selectedCells, teachingDays, periods]);

  const handleAssign = () => {
    setMessage(null);
    if (!subjectId || !sectionId) {
      setMessage("Pick a subject and a section.");
      return;
    }
    setIsPending(true);
    void (async () => {
      try {
        const slots = Array.from(selectedCells).map((key) => {
          const [dayOfWeek, periodId] = key.split("|");
          return { dayOfWeek, periodId };
        });
        const res = await assignFacultyToClass({
          facultyId,
          subjectId,
          sectionId,
          slots,
        });
        if (res.success) {
          setSubjectId("");
          setSectionId("");
          setSelectedCells(new Set());
          setMessage(
            slots.length > 0
              ? `Assignment added with ${slots.length} weekly period${slots.length === 1 ? "" : "s"}.`
              : "Assignment added (access only — no periods scheduled)."
          );
          router.refresh();
        } else {
          setMessage(res.error);
        }
      } finally {
        setIsPending(false);
      }
    })();
  };

  const handleRemove = (removeSlots: boolean) => {
    if (!removing) return;
    setMessage(null);
    setIsPending(true);
    void (async () => {
      try {
        const res = await removeFacultyAssignment(removing.assignmentId, {
          removeSlots,
        });
        setMessage(
          res.success
            ? removeSlots
              ? "Assignment and its scheduled periods removed."
              : "Assignment removed. Scheduled periods were kept."
            : res.error
        );
        if (res.success) {
          setRemoving(null);
          router.refresh();
        }
      } finally {
        setIsPending(false);
      }
    })();
  };

  return (
    <div className="space-y-6">
      {/* Assign flow */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            aria-label="Subject"
            className="flex-1 min-h-[48px] px-3 rounded-xl border border-kvsr-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
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
            className="flex-1 min-h-[48px] px-3 rounded-xl border border-kvsr-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
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
            className="min-h-[48px] px-4 bg-kvsr-cta text-white text-sm font-medium rounded-xl hover:bg-kvsr-cta/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Assign
          </button>
        </div>

        {/* Schedule builder: day × period chips */}
        <div className="rounded-xl border border-kvsr-soft bg-kvsr-navy/[0.02] p-4">
          <p className="text-sm font-medium text-kvsr-ink flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-kvsr-orange" />
            Schedule periods (optional)
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap the periods this faculty teaches this subject in this section. Skip to
            grant access only.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="border-collapse text-xs">
              <tbody>
                {teachingDays.map((day) => (
                  <tr key={day}>
                    <th
                      scope="row"
                      className="pr-2 py-1 text-left font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {day.slice(0, 3)}
                    </th>
                    {periods.map((p) => {
                      const key = `${day}|${p.id}`;
                      const active = selectedCells.has(key);
                      return (
                        <td key={key} className="p-0.5">
                          <button
                            type="button"
                            onClick={() => toggleCell(day, p.id)}
                            aria-pressed={active}
                            aria-label={`${day} period ${p.periodNumber}`}
                            className={`min-w-[52px] min-h-[36px] px-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                              active
                                ? "bg-kvsr-cta text-white border-kvsr-cta"
                                : "bg-white text-muted-foreground border-kvsr-soft hover:border-kvsr-cta/50"
                            }`}
                          >
                            P{p.periodNumber}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2" role="status">
            {selectedCells.size === 0
              ? "No periods selected — class access only, no timetable entry."
              : `Selected: ${selectedSummary}`}
          </p>
        </div>

        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </div>

      {/* Existing assignments */}
      <ul className="space-y-2">
        {existing.length === 0 && (
          <li className="text-sm text-muted-foreground">No class assignments yet.</li>
        )}
        {existing.map((a) => {
          const periodsList = periodsForAssignment(a.assignmentId);
          return (
            <li
              key={a.assignmentId}
              className="px-4 py-3 rounded-xl border border-kvsr-soft bg-kvsr-navy/[0.02]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-kvsr-ink">{a.subjectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.yearLabel}-{a.sectionName}
                  </p>
                </div>
                <button
                  onClick={() => setRemoving({ ...a, periods: periodsList })}
                  disabled={isPending}
                  aria-label={`Remove ${a.subjectName} for ${a.yearLabel}-${a.sectionName}`}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {periodsList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {periodsList.map((p) => (
                    <span
                      key={`${p.day}-${p.periodNumber}`}
                      className="px-2 py-0.5 rounded-full bg-kvsr-navy/5 text-kvsr-ink text-[11px] font-medium"
                    >
                      {p.day.slice(0, 3)} P{p.periodNumber} · {p.time}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Access only — no periods scheduled yet.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Remove confirmation */}
      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove assignment?"
        description={
          removing
            ? `${removing.subjectName} · ${removing.yearLabel}-${removing.sectionName}`
            : undefined
        }
      >
        <div className="space-y-3">
          <button
            onClick={() => handleRemove(false)}
            disabled={isPending}
            className="w-full min-h-[48px] rounded-xl border border-kvsr-soft bg-white text-sm font-medium text-kvsr-ink hover:bg-kvsr-navy/[0.03] disabled:opacity-50"
          >
            Remove access only
            <span className="block text-xs text-muted-foreground font-normal mt-0.5">
              Keeps their scheduled periods on the timetable.
            </span>
          </button>
          <button
            onClick={() => handleRemove(true)}
            disabled={isPending}
            className="w-full min-h-[48px] rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            Remove access + scheduled periods
            <span className="block text-xs text-white/80 font-normal mt-0.5">
              Also deletes their periods for this class and the attendance history
              recorded in those slots.
            </span>
          </button>
          <button
            onClick={() => setRemoving(null)}
            disabled={isPending}
            className="w-full min-h-[44px] text-sm text-muted-foreground hover:text-kvsr-ink"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
