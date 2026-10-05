"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTimetableSlot,
  deleteTimetableSlot,
  updateTimetableSlot,
} from "@/lib/actions/setup";
import { Modal } from "@/components/modal";
import {
  Field,
  StatusMessage,
  btnDangerCls,
  btnPrimaryCls,
  btnSecondaryCls,
  iconBtnCls,
  inputCls,
} from "@/components/form-controls";
import {
  Beaker,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  User,
} from "lucide-react";

export interface EditorSlot {
  id: string;
  dayOfWeek: string;
  periodNumber: number;
  subjectId: string;
  subject: string;
  facultyId: string | null;
  faculty: string | null;
  isLab: boolean;
}

interface EditorPeriod {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  isBreak: boolean | null;
}

/**
 * One renderable row of the active day. Consecutive lab slots on the same
 * subject collapse into a single row starting at the run's first period —
 * `runLength`/`runEnd` describe the covered span (the underlying slots stay
 * separate rows in the DB; edit/delete always target the first slot).
 */
interface DayRow {
  period: EditorPeriod;
  slot: EditorSlot | null;
  runLength?: number;
  runEnd?: EditorPeriod;
  /** Faculty shown for the whole run; "Multiple faculty" when they differ. */
  runFacultyLabel?: string | null;
}

interface SetupSlotEditorProps {
  basePath: string;
  sections: { id: string; label: string }[];
  selectedSectionId: string;
  slots: EditorSlot[];
  periods: EditorPeriod[];
  subjects: { id: string; name: string; isLab: boolean }[];
  faculty: { id: string; fullName: string }[];
  teachingDays: string[];
  todayDayName: string;
}

const DAY_RE = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function SetupSlotEditor({
  basePath,
  sections,
  selectedSectionId,
  slots,
  periods,
  subjects,
  faculty,
  teachingDays,
  todayDayName,
}: SetupSlotEditorProps) {
  const router = useRouter();

  const days = useMemo(() => {
    const known = teachingDays.filter((d) => DAY_RE.includes(d));
    return known.length > 0 ? known : DAY_RE;
  }, [teachingDays]);

  const [activeDay, setActiveDay] = useState(
    days.includes(todayDayName) ? todayDayName : days[0]
  );

  const teachingPeriods = useMemo(
    () => periods.filter((p) => !p.isBreak),
    [periods]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<EditorSlot | null>(null);
  const [form, setForm] = useState({
    dayOfWeek: days[0],
    periodId: "",
    subjectId: "",
    facultyId: "",
    isLab: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EditorSlot | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const activeDayIndex = days.indexOf(activeDay);
  const daySlots = useMemo(
    () => slots.filter((s) => s.dayOfWeek === activeDay),
    [slots, activeDay]
  );

  /**
   * Merge consecutive lab periods with the same subject into one row
   * (e.g. "AI Lab · P5–P7"). Periods must be numerically adjacent, so a
   * break between two labs keeps them separate. Non-lab slots never merge.
   */
  const dayRows = useMemo(() => {
    const byPeriod = new Map(daySlots.map((s) => [s.periodNumber, s]));
    const rows: DayRow[] = [];
    let i = 0;
    while (i < teachingPeriods.length) {
      const period = teachingPeriods[i];
      const slot = byPeriod.get(period.periodNumber) ?? null;
      if (slot && slot.isLab) {
        let count = 1;
        while (
          i + count < teachingPeriods.length &&
          teachingPeriods[i + count].periodNumber === period.periodNumber + count &&
          byPeriod.get(teachingPeriods[i + count].periodNumber)?.subjectId === slot.subjectId &&
          byPeriod.get(teachingPeriods[i + count].periodNumber)?.isLab === true
        ) {
          count++;
        }
        if (count > 1) {
          const faculties = new Set<string | null>();
          for (let k = 0; k < count; k++) {
            faculties.add(byPeriod.get(teachingPeriods[i + k].periodNumber)?.faculty ?? null);
          }
          rows.push({
            period,
            slot,
            runLength: count,
            runEnd: teachingPeriods[i + count - 1],
            runFacultyLabel:
              faculties.size > 1 ? "Multiple faculty" : (slot.faculty ?? null),
          });
          i += count;
          continue;
        }
      }
      rows.push({ period, slot });
      i++;
    }
    return rows;
  }, [daySlots, teachingPeriods]);

  /** The merged run (if any) a slot being edited/deleted belongs to. */
  const runForSlot = (slotId: string) =>
    dayRows.find((r) => r.runLength != null && r.slot?.id === slotId);

  const dayOptions =
    days.includes(form.dayOfWeek) ? days : [form.dayOfWeek, ...days];

  const editingRun =
    editingSlot && editingSlot.dayOfWeek === activeDay
      ? runForSlot(editingSlot.id)
      : undefined;

  const timeLabel = (p: EditorPeriod) => {
    const trim = (t: string) => t.slice(0, 5);
    return `${trim(p.startTime)} – ${trim(p.endTime)}`;
  };

  function navigateDay(direction: "prev" | "next") {
    const next =
      direction === "prev"
        ? Math.max(0, activeDayIndex - 1)
        : Math.min(days.length - 1, activeDayIndex + 1);
    setActiveDay(days[next]);
  }

  function openCreate(period: EditorPeriod) {
    setEditingSlot(null);
    setForm({
      dayOfWeek: activeDay,
      periodId: period.id,
      subjectId: "",
      facultyId: "",
      isLab: false,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(slot: EditorSlot) {
    const period = periods.find((p) => p.periodNumber === slot.periodNumber);
    setEditingSlot(slot);
    setForm({
      dayOfWeek: slot.dayOfWeek,
      periodId: period?.id ?? "",
      subjectId: slot.subjectId,
      facultyId: slot.facultyId ?? "",
      isLab: slot.isLab,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function pickSubject(subjectId: string) {
    const subject = subjects.find((s) => s.id === subjectId);
    setForm((f) => ({ ...f, subjectId, isLab: subject?.isLab ?? false }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    const payload = {
      sectionId: selectedSectionId,
      dayOfWeek: form.dayOfWeek,
      periodId: form.periodId,
      subjectId: form.subjectId,
      facultyId: form.facultyId || null,
      isLab: form.isLab,
    };
    const res = editingSlot
      ? await updateTimetableSlot({ ...payload, id: editingSlot.id })
      : await createTimetableSlot(payload);
    setBusy(false);
    if (res.success) {
      setModalOpen(false);
      setEditingSlot(null);
      setActiveDay(form.dayOfWeek);
      router.refresh();
    } else {
      setFormError(res.error);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setBusy(true);
    const res = await deleteTimetableSlot(deleteTarget.id);
    setBusy(false);
    if (res.success) {
      setDeleteTarget(null);
      setModalOpen(false);
      router.refresh();
    } else {
      setDeleteError(res.error);
    }
  }

  return (
    <div className="space-y-5">
      {/* Section picker */}
      <div className="rounded-2xl bg-white border border-kvsr-soft shadow-sm p-4 sm:p-5">
        <Field
          label="Section"
          htmlFor="slot-editor-section"
          hint="Pick a section to edit its weekly timetable."
        >
          <select
            id="slot-editor-section"
            value={selectedSectionId}
            onChange={(e) => router.push(`${basePath}?section=${e.target.value}`)}
            className={inputCls}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Day tabs */}
      <div className="bg-white rounded-2xl border border-kvsr-soft shadow-sm p-2">
        <div className="flex items-center justify-between mb-1 sm:hidden">
          <button
            type="button"
            onClick={() => navigateDay("prev")}
            disabled={activeDayIndex === 0}
            aria-label="Previous day"
            className="w-12 h-12 inline-flex items-center justify-center rounded-lg hover:bg-kvsr-navy/[0.04] disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="font-semibold text-kvsr-navy">{activeDay}</span>
          <button
            type="button"
            onClick={() => navigateDay("next")}
            disabled={activeDayIndex === days.length - 1}
            aria-label="Next day"
            className="w-12 h-12 inline-flex items-center justify-center rounded-lg hover:bg-kvsr-navy/[0.04] disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              aria-pressed={day === activeDay}
              className={`flex-1 min-h-[44px] rounded-xl text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold ${
                day === activeDay
                  ? "bg-kvsr-navy text-white"
                  : "text-muted-foreground hover:text-kvsr-navy hover:bg-kvsr-navy/[0.04]"
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        <p className="sm:hidden text-center text-xs text-muted-foreground mt-1">
          {slots.filter((s) => s.dayOfWeek === activeDay).length} slots on {activeDay}
        </p>
      </div>

      {/* Period rows (consecutive same-subject labs render as one merged block) */}
      <div className="space-y-3">
        {dayRows.map((row) => {
          const { period, slot } = row;
          const isRun = row.runLength != null && row.runLength > 1;
          const periodLabel = isRun
            ? `P${period.periodNumber}–P${row.runEnd!.periodNumber}`
            : `P${period.periodNumber}`;
          const timeText = isRun
            ? `${period.startTime.slice(0, 5)} – ${row.runEnd!.endTime.slice(0, 5)}`
            : timeLabel(period);
          return (
            <div
              key={period.id}
              className="grid grid-cols-[76px_1fr] sm:grid-cols-[110px_1fr] gap-3"
            >
              <div className="flex flex-col justify-center p-2.5 rounded-xl bg-kvsr-navy text-white text-center">
                <span className="text-sm font-bold">{periodLabel}</span>
                <span className="text-[10px] sm:text-xs text-white/70 mt-0.5">
                  {timeText}
                </span>
                {isRun && (
                  <span className="text-[10px] sm:text-xs text-white/70 mt-0.5">
                    {row.runLength} periods
                  </span>
                )}
              </div>

              {slot ? (
                <div
                  className={`p-3 sm:p-4 rounded-xl border bg-white ${
                    slot.isLab ? "border-kvsr-orange/40" : "border-kvsr-soft"
                  } flex flex-col sm:flex-row sm:items-center gap-2`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-kvsr-navy text-sm sm:text-base truncate">
                        {slot.subject}
                      </h4>
                      {slot.isLab && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-kvsr-orange text-white">
                          <Beaker className="w-3 h-3" aria-hidden="true" />
                          Lab
                        </span>
                      )}
                      {isRun && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-kvsr-navy/[0.06] text-kvsr-navy">
                          {periodLabel} · {row.runLength} periods
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                      {(isRun ? row.runFacultyLabel : slot.faculty) ? (
                        <span className="flex items-center gap-1.5">
                          <User className="w-4 h-4 text-kvsr-cta" aria-hidden="true" />
                          {isRun ? row.runFacultyLabel : slot.faculty}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <User className="w-4 h-4" aria-hidden="true" />
                          No faculty assigned
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(slot)}
                      aria-label={
                        isRun
                          ? `Edit ${slot.subject} lab block, periods ${period.periodNumber} to ${row.runEnd!.periodNumber}`
                          : `Edit ${slot.subject} slot`
                      }
                      className={iconBtnCls}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(slot);
                        setDeleteError(null);
                      }}
                      aria-label={
                        isRun
                          ? `Delete ${slot.subject} slot for period ${period.periodNumber} of the lab block`
                          : `Delete ${slot.subject} slot`
                      }
                      className={`${iconBtnCls} hover:text-destructive hover:border-destructive/40`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openCreate(period)}
                  className="p-4 rounded-xl border-2 border-dashed border-kvsr-soft bg-kvsr-navy/[0.02] hover:border-kvsr-navy/40 hover:bg-kvsr-navy/[0.04] transition-colors flex items-center gap-2 min-h-[48px] text-sm font-semibold text-kvsr-muted hover:text-kvsr-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span className="sm:hidden text-xs">Add subject</span>
                  <span className="hidden sm:inline">Add a subject</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        Slot times follow the daily periods configured in Settings.
      </p>

      {/* Add / edit slot */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSlot ? "Edit slot" : "Add slot"}
        description={
          editingSlot
            ? `${editingSlot.dayOfWeek}, period ${editingSlot.periodNumber}`
            : undefined
        }
      >
        <form onSubmit={submit} className="space-y-4">
          {editingRun && (
            <p className="text-xs text-muted-foreground bg-kvsr-navy/[0.03] border border-kvsr-soft rounded-xl px-3 py-2.5">
              Part of a {editingRun.runLength}-period lab block (
              {editingRun.slot?.subject} · P{editingRun.period.periodNumber}–P
              {editingRun.runEnd!.periodNumber}). Delete this period only, or
              delete each period to remove the block.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Day" htmlFor="slot-day">
              <select
                id="slot-day"
                value={form.dayOfWeek}
                onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
                className={inputCls}
              >
                {dayOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                    {days.includes(d) ? "" : " (not a teaching day)"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Period" htmlFor="slot-period">
              <select
                id="slot-period"
                required
                value={form.periodId}
                onChange={(e) => setForm((f) => ({ ...f, periodId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Choose a period</option>
                {teachingPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    P{p.periodNumber} ({p.startTime.slice(0, 5)} – {p.endTime.slice(0, 5)})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Subject" htmlFor="slot-subject">
            <select
              id="slot-subject"
              required
              value={form.subjectId}
              onChange={(e) => pickSubject(e.target.value)}
              className={inputCls}
            >
              <option value="">Choose a subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.isLab ? " (lab)" : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Faculty (optional)"
            htmlFor="slot-faculty"
            hint="Assign later from faculty assignments if not known yet."
          >
            <select
              id="slot-faculty"
              value={form.facultyId}
              onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Unassigned</option>
              {faculty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fullName}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-2.5 px-4 min-h-[48px] rounded-xl border border-kvsr-soft bg-white text-sm font-medium text-kvsr-ink cursor-pointer has-[:checked]:border-kvsr-navy has-[:checked]:bg-kvsr-navy/[0.04] w-fit">
            <input
              type="checkbox"
              checked={form.isLab}
              onChange={(e) => setForm((f) => ({ ...f, isLab: e.target.checked }))}
              className="w-5 h-5 accent-kvsr-navy"
            />
            Lab session
          </label>

          {formError && <StatusMessage kind="error" text={formError} />}

          <div className="flex items-center gap-2 pt-2">
            {editingSlot && (
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(editingSlot);
                  setDeleteError(null);
                }}
                className={`${btnDangerCls} sm:mr-auto`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                Delete
              </button>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={btnSecondaryCls}
              >
                Cancel
              </button>
              <button type="submit" disabled={busy} className={btnPrimaryCls}>
                {busy && (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                )}
                {editingSlot ? "Save changes" : "Add slot"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete slot"
        description="This cannot be undone."
      >
          {deleteTarget && (
            <div className="space-y-4">
              <p className="text-sm text-kvsr-ink">
                Delete the <span className="font-semibold">{deleteTarget.subject}</span>{" "}
                slot on {deleteTarget.dayOfWeek}, period {deleteTarget.periodNumber}?
                Attendance already taken for this slot is also removed.
              </p>
              {deleteTarget.dayOfWeek === activeDay && runForSlot(deleteTarget.id) && (
                <p className="text-xs text-muted-foreground bg-kvsr-navy/[0.03] border border-kvsr-soft rounded-xl px-3 py-2.5">
                  This period is part of a lab block — deleting it removes only
                  this period; the rest of the block stays.
                </p>
              )}
              {deleteError && <StatusMessage kind="error" text={deleteError} />}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className={btnSecondaryCls}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy}
                className={btnDangerCls}
              >
                {busy && (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                )}
                Delete slot
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
