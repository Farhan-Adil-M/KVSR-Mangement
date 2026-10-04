"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFacultyAccount } from "@/lib/actions/setup";
import {
  Field,
  StatusMessage,
  btnPrimaryCls,
  inputCls,
} from "@/components/form-controls";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";

interface SetupFacultyFormProps {
  departments: { id: string; code: string; name: string }[];
}

export function SetupFacultyForm({ departments }: SetupFacultyFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    departmentId: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    const res = await createFacultyAccount({
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      email: form.email.trim() || null,
      departmentId: form.departmentId || null,
      password: form.password,
    });
    setBusy(false);
    if (res.success) {
      setStatus({ kind: "success", text: "Faculty account created — they can log in now." });
      setForm({ fullName: "", username: "", email: "", departmentId: "", password: "" });
      setShowPassword(false);
      router.refresh();
    } else {
      setStatus({ kind: "error", text: res.error });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name" htmlFor="faculty-name">
          <input
            id="faculty-name"
            required
            maxLength={120}
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field label="Username" htmlFor="faculty-username" hint="Used to log in — must be unique.">
          <input
            id="faculty-username"
            required
            minLength={3}
            maxLength={40}
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field label="Email (optional)" htmlFor="faculty-email">
          <input
            id="faculty-email"
            type="email"
            maxLength={200}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field label="Department (optional)" htmlFor="faculty-department">
          <select
            id="faculty-department"
            value={form.departmentId}
            onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
            className={inputCls}
          >
            <option value="">No department yet</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Password"
          htmlFor="faculty-password"
          hint="Minimum 4 characters. Share it with the faculty member securely."
        >
          <div className="relative">
            <input
              id="faculty-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={4}
              maxLength={100}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={`${inputCls} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-9 sm:h-9 inline-flex items-center justify-center rounded-lg text-kvsr-muted hover:text-kvsr-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </Field>
      </div>

      {status && <StatusMessage kind={status.kind} text={status.text} />}

      <button type="submit" disabled={busy} className={btnPrimaryCls}>
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <UserPlus className="w-4 h-4" aria-hidden="true" />
        )}
        Create faculty account
      </button>
    </form>
  );
}
