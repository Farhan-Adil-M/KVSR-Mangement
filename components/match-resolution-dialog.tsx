"use client";

import { Check, ShieldCheck, TriangleAlert } from "lucide-react";
import { Modal } from "./modal";

export interface MatchCandidate {
  studentId: string;
  fullName: string;
  rollNumber: string;
  distance: number;
}

interface MatchResolutionDialogProps {
  open: boolean;
  candidates: MatchCandidate[];
  matchThreshold: number;
  onClose: () => void;
  onKeep: (studentId: string) => void;
  onNotPresent: () => void;
  onUnknown: () => void;
}

function initials(fullName: string) {
  return fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function closeness(distance: number, matchThreshold: number) {
  const pct = Math.round(
    Math.max(5, Math.min(100, (1 - distance / (2 * matchThreshold)) * 100))
  );
  const label =
    distance <= matchThreshold * 0.7
      ? "Very close"
      : distance <= matchThreshold * 0.85
      ? "Close"
      : "Possible";
  return { pct, label };
}

export function MatchResolutionDialog({
  open,
  candidates,
  matchThreshold,
  onClose,
  onKeep,
  onNotPresent,
  onUnknown,
}: MatchResolutionDialogProps) {
  const best = candidates[0];
  const alternates = candidates.slice(1);

  if (!best) return null;

  const bestCloseness = closeness(best.distance, matchThreshold);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Who is this face?"
      description="The photo looks like more than one enrolled student. Confirm the right one."
    >
      <div className="space-y-4">
        <p className="text-xs font-semibold text-kvsr-muted uppercase tracking-wider">
          Best match
        </p>
        <button
          type="button"
          onClick={() => onKeep(best.studentId)}
          className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-kvsr-navy/20 bg-kvsr-navy/[0.04] hover:border-kvsr-navy/50 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold min-h-[48px]"
        >
          <div className="w-12 h-12 rounded-xl bg-kvsr-navy/[0.06] flex items-center justify-center text-kvsr-navy font-bold shrink-0">
            {initials(best.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-kvsr-ink truncate">{best.fullName}</p>
            <p className="text-xs text-muted-foreground">Roll #{best.rollNumber}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold text-kvsr-cta">
                {bestCloseness.label}
              </span>
              <div
                className="h-1.5 flex-1 max-w-[120px] rounded-full bg-kvsr-soft overflow-hidden"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-kvsr-cta"
                  style={{ width: `${bestCloseness.pct}%` }}
                />
              </div>
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-kvsr-navy text-white text-xs font-semibold">
            <Check className="w-4 h-4" />
            Confirm
          </span>
        </button>

        {alternates.length > 0 && (
          <>
            <p className="text-xs font-semibold text-kvsr-muted uppercase tracking-wider pt-1">
              Other close matches
            </p>
            <ul className="space-y-2">
              {alternates.map((c) => {
                const cl = closeness(c.distance, matchThreshold);
                return (
                  <li key={c.studentId}>
                    <button
                      type="button"
                      onClick={() => onKeep(c.studentId)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-kvsr-soft hover:border-kvsr-navy/40 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold min-h-[48px]"
                    >
                      <div className="w-10 h-10 rounded-lg bg-kvsr-navy/[0.06] flex items-center justify-center text-kvsr-navy text-sm font-bold shrink-0">
                        {initials(c.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-kvsr-ink truncate text-sm">
                          {c.fullName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground shrink-0">
                            Roll #{c.rollNumber} · {cl.label}
                          </span>
                          <div
                            className="h-1.5 flex-1 max-w-[90px] rounded-full bg-kvsr-soft overflow-hidden"
                            aria-hidden="true"
                          >
                            <div
                              className="h-full rounded-full bg-kvsr-gold"
                              style={{ width: `${cl.pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onNotPresent}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-xl border border-kvsr-soft text-sm font-semibold text-kvsr-ink hover:border-kvsr-navy/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
          >
            <TriangleAlert className="w-4 h-4 text-amber-600" />
            Not present
          </button>
          <button
            type="button"
            onClick={onUnknown}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-xl border border-kvsr-soft text-sm font-semibold text-kvsr-ink hover:border-kvsr-navy/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
          >
            <ShieldCheck className="w-4 h-4 text-kvsr-navy" />
            Unknown — pick from roster
          </button>
        </div>
      </div>
    </Modal>
  );
}
