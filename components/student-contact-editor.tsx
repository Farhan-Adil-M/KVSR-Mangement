"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setMyContact } from "@/lib/actions/student-contact";
import { Modal } from "@/components/modal";
import {
  Field,
  StatusMessage,
  btnPrimaryCls,
  btnSecondaryCls,
  inputCls,
  labelCls,
} from "@/components/form-controls";
import { Loader2, Lock, Mail, Pencil, Phone, ShieldCheck } from "lucide-react";

const PHONE_RE = /^[0-9+\-\s]{6,15}$/;

interface StudentContactEditorProps {
  phone: string | null;
  email: string | null;
  /** ISO timestamp when the student locked their contact; null = unlocked. */
  contactLockedAt: string | null;
  /** Preformatted lock date rendered as-is; avoids client/server locale drift. */
  contactLockedOn: string | null;
}

export function StudentContactEditor({
  phone,
  email,
  contactLockedAt,
  contactLockedOn,
}: StudentContactEditorProps) {
  const router = useRouter();
  const locked = contactLockedAt !== null;
  const hasValues = Boolean(phone || email);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: phone ?? "", email: email ?? "" });
  const [lockWarningOpen, setLockWarningOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const phoneValid = PHONE_RE.test(form.phone.trim());
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim());
  const formValid = phoneValid && emailValid;

  async function lockContact() {
    setLockWarningOpen(false);
    setError(null);
    setBusy(true);
    const res = await setMyContact({
      phone: form.phone.trim(),
      email: form.email.trim(),
    });
    setBusy(false);
    if (res.success) {
      setEditing(false);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  if (locked) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl bg-kvsr-navy/[0.03] border border-kvsr-soft p-4">
          <Lock className="w-5 h-5 text-kvsr-muted shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-kvsr-ink flex items-center gap-2">
              Locked
              <span className="text-xs font-medium text-kvsr-muted">
                · contact your HOD to change
              </span>
            </p>
            <div className="mt-2 space-y-1.5">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
                {phone ?? "Not set"}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-2 break-all">
                <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                {email ?? "Not set"}
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          You confirmed this contact info on {contactLockedOn}. Only your HOD
          can change it now.
        </p>
      </div>
    );
  }

  if (!editing && hasValues) {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Phone className="w-4 h-4 shrink-0" aria-hidden="true" />
            {phone ?? "Not set"}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-2 break-all">
            <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
            {email ?? "Not set"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({ phone: phone ?? "", email: email ?? "" });
            setError(null);
            setEditing(true);
          }}
          className={btnSecondaryCls}
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
          Edit &amp; lock
        </button>
        <p className="text-xs text-muted-foreground">
          Confirming locks your contact info permanently.
        </p>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setLockWarningOpen(true);
        }}
        className="space-y-4"
      >
        <Field label="Phone" htmlFor="contact-phone">
          <input
            id="contact-phone"
            type="tel"
            inputMode="tel"
            required
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <Field
          label="Email"
          htmlFor="contact-email"
          hint="Used for your account — make sure it is correct before locking."
        >
          <input
            id="contact-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={inputCls}
          />
        </Field>

        {form.phone.trim() !== "" && !phoneValid && (
          <StatusMessage
            kind="error"
            text="Phone can use digits, spaces, + and - only (6–15 characters)."
          />
        )}
        {form.email.trim() !== "" && !emailValid && (
          <StatusMessage kind="error" text="Enter a valid email address." />
        )}
        {error && <StatusMessage kind="error" text={error} />}

        <button type="submit" disabled={busy || !formValid} className={btnPrimaryCls}>
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          )}
          Confirm &amp; lock
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className={`${btnSecondaryCls} ml-2`}
          >
            Cancel
          </button>
        )}
      </form>

      <Modal
        open={lockWarningOpen}
        onClose={() => setLockWarningOpen(false)}
        title="Lock your contact info?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-amber-800 font-medium">
              This locks your contact info permanently. Only your HOD can
              change it later.
            </p>
          </div>
          <div>
            <p className={labelCls}>You are about to save</p>
            <p className="text-sm text-kvsr-ink">{form.phone.trim()}</p>
            <p className="text-sm text-kvsr-ink break-all">{form.email.trim()}</p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setLockWarningOpen(false)}
              className={btnSecondaryCls}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={lockContact}
              disabled={busy}
              className={btnPrimaryCls}
            >
              {busy && (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              )}
              I understand — lock it
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
