"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSubject } from "@/lib/actions/setup";
import {
  Field,
  StatusMessage,
  btnPrimaryCls,
  inputCls,
} from "@/components/form-controls";
import { BookMarked, Loader2 } from "lucide-react";

interface SetupSubjectFormProps {
  departments: { id: string; code: string; name: string }[];
}

const chipCls =
  "flex items-center gap-2.5 px-4 min-h-[48px] rounded-xl border border-kvsr-soft bg-white text-sm font-medium text-kvsr-ink cursor-pointer transition-colors hover:border-kvsr-navy/40 has-[:checked]:border-kvsr-navy has-[:checked]:bg-kvsr-navy/[0.04] focus-within:ring-2 focus-within:ring-kvsr-gold";

export function SetupSubjectForm({ departments }: SetupSubjectFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    code: "",
    shortName: "",
    departmentId: "",
    isLab: false,
    isElective: false,
  });
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    const res = await createSubject({
      name: form.name.trim(),
      code: form.code.trim() || null,
      shortName: form.shortName.trim() || null,
      departmentId: form.departmentId || null,
      isLab: form.isLab,
      isElective: form.isElective,
    });
    setBusy(false);
    if (res.success) {
      setStatus({ kind: "success", text: "Subject created." });
      setForm({ name: "", code: "", shortName: "", departmentId: "", isLab: false, isElective: false });
      router.refresh();
    } else {
      setStatus({ kind: "error", text: res.error });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Name" htmlFor="subject-name" hint="e.g. Data Structures.">
          <input
            id="subject-name"
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field
          label="Code (optional)"
          htmlFor="subject-code"
          hint="Must be unique within the chosen department."
        >
          <input
            id="subject-code"
            maxLength={20}
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field label="Short name (optional)" htmlFor="subject-short" hint="Shown on timetables when space is tight.">
          <input
            id="subject-short"
            maxLength={20}
            value={form.shortName}
            onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Department (optional)" htmlFor="subject-dept">
        <select
          id="subject-dept"
          value={form.departmentId}
          onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
          className={inputCls}
        >
          <option value="">Common / no department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex flex-wrap gap-3">
        <label className={chipCls}>
          <input
            type="checkbox"
            checked={form.isLab}
            onChange={(e) => setForm((f) => ({ ...f, isLab: e.target.checked }))}
            className="w-5 h-5 accent-kvsr-navy"
          />
          Lab subject
        </label>
        <label className={chipCls}>
          <input
            type="checkbox"
            checked={form.isElective}
            onChange={(e) => setForm((f) => ({ ...f, isElective: e.target.checked }))}
            className="w-5 h-5 accent-kvsr-navy"
          />
          Elective
        </label>
      </div>

      {status && <StatusMessage kind={status.kind} text={status.text} />}

      <button type="submit" disabled={busy} className={btnPrimaryCls}>
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <BookMarked className="w-4 h-4" aria-hidden="true" />
        )}
        Create subject
      </button>
    </form>
  );
}
