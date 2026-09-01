"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, GraduationCap, Loader2 } from "lucide-react";
import { createDepartment, createProgram } from "@/lib/actions/admin";

interface ProgramItem {
  id: string;
  code: string | null;
  name: string | null;
  durationYears: number | null;
}

export interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  programs: ProgramItem[];
}

const inputCls =
  "w-full bg-white border border-kvsr-soft rounded-xl px-3 py-2.5 text-sm text-kvsr-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold";
const labelCls =
  "block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5";

export function DepartmentsProgramsManager({
  departments,
}: {
  departments: DepartmentItem[];
}) {
  const router = useRouter();
  const [showAddDept, setShowAddDept] = useState(false);
  const [deptForm, setDeptForm] = useState({ code: "", name: "" });
  const [deptMsg, setDeptMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [deptBusy, setDeptBusy] = useState(false);

  const [openProgramFor, setOpenProgramFor] = useState<string | null>(null);
  const [progForm, setProgForm] = useState({ code: "", name: "", duration: "4" });
  const [progMsg, setProgMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [progBusy, setProgBusy] = useState(false);

  async function submitDepartment(e: React.FormEvent) {
    e.preventDefault();
    setDeptMsg(null);
    setDeptBusy(true);
    const res = await createDepartment(deptForm);
    setDeptBusy(false);
    if (res.success) {
      setDeptForm({ code: "", name: "" });
      setShowAddDept(false);
      router.refresh();
    } else {
      setDeptMsg({ ok: false, text: res.error });
    }
  }

  function openProgram(deptId: string) {
    setOpenProgramFor((cur) => (cur === deptId ? null : deptId));
    setProgForm({ code: "", name: "", duration: "4" });
    setProgMsg(null);
  }

  async function submitProgram(e: React.FormEvent, departmentId: string) {
    e.preventDefault();
    setProgMsg(null);
    setProgBusy(true);
    const res = await createProgram({
      departmentId,
      code: progForm.code,
      name: progForm.name,
      durationYears: Number(progForm.duration),
    });
    setProgBusy(false);
    if (res.success) {
      setOpenProgramFor(null);
      router.refresh();
    } else {
      setProgMsg({ ok: false, text: res.error });
    }
  }

  return (
    <div className="space-y-5">
      {/* Add department */}
      {!showAddDept ? (
        <button
          type="button"
          onClick={() => setShowAddDept(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-kvsr-soft bg-white text-sm font-semibold text-kvsr-ink shadow-sm hover:border-kvsr-navy/40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      ) : (
        <form
          onSubmit={submitDepartment}
          className="p-5 rounded-xl border border-kvsr-soft bg-kvsr-navy/[0.02] space-y-3"
        >
          <p className="text-sm font-semibold text-kvsr-ink">New Department</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Code</label>
              <input
                value={deptForm.code}
                onChange={(e) => setDeptForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="CSE"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Name</label>
              <input
                value={deptForm.name}
                onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Computer Science & Engineering"
                className={inputCls}
                required
              />
            </div>
          </div>
          {deptMsg && (
            <p className={`text-sm ${deptMsg.ok ? "text-emerald-600" : "text-destructive"}`}>
              {deptMsg.text}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={deptBusy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-kvsr-navy text-white text-sm font-semibold hover:bg-kvsr-navy/90 disabled:opacity-50"
            >
              {deptBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Department
            </button>
            <button
              type="button"
              onClick={() => setShowAddDept(false)}
              className="px-4 py-2 rounded-xl border border-kvsr-soft text-sm font-medium text-slate-700 hover:bg-kvsr-navy/[0.04]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Department list */}
      {departments.map((dept) => (
        <div
          key={dept.id}
          className="p-5 rounded-xl border border-kvsr-soft bg-kvsr-navy/[0.02] space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-kvsr-navy text-white text-xs font-bold">
                {dept.code}
              </span>
              <h4 className="font-semibold text-kvsr-ink">{dept.name}</h4>
            </div>
            <button
              type="button"
              onClick={() => openProgram(dept.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-kvsr-soft bg-white text-xs font-semibold text-kvsr-ink shadow-sm hover:border-kvsr-navy/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Program
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {dept.programs.length > 0 ? (
              dept.programs.map((program) => (
                <span
                  key={program.id}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-kvsr-soft text-sm text-slate-700 shadow-sm"
                >
                  <GraduationCap className="w-4 h-4 text-kvsr-cta" />
                  {program.name} ({program.durationYears} years)
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-700 italic">No programs yet — add one.</p>
            )}
          </div>

          {openProgramFor === dept.id && (
            <form
              onSubmit={(e) => submitProgram(e, dept.id)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2"
            >
              <div>
                <label className={labelCls}>Code</label>
                <input
                  value={progForm.code}
                  onChange={(e) => setProgForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="CSE-BTECH"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Name</label>
                <input
                  value={progForm.name}
                  onChange={(e) => setProgForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="B.Tech CSE"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Duration (years)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={progForm.duration}
                  onChange={(e) => setProgForm((f) => ({ ...f, duration: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>
              {progMsg && (
                <p className={`text-sm sm:col-span-3 ${progMsg.ok ? "text-emerald-600" : "text-destructive"}`}>
                  {progMsg.text}
                </p>
              )}
              <div className="flex gap-2 sm:col-span-3">
                <button
                  type="submit"
                  disabled={progBusy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-kvsr-navy text-white text-sm font-semibold hover:bg-kvsr-navy/90 disabled:opacity-50"
                >
                  {progBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Program
                </button>
                <button
                  type="button"
                  onClick={() => setOpenProgramFor(null)}
                  className="px-4 py-2 rounded-xl border border-kvsr-soft text-sm font-medium text-slate-700 hover:bg-kvsr-navy/[0.04]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ))}

      {departments.length === 0 && (
        <p className="text-sm text-slate-700">
          No departments yet. Use &quot;Add Department&quot; above.
        </p>
      )}
    </div>
  );
}
