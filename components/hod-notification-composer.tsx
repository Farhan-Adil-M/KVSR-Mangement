"use client";

import { useState, useTransition } from "react";
import { createDepartmentNotification } from "@/lib/actions/admin";

interface Props {
  departmentId: string;
  departmentName: string;
}

export function HodNotificationComposer({ departmentId, departmentName }: Props) {
  const [audience, setAudience] = useState<"students" | "faculty" | "both">("students");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await createDepartmentNotification({
        departmentId,
        audience,
        title,
        body,
      });
      if (res.success) {
        setTitle("");
        setBody("");
        setMessage(
          "Notification sent to " +
            departmentName +
            " (" +
            (audience === "both" ? "students & faculty" : audience) +
            ")."
        );
      } else {
        setMessage(res.error);
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-kvsr-soft bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-kvsr-navy">
        Notify {departmentName}
      </h2>
      <p className="text-sm text-muted-foreground">
        Send a message to your department students, faculty, or both.
      </p>

      <div className="mt-4 flex gap-2">
        {(["students", "faculty", "both"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAudience(a)}
            className={
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize " +
              (audience === a
                ? "bg-kvsr-orange text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200")
            }
          >
            {a}
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-orange"
        required
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message"
        rows={3}
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-orange"
        required
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-kvsr-navy px-4 py-2 text-sm font-medium text-white hover:bg-kvsr-navy/90 disabled:opacity-50"
        >
          Send Notification
        </button>
        {message && <span className="text-sm text-kvsr-orange">{message}</span>}
      </div>
    </form>
  );
}
