"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createStudyYear } from "@/lib/actions/setup";
import type { ProgramWithStudyYears } from "@/lib/db/queries";
import {
  Field,
  StatusMessage,
  btnPrimaryCls,
  inputCls,
} from "@/components/form-controls";
import { Loader2, Plus } from "lucide-react";

/** Ordinal labels auto-suggested for a new year (P1 → "I", P2 → "II", …). */
const ORDINALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

function ordinalFor(yearNumber: number): string {
  return ORDINALS[yearNumber - 1] ?? String(yearNumber);
}

/**
 * "Study years" card for Setup → Sections.
 *
 * ECE-style programs exist without any study years, which previously made the
 * section form unusable ("cannot choose a year"). This card lists a program's
 * years and adds new ones inline; the section form beside it reads the same
 * data after refresh.
 */
export function SetupStudyYearsCard({
  programs,
}: {
  programs: ProgramWithStudyYears[];
}) {
  const router = useRouter();
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [yearNumber, setYearNumber] = useState("1");
  const [label, setLabel] = useState("I");
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = programs.find((p) => p.id === programId) ?? null;
  const nextNumber =
    selected && selected.studyYears.length > 0
      ? Math.max(...selected.studyYears.map((y) => y.yearNumber)) + 1
      : 1;

  // Suggest the next free year number + ordinal whenever the target shifts
  // (program switch, or after a create moves the high-water mark).
  useEffect(() => {
    setYearNumber(String(nextNumber));
    setLabel(ordinalFor(nextNumber));
  }, [nextNumber]);

  if (programs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No programs yet — create departments and programs in Settings first.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!programId) return;
    setStatus(null);
    setBusy(true);
    const res = await createStudyYear({
      programId,
      yearNumber: Number(yearNumber),
      label: label.trim(),
    });
    setBusy(false);
    if (res.success) {
      setStatus({ kind: "success", text: "Study year added." });
      router.refresh();
    } else {
      setStatus({ kind: "error", text: res.error });
    }
  }

  return (
    <div className="space-y-5">
      <Field
        label="Program"
        htmlFor="study-year-program"
        hint="Years belong to a program (e.g. B.Tech CSE years I–IV)."
      >
        <select
          id="study-year-program"
          value={programId}
          onChange={(e) => {
            setProgramId(e.target.value);
            setStatus(null);
          }}
          className={inputCls}
        >
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.departmentName ? ` · ${p.departmentName}` : ""}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Existing years
        </p>
        {selected && selected.studyYears.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Study years for this program">
            {selected.studyYears.map((y) => (
              <li
                key={y.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-kvsr-soft bg-white text-sm shadow-sm"
              >
                <span className="font-bold text-kvsr-navy">P{y.yearNumber}</span>
                <span className="text-muted-foreground">{y.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No study years for this program yet — add the first one below.
          </p>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4 pt-1 border-t border-kvsr-soft">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <Field label="Year number" htmlFor="study-year-number">
            <input
              id="study-year-number"
              type="number"
              required
              min={1}
              max={10}
              value={yearNumber}
              onChange={(e) => setYearNumber(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field
            label="Label"
            htmlFor="study-year-label"
            hint="Shown across the app, e.g. II for second year."
          >
            <input
              id="study-year-label"
              required
              maxLength={40}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={ordinalFor(nextNumber)}
              className={inputCls}
            />
          </Field>
        </div>

        {status && <StatusMessage kind={status.kind} text={status.text} />}

        <button type="submit" disabled={busy || !programId} className={btnPrimaryCls}>
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="w-4 h-4" aria-hidden="true" />
          )}
          Add study year
        </button>
      </form>
    </div>
  );
}
