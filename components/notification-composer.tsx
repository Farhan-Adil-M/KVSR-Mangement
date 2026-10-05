"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { createNotification } from "@/lib/actions/admin";

export function NotificationComposer() {
  const [target, setTarget] = useState<"faculty" | "student" | "both">("student");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsPending(true);
    void (async () => {
      try {
        const res = await createNotification({
          targetRole: target,
          title,
          body,
        });
        if (res.success) {
          setTitle("");
          setBody("");
          setMessage("Notification sent.");
        } else {
          setMessage(res.error);
        }
      } finally {
        setIsPending(false);
      }
    })();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 p-1 bg-kvsr-navy/[0.04] rounded-xl">
        {(
          [
            { value: "student", label: "To all students" },
            { value: "faculty", label: "To all faculty" },
            { value: "both", label: "Both (faculty + students)" },
          ] as const
        ).map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setTarget(r.value)}
            aria-pressed={target === r.value}
            className={`py-2.5 px-2 min-h-[44px] rounded-lg text-sm font-medium transition-all ${
              target === r.value
                ? "bg-white text-kvsr-ink shadow-sm"
                : "text-muted-foreground hover:text-kvsr-ink"
            } ${r.value === "both" ? "col-span-2" : ""}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="notif-title" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Title
        </label>
        <input
          id="notif-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Mid-term timetable released"
          className="w-full px-4 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
        />
      </div>

      <div>
        <label htmlFor="notif-body" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Message
        </label>
        <textarea
          id="notif-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={2000}
          rows={4}
          placeholder="Write the announcement…"
          className="w-full px-4 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
        />
      </div>

      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-2.5 bg-kvsr-cta text-white text-sm font-medium rounded-xl hover:bg-kvsr-cta/90 disabled:opacity-50 flex items-center gap-2"
      >
        <Send className="w-4 h-4" />
        {isPending ? "Sending…" : "Send Notification"}
      </button>
    </form>
  );
}
