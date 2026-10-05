"use client";

import { useState } from "react";
import { rateFaculty } from "@/lib/actions/ratings";
import type { RateableFacultyRow } from "@/lib/actions/ratings";
import { StatusMessage, btnPrimaryCls } from "@/components/form-controls";
import { Loader2, Star, UserRound } from "lucide-react";

const RATING_WORDS: Record<number, string> = {
  1: "Very poor",
  2: "Below average",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

function RatingCard({ row }: { row: RateableFacultyRow }) {
  const [rating, setRating] = useState(row.myRating ?? 0);
  const [comment, setComment] = useState(row.myComment ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, setIsPending] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaved(false);
    if (rating < 1) {
      setMessage("Tap a star to rate first.");
      return;
    }
    setIsPending(true);
    void (async () => {
      try {
        const trimmed = comment.trim();
        const res = await rateFaculty({
          facultyId: row.facultyId,
          subjectId: row.subjectId,
          rating,
          ...(trimmed ? { comment: trimmed } : {}),
        });
        if (res.success) {
          setSaved(true);
          setMessage("Rating saved. Thank you!");
        } else {
          setMessage(res.error);
        }
      } finally {
        setIsPending(false);
      }
    })();
  }

  return (
    <form
      onSubmit={submit}
      className="p-5 sm:p-6 rounded-2xl bg-white border border-kvsr-soft shadow-sm space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-kvsr-navy/5 flex items-center justify-center shrink-0">
          <UserRound className="w-5 h-5 text-kvsr-navy" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-kvsr-ink truncate">{row.facultyName}</p>
          <p className="text-xs font-medium text-kvsr-cta mt-0.5">{row.subjectName}</p>
        </div>
      </div>

      <div>
        <p className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Your rating
        </p>
        <div
          role="radiogroup"
          aria-label={`Rate ${row.facultyName} from 1 to 5 stars`}
          className="flex items-center gap-1"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""} — ${RATING_WORDS[n]}`}
              onClick={() => {
                setRating(n);
                setSaved(false);
              }}
              className="w-12 h-12 rounded-xl inline-flex items-center justify-center hover:bg-kvsr-navy/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
            >
              <Star
                className={n <= rating ? "w-7 h-7 text-kvsr-gold" : "w-7 h-7 text-kvsr-muted/40"}
                fill={n <= rating ? "currentColor" : "none"}
                aria-hidden="true"
              />
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-kvsr-ink" aria-hidden="true">
            {rating > 0 ? `${rating} / 5` : "—"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5" aria-live="polite">
          {rating > 0 ? `${rating} of 5 — ${RATING_WORDS[rating]}` : "Tap a star to rate"}
        </p>
      </div>

      <div>
        <label
          htmlFor={`rating-comment-${row.facultyId}`}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          Comment (optional)
        </label>
        <textarea
          id={`rating-comment-${row.facultyId}`}
          rows={2}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What should they keep doing?"
          className="w-full bg-white border border-kvsr-soft rounded-xl px-3 py-2.5 text-sm text-kvsr-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isPending} className={btnPrimaryCls}>
          {isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {isPending ? "Saving…" : saved ? "Saved" : "Save rating"}
        </button>
        {message && (
          <StatusMessage kind={saved ? "success" : "error"} text={message} />
        )}
      </div>
    </form>
  );
}

export function FacultyRatings({ rows }: { rows: RateableFacultyRow[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {rows.map((row) => (
        <RatingCard key={`${row.facultyId}-${row.subjectId}`} row={row} />
      ))}
    </div>
  );
}
