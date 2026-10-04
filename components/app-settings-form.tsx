"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAppSettings } from "@/lib/actions/settings";
import type { AppConfig } from "@/lib/app-config";
import {
  Field,
  StatusMessage,
  btnPrimaryCls,
  inputCls,
} from "@/components/form-controls";
import { Loader2, Save } from "lucide-react";

const ALL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const dayChipCls =
  "flex items-center gap-2.5 px-4 min-h-[48px] rounded-xl border border-kvsr-soft bg-white text-sm font-medium text-kvsr-ink cursor-pointer transition-colors hover:border-kvsr-navy/40 has-[:checked]:border-kvsr-navy has-[:checked]:bg-kvsr-navy/[0.04]";

interface Group {
  title: string;
  description: string;
}

const GROUPS: Group[] = [
  { title: "Attendance", description: "What the percentages on dashboards and reports mean." },
  { title: "Marks", description: "Marks colors and how evaluations are weighted." },
  { title: "Face matching", description: "How strictly faces are matched during attendance." },
  { title: "Calendar", description: "Teaching days and login session length." },
  { title: "Identity", description: "Shown across the app and on the public pages." },
];

const GROUP_CLASS = [
  "border-b border-kvsr-soft pb-6 mb-6",
  "border-b border-kvsr-soft pb-6 mb-6",
  "border-b border-kvsr-soft pb-6 mb-6",
  "border-b border-kvsr-soft pb-6 mb-6",
  "",
];

export function AppSettingsForm({ initial }: { initial: AppConfig }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({
    attendanceGoodPct: String(initial.attendanceGoodPct),
    attendanceWarnPct: String(initial.attendanceWarnPct),
    matchThreshold: String(initial.matchThreshold),
    confusionBand: String(initial.confusionBand),
    selfCheckinWindowMinutes: String(initial.selfCheckinWindowMinutes),
    photoMin: String(initial.photoMin),
    photoMax: String(initial.photoMax),
    scanIntervalMs: String(initial.scanIntervalMs),
    identifyScanIntervalMs: String(initial.identifyScanIntervalMs),
    marksGoodPct: String(initial.marksGoodPct),
    marksWarnPct: String(initial.marksWarnPct),
    evalWeightAcademic: String(initial.evalWeightAcademic),
    evalWeightBehaviour: String(initial.evalWeightBehaviour),
    evalWeightParticipation: String(initial.evalWeightParticipation),
    sessionDays: String(initial.sessionDays),
    institutionName: initial.institutionName,
    institutionShortName: initial.institutionShortName,
    institutionPhone: initial.institutionPhone,
    institutionEmail: initial.institutionEmail,
  });
  const [days, setDays] = useState<string[]>(
    ALL_DAYS.filter((d) => initial.teachingDays.includes(d))
  );
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: string, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const number = (key: string): number | null => {
    if (values[key].trim() === "") return null;
    const n = Number(values[key]);
    return Number.isFinite(n) ? n : null;
  };

  const weightSum =
    (Number(values.evalWeightAcademic) || 0) +
    (Number(values.evalWeightBehaviour) || 0) +
    (Number(values.evalWeightParticipation) || 0);

  function toggleDay(day: string) {
    setDays((cur) =>
      cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day]
    );
  }

  function validate(): string | null {
    for (const key of [
      "attendanceGoodPct",
      "attendanceWarnPct",
      "matchThreshold",
      "confusionBand",
      "selfCheckinWindowMinutes",
      "photoMin",
      "photoMax",
      "scanIntervalMs",
      "identifyScanIntervalMs",
      "marksGoodPct",
      "marksWarnPct",
      "evalWeightAcademic",
      "evalWeightBehaviour",
      "evalWeightParticipation",
      "sessionDays",
    ]) {
      if (number(key) === null) {
        return "Enter valid numbers in every field.";
      }
    }
    if (days.length === 0) {
      return "Pick at least one teaching day.";
    }
    if ((number("attendanceWarnPct") ?? 0) > (number("attendanceGoodPct") ?? 0)) {
      return "Attendance warning % must be ≤ good %.";
    }
    if ((number("marksWarnPct") ?? 0) > (number("marksGoodPct") ?? 0)) {
      return "Marks warning % must be ≤ good %.";
    }
    if ((number("photoMin") ?? 0) > (number("photoMax") ?? 0)) {
      return "Minimum photos must be ≤ maximum photos.";
    }
    if (Math.abs(weightSum - 1) >= 0.001) {
      return "Evaluation weights must sum to 1.";
    }
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validate();
    if (invalid) {
      setStatus({ kind: "error", text: invalid });
      return;
    }
    setStatus(null);
    setBusy(true);
    const res = await updateAppSettings({
      attendanceGoodPct: number("attendanceGoodPct")!,
      attendanceWarnPct: number("attendanceWarnPct")!,
      matchThreshold: number("matchThreshold")!,
      confusionBand: number("confusionBand")!,
      selfCheckinWindowMinutes: number("selfCheckinWindowMinutes")!,
      photoMin: number("photoMin")!,
      photoMax: number("photoMax")!,
      scanIntervalMs: number("scanIntervalMs")!,
      identifyScanIntervalMs: number("identifyScanIntervalMs")!,
      marksGoodPct: number("marksGoodPct")!,
      marksWarnPct: number("marksWarnPct")!,
      evalWeightAcademic: number("evalWeightAcademic")!,
      evalWeightBehaviour: number("evalWeightBehaviour")!,
      evalWeightParticipation: number("evalWeightParticipation")!,
      teachingDays: days,
      sessionDays: number("sessionDays")!,
      institutionName: values.institutionName.trim(),
      institutionShortName: values.institutionShortName.trim(),
      institutionPhone: values.institutionPhone.trim(),
      institutionEmail: values.institutionEmail.trim(),
    });
    setBusy(false);
    if (res.success) {
      setStatus({ kind: "success", text: "Settings saved." });
      router.refresh();
    } else {
      setStatus({ kind: "error", text: res.error });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className={GROUP_CLASS[0]}>
        <h3 className="text-sm font-semibold text-kvsr-navy">{GROUPS[0].title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{GROUPS[0].description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field
            label="Good attendance %"
            htmlFor="cfg-attendance-good"
            hint="At or above this counts as good on dashboards."
          >
            <input
              id="cfg-attendance-good"
              type="number"
              min={0}
              max={100}
              value={values.attendanceGoodPct}
              onChange={(e) => set("attendanceGoodPct", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field
            label="Warning %"
            htmlFor="cfg-attendance-warn"
            hint="Below this students are flagged for low attendance."
          >
            <input
              id="cfg-attendance-warn"
              type="number"
              min={0}
              max={100}
              value={values.attendanceWarnPct}
              onChange={(e) => set("attendanceWarnPct", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field
            label="Self check-in window"
            htmlFor="cfg-selfcheckin"
            hint="Minutes a student self check-in stays open."
          >
            <input
              id="cfg-selfcheckin"
              type="number"
              min={2}
              max={120}
              value={values.selfCheckinWindowMinutes}
              onChange={(e) => set("selfCheckinWindowMinutes", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Minimum photos" htmlFor="cfg-photo-min" hint="Photos per photo-attendance session.">
            <input
              id="cfg-photo-min"
              type="number"
              min={1}
              max={10}
              value={values.photoMin}
              onChange={(e) => set("photoMin", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Maximum photos" htmlFor="cfg-photo-max">
            <input
              id="cfg-photo-max"
              type="number"
              min={1}
              max={20}
              value={values.photoMax}
              onChange={(e) => set("photoMax", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field
            label="Camera scan interval (ms)"
            htmlFor="cfg-scan-interval"
            hint="How often live attendance scans for faces."
          >
            <input
              id="cfg-scan-interval"
              type="number"
              min={500}
              max={10000}
              step={100}
              value={values.scanIntervalMs}
              onChange={(e) => set("scanIntervalMs", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field
            label="Identify scan interval (ms)"
            htmlFor="cfg-identify-interval"
            hint="Scan speed on the public face-identify page."
          >
            <input
              id="cfg-identify-interval"
              type="number"
              min={500}
              max={10000}
              step={100}
              value={values.identifyScanIntervalMs}
              onChange={(e) => set("identifyScanIntervalMs", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      <section className={GROUP_CLASS[1]}>
        <h3 className="text-sm font-semibold text-kvsr-navy">{GROUPS[1].title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{GROUPS[1].description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Good marks %" htmlFor="cfg-marks-good" hint="Above this, a mark is colored good.">
            <input
              id="cfg-marks-good"
              type="number"
              min={0}
              max={100}
              value={values.marksGoodPct}
              onChange={(e) => set("marksGoodPct", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Warning %" htmlFor="cfg-marks-warn" hint="Below this a mark is flagged.">
            <input
              id="cfg-marks-warn"
              type="number"
              min={0}
              max={100}
              value={values.marksWarnPct}
              onChange={(e) => set("marksWarnPct", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Weight: academic" htmlFor="cfg-weight-academic" hint="0–1 share of the evaluation score.">
            <input
              id="cfg-weight-academic"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={values.evalWeightAcademic}
              onChange={(e) => set("evalWeightAcademic", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Weight: behaviour" htmlFor="cfg-weight-behaviour">
            <input
              id="cfg-weight-behaviour"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={values.evalWeightBehaviour}
              onChange={(e) => set("evalWeightBehaviour", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Weight: participation" htmlFor="cfg-weight-participation">
            <input
              id="cfg-weight-participation"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={values.evalWeightParticipation}
              onChange={(e) => set("evalWeightParticipation", e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="flex items-end">
            <p
              className={`text-sm font-medium ${
                Math.abs(weightSum - 1) < 0.001 ? "text-emerald-600" : "text-destructive"
              }`}
            >
              Weights sum to {weightSum.toFixed(2)} — must equal 1.00
            </p>
          </div>
        </div>
      </section>

      <section className={GROUP_CLASS[2]}>
        <h3 className="text-sm font-semibold text-kvsr-navy">{GROUPS[2].title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{GROUPS[2].description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Match threshold"
            htmlFor="cfg-match-threshold"
            hint="Face distance below this counts as a match — lower is stricter."
          >
            <input
              id="cfg-match-threshold"
              type="number"
              min={0.2}
              max={0.9}
              step={0.01}
              value={values.matchThreshold}
              onChange={(e) => set("matchThreshold", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field
            label="Confusion band"
            htmlFor="cfg-confusion-band"
            hint="When the top two matches are closer than this, the marker resolves who is who."
          >
            <input
              id="cfg-confusion-band"
              type="number"
              min={0}
              max={0.4}
              step={0.01}
              value={values.confusionBand}
              onChange={(e) => set("confusionBand", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      <section className={GROUP_CLASS[3]}>
        <h3 className="text-sm font-semibold text-kvsr-navy">{GROUPS[3].title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{GROUPS[3].description}</p>
        <div className="space-y-4">
          <div>
            <p className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Teaching days
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => (
                <label key={day} className={dayChipCls}>
                  <input
                    type="checkbox"
                    checked={days.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="w-5 h-5 accent-kvsr-navy"
                    aria-label={`Teaching day: ${day}`}
                  />
                  {day}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Timetable editors and day pickers follow these days.
            </p>
          </div>
          <Field
            label="Login session length (days)"
            htmlFor="cfg-session-days"
            hint="Applies to new logins — existing sessions keep their length."
          >
            <input
              id="cfg-session-days"
              type="number"
              min={1}
              max={31}
              value={values.sessionDays}
              onChange={(e) => set("sessionDays", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      <section className={GROUP_CLASS[4]}>
        <h3 className="text-sm font-semibold text-kvsr-navy">{GROUPS[4].title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{GROUPS[4].description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Institution name" htmlFor="cfg-inst-name">
            <input
              id="cfg-inst-name"
              required
              maxLength={200}
              value={values.institutionName}
              onChange={(e) => set("institutionName", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Short name" htmlFor="cfg-inst-short" hint="Used in titles and compact spaces.">
            <input
              id="cfg-inst-short"
              required
              maxLength={20}
              value={values.institutionShortName}
              onChange={(e) => set("institutionShortName", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Phone" htmlFor="cfg-inst-phone">
            <input
              id="cfg-inst-phone"
              required
              maxLength={20}
              value={values.institutionPhone}
              onChange={(e) => set("institutionPhone", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Email" htmlFor="cfg-inst-email">
            <input
              id="cfg-inst-email"
              type="email"
              required
              maxLength={200}
              value={values.institutionEmail}
              onChange={(e) => set("institutionEmail", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {status && <StatusMessage kind={status.kind} text={status.text} />}

      <button type="submit" disabled={busy} className={btnPrimaryCls}>
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="w-4 h-4" aria-hidden="true" />
        )}
        Save settings
      </button>
    </form>
  );
}
