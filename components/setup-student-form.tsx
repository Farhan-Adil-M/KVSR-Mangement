"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStudentAccount } from "@/lib/actions/setup";
import {
  Field,
  StatusMessage,
  btnPrimaryCls,
  inputCls,
} from "@/components/form-controls";
import { GraduationCap, Loader2 } from "lucide-react";

export function SetupStudentForm() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", rollNumber: "" });
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    const res = await createStudentAccount({
      fullName: form.fullName.trim(),
      rollNumber: form.rollNumber.trim(),
    });
    setBusy(false);
    if (res.success) {
      setStatus({
        kind: "success",
        text: "Student created — the roll number doubles as their login and initial password.",
      });
      setForm({ fullName: "", rollNumber: "" });
      router.refresh();
    } else {
      setStatus({ kind: "error", text: res.error });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name" htmlFor="student-name">
          <input
            id="student-name"
            required
            maxLength={120}
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field label="Roll number" htmlFor="student-roll">
          <input
            id="student-roll"
            required
            maxLength={40}
            value={form.rollNumber}
            onChange={(e) => setForm((f) => ({ ...f, rollNumber: e.target.value }))}
            className={inputCls}
          />
        </Field>
      </div>
      {status && <StatusMessage kind={status.kind} text={status.text} />}
      <button type="submit" disabled={busy} className={btnPrimaryCls}>
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <GraduationCap className="w-4 h-4" aria-hidden="true" />
        )}
        Create student
      </button>
    </form>
  );
}
