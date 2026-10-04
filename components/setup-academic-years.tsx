"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAcademicYear,
  setCurrentAcademicYear,
} from "@/lib/actions/setup";
import {
  Field,
  StatusMessage,
  btnPrimaryCls,
  inputCls,
} from "@/components/form-controls";
import { BadgeCheck, CalendarPlus, Loader2 } from "lucide-react";

export interface AcademicYearRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean | null;
}

export function SetupAcademicYears({ years }: { years: AcademicYearRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [settingId, setSettingId] = useState<string | null>(null);
  const [setError, setSetError] = useState<string | null>(null);

  const datesValid =
    form.startDate !== "" &&
    form.endDate !== "" &&
    form.endDate >= form.startDate;
  const ready = form.name.trim() !== "" && datesValid;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    const res = await createAcademicYear({
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      isCurrent: form.isCurrent,
    });
    setBusy(false);
    if (res.success) {
      setStatus({
        kind: "success",
        text: form.isCurrent
          ? "Academic year created and set as current."
          : "Academic year created.",
      });
      setForm({ name: "", startDate: "", endDate: "", isCurrent: false });
      router.refresh();
    } else {
      setStatus({ kind: "error", text: res.error });
    }
  }

  async function setCurrent(year: AcademicYearRow) {
    setSetError(null);
    setSettingId(year.id);
    const res = await setCurrentAcademicYear(year.id);
    setSettingId(null);
    if (res.success) {
      setStatus({ kind: "success", text: `${year.name} is now the current academic year.` });
      router.refresh();
    } else {
      setSetError(res.error);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Name" htmlFor="year-name" hint="e.g. 2025-26.">
            <input
              id="year-name"
              required
              maxLength={40}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="Start date" htmlFor="year-start">
            <input
              id="year-start"
              type="date"
              required
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="End date" htmlFor="year-end">
            <input
              id="year-end"
              type="date"
              required
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className={inputCls}
            />
          </Field>
        </div>

        {form.startDate !== "" && form.endDate !== "" && !datesValid && (
          <StatusMessage kind="error" text="End date must be on or after the start date." />
        )}

        <label className="flex items-center gap-2.5 px-4 min-h-[48px] rounded-xl border border-kvsr-soft bg-white text-sm font-medium text-kvsr-ink cursor-pointer has-[:checked]:border-kvsr-navy has-[:checked]:bg-kvsr-navy/[0.04] w-fit">
          <input
            type="checkbox"
            checked={form.isCurrent}
            onChange={(e) => setForm((f) => ({ ...f, isCurrent: e.target.checked }))}
            className="w-5 h-5 accent-kvsr-navy"
          />
          Set as current academic year
        </label>

        {status && <StatusMessage kind={status.kind} text={status.text} />}

        <button type="submit" disabled={busy || !ready} className={btnPrimaryCls}>
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <CalendarPlus className="w-4 h-4" aria-hidden="true" />
          )}
          Create academic year
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-kvsr-muted uppercase tracking-wider">
          All years
        </h2>
        <ul className="rounded-2xl bg-white border border-kvsr-soft shadow-sm divide-y divide-kvsr-soft overflow-hidden">
          {years.map((year) => (
            <li
              key={year.id}
              className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3.5 min-h-[56px]"
            >
              <div className="flex-1 min-w-[10rem]">
                <p className="font-semibold text-kvsr-ink">{year.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {year.startDate} – {year.endDate}
                </p>
              </div>
              {year.isCurrent ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  Current
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrent(year)}
                  disabled={settingId !== null}
                  className="inline-flex items-center gap-2 px-4 min-h-[48px] sm:min-h-[40px] rounded-xl border border-kvsr-soft bg-white text-sm font-semibold text-kvsr-ink shadow-sm hover:border-kvsr-navy/40 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
                >
                  {settingId === year.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <BadgeCheck className="w-4 h-4" aria-hidden="true" />
                  )}
                  Set as current
                </button>
              )}
            </li>
          ))}
        </ul>
        {setError && <StatusMessage kind="error" text={setError} />}
        <p className="text-xs text-muted-foreground">
          New enrollments and attendance always attach to the current year.
        </p>
      </div>
    </div>
  );
}
