"use client";

import { useState } from "react";
import { Modal } from "./modal";
import { BiometricEnroll } from "./biometric-enroll";
import { Fingerprint, Check, Search } from "lucide-react";

export interface EnrollStudent {
  id: string;
  fullName: string;
  rollNumber: string;
  hasBiometric: boolean;
}

export function BiometricEnrollList({ students }: { students: EnrollStudent[] }) {
  const [active, setActive] = useState<EnrollStudent | null>(null);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const q = search.trim().toLowerCase();
  const visible = q
    ? students.filter(
        (s) => s.fullName.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
      )
    : students;

  const enrolledCount = students.filter((s) => s.hasBiometric).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name or roll number…"
            aria-label="Search students"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-kvsr-soft text-sm bg-white focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
          />
        </div>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          {enrolledCount} / {students.length} enrolled
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((s) => (
          <div
            key={s.id}
            className="p-4 rounded-2xl bg-white border border-kvsr-soft shadow-sm flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-kvsr-navy/[0.06] text-kvsr-navy text-xs font-bold shrink-0">
                {s.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-kvsr-ink truncate">{s.fullName}</p>
                <p className="text-xs text-muted-foreground">Roll #{s.rollNumber}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActive(s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                s.hasBiometric
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-kvsr-cta text-white border-kvsr-cta hover:bg-kvsr-cta/90"
              }`}
            >
              {s.hasBiometric ? <Check className="w-3.5 h-3.5" /> : <Fingerprint className="w-3.5 h-3.5" />}
              {s.hasBiometric ? "Re-enroll" : "Enroll"}
            </button>
          </div>
        ))}
      </div>

      <Modal
        open={!!active}
        onClose={() => {
          setActive(null);
          setRefreshKey((k) => k + 1);
        }}
        title={active ? `Enroll — ${active.fullName}` : ""}
        description={active ? `Roll #${active.rollNumber}` : undefined}
      >
        {active && <BiometricEnroll key={active.id + "-" + refreshKey} student={active} />}
      </Modal>
    </div>
  );
}
