"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSection } from "@/lib/actions/setup";
import type { PickerTreeRow } from "@/lib/db/enrollment-queries";
import {
  Field,
  StatusMessage,
  btnPrimaryCls,
  inputCls,
} from "@/components/form-controls";
import { Layers, Loader2 } from "lucide-react";

interface SetupSectionFormProps {
  tree: PickerTreeRow[];
  faculty: { id: string; fullName: string }[];
}

export function SetupSectionForm({ tree, faculty }: SetupSectionFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    departmentId: "",
    programId: "",
    studyYearId: "",
    name: "",
    classTeacherId: "",
  });
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const departments = useMemo(() => {
    const seen = new Set<string>();
    return tree
      .map((r) => ({ id: r.departmentId, code: r.departmentCode, name: r.departmentName }))
      .filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
  }, [tree]);

  const programs = useMemo(() => {
    const rows = tree.filter((r) => r.departmentId === form.departmentId && r.programId);
    const seen = new Set<string>();
    return rows
      .map((r) => ({ id: r.programId as string, name: r.programName as string }))
      .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }, [tree, form.departmentId]);

  const years = useMemo(() => {
    const rows = tree.filter(
      (r) =>
        r.departmentId === form.departmentId &&
        r.programId === form.programId &&
        r.studyYearId
    );
    const seen = new Set<string>();
    return rows
      .map((r) => ({ id: r.studyYearId as string, name: r.yearLabel as string }))
      .filter((y) => (seen.has(y.id) ? false : (seen.add(y.id), true)));
  }, [tree, form.departmentId, form.programId]);

  const ready = form.studyYearId !== "" && form.name.trim() !== "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    const res = await createSection({
      studyYearId: form.studyYearId,
      name: form.name.trim(),
      classTeacherId: form.classTeacherId || null,
    });
    setBusy(false);
    if (res.success) {
      setStatus({ kind: "success", text: "Section created." });
      setForm((f) => ({ ...f, name: "", classTeacherId: "" }));
      router.refresh();
    } else {
      setStatus({ kind: "error", text: res.error });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Department" htmlFor="section-dept">
          <select
            id="section-dept"
            required
            value={form.departmentId}
            onChange={(e) =>
              setForm((f) => ({ ...f, departmentId: e.target.value, programId: "", studyYearId: "" }))
            }
            className={inputCls}
          >
            <option value="">Choose a department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Program" htmlFor="section-program">
          <select
            id="section-program"
            required
            value={form.programId}
            onChange={(e) =>
              setForm((f) => ({ ...f, programId: e.target.value, studyYearId: "" }))
            }
            disabled={form.departmentId === "" || programs.length === 0}
            className={inputCls}
          >
            <option value="">
              {form.departmentId === "" ? "Choose a department first" : "Choose a program"}
            </option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Study year"
          htmlFor="section-year"
          hint={
            form.programId !== "" && years.length === 0
              ? "No study years for this program yet — add one above."
              : undefined
          }
        >
          <select
            id="section-year"
            required
            value={form.studyYearId}
            onChange={(e) => setForm((f) => ({ ...f, studyYearId: e.target.value }))}
            disabled={form.programId === "" || years.length === 0}
            className={inputCls}
          >
            <option value="">
              {form.programId === "" ? "Choose a program first" : "Choose a study year"}
            </option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Section name" htmlFor="section-name" hint="Max 20 characters, e.g. A or B.">
          <input
            id="section-name"
            required
            maxLength={20}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field label="Class teacher (optional)" htmlFor="section-teacher">
          <select
            id="section-teacher"
            value={form.classTeacherId}
            onChange={(e) => setForm((f) => ({ ...f, classTeacherId: e.target.value }))}
            className={inputCls}
          >
            <option value="">Not assigned yet</option>
            {faculty.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fullName}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {status && <StatusMessage kind={status.kind} text={status.text} />}

      <button type="submit" disabled={busy || !ready} className={btnPrimaryCls}>
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Layers className="w-4 h-4" aria-hidden="true" />
        )}
        Create section
      </button>
    </form>
  );
}
