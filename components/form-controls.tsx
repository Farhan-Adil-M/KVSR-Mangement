"use client";

export const inputCls =
  "w-full bg-white border border-kvsr-soft rounded-xl px-3 py-2.5 min-h-[48px] text-sm text-kvsr-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold";

export const textareaCls =
  "w-full bg-white border border-kvsr-soft rounded-xl px-3 py-2.5 text-sm text-kvsr-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold";

export const labelCls =
  "block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5";

export const btnPrimaryCls =
  "inline-flex items-center justify-center gap-2 px-5 min-h-[48px] sm:min-h-[40px] rounded-xl bg-kvsr-navy text-white text-sm font-semibold shadow-sm hover:bg-kvsr-navy/90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold";

export const btnSecondaryCls =
  "inline-flex items-center justify-center gap-2 px-4 min-h-[48px] sm:min-h-[40px] rounded-xl border border-kvsr-soft bg-white text-sm font-semibold text-kvsr-ink shadow-sm hover:border-kvsr-navy/40 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold";

export const btnDangerCls =
  "inline-flex items-center justify-center gap-2 px-4 min-h-[48px] sm:min-h-[40px] rounded-xl bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40";

export const iconBtnCls =
  "inline-flex items-center justify-center w-12 h-12 sm:w-10 sm:h-10 rounded-xl border border-kvsr-soft bg-white text-kvsr-muted hover:text-kvsr-ink hover:border-kvsr-navy/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold";

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

interface StatusMessageProps {
  kind: "success" | "error";
  text: string;
}

export function StatusMessage({ kind, text }: StatusMessageProps) {
  return (
    <p
      role="status"
      className={`text-sm ${kind === "success" ? "text-emerald-600" : "text-destructive"}`}
    >
      {text}
    </p>
  );
}
