import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { requireHodOnly } from "@/lib/auth/guards";
import { getRatingSummaries } from "@/lib/actions/ratings";
import type { RatingSummaryRow } from "@/lib/actions/ratings";
import { getAppConfig } from "@/lib/app-config";
import { Star } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Faculty Ratings | ${config.institutionShortName} Management`,
  };
}

const commentDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function StarRow({ average }: { average: number }) {
  const filled = Math.round(average);
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={n <= filled ? "w-4 h-4 text-kvsr-gold" : "w-4 h-4 text-kvsr-muted/40"}
          fill={n <= filled ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function FacultyRatingCard({ summary }: { summary: RatingSummaryRow }) {
  return (
    <article className="p-5 sm:p-6 rounded-2xl bg-white border border-kvsr-soft shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-kvsr-ink truncate">
            {summary.facultyName}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary.departmentName ?? "Department not assigned"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold text-kvsr-navy leading-none">
            {summary.average.toFixed(1)}
          </p>
          <div className="mt-1.5 flex justify-end">
            <StarRow average={summary.average} />
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-3">
        {summary.count} rating{summary.count !== 1 ? "s" : ""}
      </p>

      {summary.latestComments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-kvsr-soft space-y-3">
          {summary.latestComments.map((comment, index) => (
            <blockquote
              key={`${comment.createdAt}-${index}`}
              className="border-l-2 border-kvsr-gold/50 pl-3"
            >
              {comment.comment && (
                <p className="text-sm text-kvsr-ink">&ldquo;{comment.comment}&rdquo;</p>
              )}
              <footer className="text-xs text-muted-foreground mt-1">
                {comment.rating}/5 · {comment.subjectName} ·{" "}
                {commentDateFormatter.format(new Date(comment.createdAt))}
              </footer>
            </blockquote>
          ))}
        </div>
      )}
    </article>
  );
}

export default async function FacultyRatingsPage() {
  await requireHodOnly();

  const summaries = await getRatingSummaries();

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Faculty Ratings"
          subtitle="Anonymous student feedback for your department"
          breadcrumbs={[{ label: "Faculty Ratings" }]}
        />

        {summaries.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No ratings yet"
            description="Ratings appear once students rate faculty from their portal."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {summaries.map((summary) => (
              <FacultyRatingCard key={summary.facultyId} summary={summary} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
