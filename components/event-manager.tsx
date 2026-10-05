"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createEvent, deleteEvent, planEvent, updateEvent } from "@/lib/actions/events";
import type { PlanEventResult } from "@/lib/actions/events";
import type { EventPlan } from "@/lib/event-planner";
import type { EventRow } from "@/lib/db/event-queries";
import { Modal } from "@/components/modal";
import { EmptyState } from "@/components/empty-state";
import {
  EventCard,
  audienceLabel,
} from "@/components/events-list";
import {
  Field,
  StatusMessage,
  btnDangerCls,
  btnPrimaryCls,
  btnSecondaryCls,
  iconBtnCls,
  inputCls,
  labelCls,
  textareaCls,
} from "@/components/form-controls";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const AUDIENCES = [
  { value: "students", label: "Students" },
  { value: "faculty", label: "Faculty" },
  { value: "both", label: "Students & Faculty" },
] as const;

interface EventManagerProps {
  events: EventRow[];
  role: "admin" | "hod";
  /** HOD's own department; null for admin. */
  ownDepartmentId: string | null;
  ownDepartmentName: string | null;
  /** Session faculty id for the HOD ownership mirror rule; null for admin. */
  hodFacultyId: string | null;
  departments: { id: string; code: string; name: string }[];
  /** IST today (YYYY-MM-DD) from the server — drives upcoming/past grouping. */
  today: string;
}

interface EventFormState {
  title: string;
  description: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  audience: string;
  departmentId: string;
}

const emptyForm: EventFormState = {
  title: "",
  description: "",
  venue: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  audience: "students",
  departmentId: "",
};

function hodCanManage(
  event: EventRow,
  ownDepartmentId: string | null,
  hodFacultyId: string | null
): boolean {
  if (event.createdByFacultyId && event.createdByFacultyId === hodFacultyId) {
    return true;
  }
  return (
    !!ownDepartmentId &&
    event.departmentId === ownDepartmentId &&
    event.createdByRole === "hod"
  );
}

export function EventManager({
  events,
  role,
  ownDepartmentId,
  ownDepartmentName,
  hodFacultyId,
  departments,
  today,
}: EventManagerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [planAttendees, setPlanAttendees] = useState("");
  const [planBudget, setPlanBudget] = useState("");
  const [plans, setPlans] = useState<EventPlan[] | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planNote, setPlanNote] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          !q ||
          e.title.toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q) ||
          (e.venue ?? "").toLowerCase().includes(q)
      ),
    [events, q]
  );

  const { upcoming, past } = useMemo(() => {
    const upcoming = filtered
      .filter((e) => e.eventDate >= today)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    const past = filtered
      .filter((e) => e.eventDate < today)
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    return { upcoming, past };
  }, [filtered, today]);

  const canManage = (event: EventRow) =>
    role === "admin" || hodCanManage(event, ownDepartmentId, hodFacultyId);

  function resetPlanner() {
    setPlanAttendees("");
    setPlanBudget("");
    setPlans(null);
    setPlanError(null);
    setPlanNote(null);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    resetPlanner();
  }

  function openCreate() {
    setEditing(null);
    setForm(
      role === "hod" && ownDepartmentId
        ? { ...emptyForm, departmentId: ownDepartmentId }
        : emptyForm
    );
    setFormError(null);
    resetPlanner();
    setFormOpen(true);
  }

  function openEdit(event: EventRow) {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      venue: event.venue ?? "",
      eventDate: event.eventDate,
      startTime: event.startTime ? event.startTime.slice(0, 5) : "",
      endTime: event.endTime ? event.endTime.slice(0, 5) : "",
      audience: event.audience,
      departmentId: event.departmentId ?? "",
    });
    setFormError(null);
    resetPlanner();
    setFormOpen(true);
  }

  async function generatePlans() {
    setPlanError(null);
    setPlanNote(null);
    const attendees = Number(planAttendees);
    const budget = Number(planBudget);
    if (!form.title.trim()) {
      setPlanError("Enter an event title first.");
      return;
    }
    if (!Number.isInteger(attendees) || attendees < 10) {
      setPlanError("Enter the expected attendees (at least 10).");
      return;
    }
    if (!Number.isInteger(budget) || budget < 1000) {
      setPlanError("Enter a total budget of at least ₹1,000.");
      return;
    }
    setPlanBusy(true);
    try {
      const res: PlanEventResult = await planEvent({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        attendees,
        budget,
      });
      if (res.ok) {
        setPlans(res.plans);
      } else {
        setPlanError(res.error);
      }
    } finally {
      setPlanBusy(false);
    }
  }

  function applyPlan(plan: EventPlan) {
    const attendees = Number(planAttendees);
    const summary = [
      `${plan.name} plan: ${fmtINR(plan.total)} total`,
      `${fmtINR(plan.perHead)} per head for ${attendees} attendees`,
      plan.items.map((i) => `${i.label} ${fmtINR(i.amount)}`).join(", "),
    ].join(" · ");
    setForm((f) => ({
      ...f,
      description: f.description.trim()
        ? `${f.description.trim()}\n\n${summary}`
        : summary,
    }));
    setPlanNote("Plan appended to the description.");
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      venue: form.venue.trim() || null,
      eventDate: form.eventDate,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      audience: form.audience,
      departmentId: form.departmentId || null,
    };
    const res = editing
      ? await updateEvent({ ...payload, id: editing.id })
      : await createEvent(payload);
    setBusy(false);
    if (res.success) {
      setFormOpen(false);
      setEditing(null);
      router.refresh();
    } else {
      setFormError(res.error);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setBusy(true);
    const res = await deleteEvent(deleteTarget.id);
    setBusy(false);
    if (res.success) {
      setDeleteTarget(null);
      router.refresh();
    } else {
      setDeleteError(res.error);
    }
  }

  const group = (title: string, rows: EventRow[]) =>
    rows.length > 0 && (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-kvsr-muted uppercase tracking-wider">
          {title}
        </h2>
        <ul className="bg-white rounded-2xl border border-kvsr-soft shadow-sm divide-y divide-kvsr-soft overflow-hidden">
          {rows.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              showAudience
              actions={
                canManage(event) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openEdit(event)}
                      aria-label={`Edit ${event.title}`}
                      className={iconBtnCls}
                    >
                      <Pencil className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(event);
                        setDeleteError(null);
                      }}
                      aria-label={`Delete ${event.title}`}
                      className={`${iconBtnCls} hover:text-destructive hover:border-destructive/40`}
                    >
                      <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-kvsr-muted font-medium">
                    {role === "hod" ? "Read-only" : ""}
                  </span>
                )
              }
            />
          ))}
        </ul>
      </section>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events"
            aria-label="Search events"
            className="w-full bg-white border border-kvsr-soft rounded-xl pl-10 pr-4 py-2.5 min-h-[48px] text-sm text-kvsr-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className={btnPrimaryCls}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New event
        </button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description={
            role === "admin"
              ? "Create the first event for the institution or a single department."
              : `Create the first event for ${ownDepartmentName ?? "your department"}.`
          }
          action={
            <button type="button" onClick={openCreate} className={btnPrimaryCls}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              New event
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events match your search"
          description="Try a different word, or clear the search."
        />
      ) : (
        <>
          {group("Upcoming", upcoming)}
          {group("Past", past)}
        </>
      )}

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit event" : "New event"}
        description={
          editing
            ? "Changes are visible to the audience immediately."
            : undefined
        }
      >
        <form onSubmit={submitForm} className="space-y-4">
          <Field label="Title" htmlFor="event-title">
            <input
              id="event-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              maxLength={200}
              className={inputCls}
            />
          </Field>

          <Field label="Description" htmlFor="event-description">
            <textarea
              id="event-description"
              rows={3}
              maxLength={4000}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className={textareaCls}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date" htmlFor="event-date">
              <input
                id="event-date"
                type="date"
                required
                value={form.eventDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, eventDate: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Venue" htmlFor="event-venue">
              <input
                id="event-venue"
                maxLength={200}
                value={form.venue}
                onChange={(e) =>
                  setForm((f) => ({ ...f, venue: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Starts" htmlFor="event-start-time">
              <input
                id="event-start-time"
                type="time"
                value={form.startTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startTime: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
            <Field label="Ends" htmlFor="event-end-time">
              <input
                id="event-end-time"
                type="time"
                value={form.endTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endTime: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Audience" htmlFor="event-audience">
            <select
              id="event-audience"
              value={form.audience}
              onChange={(e) =>
                setForm((f) => ({ ...f, audience: e.target.value }))
              }
              className={inputCls}
            >
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>

          {role === "admin" ? (
            <Field
              label="Department scope"
              htmlFor="event-department"
              hint="Leave on All departments for an institution-wide event."
            >
              <select
                id="event-department"
                value={form.departmentId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departmentId: e.target.value }))
                }
                className={inputCls}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div>
              <p className={labelCls}>Department scope</p>
              <p className="flex items-center min-h-[48px] px-3 rounded-xl bg-kvsr-navy/[0.03] border border-kvsr-soft text-sm font-medium text-kvsr-ink">
                {ownDepartmentName ?? "Your department"}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-kvsr-soft bg-kvsr-navy/[0.02] p-4 space-y-3">
            <div>
              <p className={labelCls}>Budget planner</p>
              <p className="text-xs text-muted-foreground">
                Estimate costs for the expected headcount, then append a plan to
                the description.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Attendees" htmlFor="event-attendees" hint="At least 10.">
                <input
                  id="event-attendees"
                  type="number"
                  min={10}
                  max={5000}
                  inputMode="numeric"
                  value={planAttendees}
                  onChange={(e) => setPlanAttendees(e.target.value)}
                  placeholder="60"
                  className={inputCls}
                />
              </Field>
              <Field label="Budget (₹)" htmlFor="event-budget" hint="Minimum ₹1,000.">
                <input
                  id="event-budget"
                  type="number"
                  min={1000}
                  max={10000000}
                  inputMode="numeric"
                  value={planBudget}
                  onChange={(e) => setPlanBudget(e.target.value)}
                  placeholder="20000"
                  className={inputCls}
                />
              </Field>
            </div>
            {planError && <StatusMessage kind="error" text={planError} />}
            {planNote && <StatusMessage kind="success" text={planNote} />}
            <button
              type="button"
              onClick={generatePlans}
              disabled={planBusy}
              className={btnSecondaryCls}
            >
              {planBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : null}
              Generate 2 plans
            </button>

            {plans && plans.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {plans.map((plan) => (
                  <div
                    key={plan.name}
                    className="rounded-xl border border-kvsr-soft bg-white p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-kvsr-ink">{plan.name}</h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap ${
                          plan.fitsBudget
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {plan.fitsBudget ? (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        {plan.fitsBudget ? "Fits budget" : "Over budget"}
                      </span>
                    </div>
                    <ul className="divide-y divide-kvsr-soft text-sm">
                      {plan.items.map((item) => (
                        <li key={item.label} className="flex justify-between gap-3 py-1.5">
                          <span className="text-kvsr-ink">
                            {item.label}
                            {item.note && (
                              <span className="block text-xs text-muted-foreground">
                                {item.note}
                              </span>
                            )}
                          </span>
                          <span className="font-medium text-kvsr-ink whitespace-nowrap">
                            {fmtINR(item.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="text-sm border-t border-kvsr-soft pt-2 space-y-1">
                      <p className="flex justify-between font-semibold text-kvsr-ink">
                        <span>Total</span>
                        <span>{fmtINR(plan.total)}</span>
                      </p>
                      <p className="flex justify-between text-muted-foreground">
                        <span>Per head</span>
                        <span>{fmtINR(plan.perHead)}</span>
                      </p>
                    </div>
                    {plan.notes.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                        {plan.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => applyPlan(plan)}
                      className={`${btnSecondaryCls} w-full`}
                    >
                      Use this plan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formError && <StatusMessage kind="error" text={formError} />}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button type="button" onClick={closeForm} className={btnSecondaryCls}>
              Cancel
            </button>
            <button type="submit" disabled={busy} className={btnPrimaryCls}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {editing ? "Save changes" : "Create event"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete event"
        description="This removes the event for everyone."
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-kvsr-ink">
              Delete{" "}
              <span className="font-semibold">{deleteTarget.title}</span> (
              {audienceLabel(deleteTarget.audience)})? Students and faculty
              will no longer see it.
            </p>
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
                Delete event
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
