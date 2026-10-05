import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getStudentContext, requireStudent } from "@/lib/auth/guards";
import { getStudentMarks } from "@/lib/db/portal-queries";
import { getAppConfig } from "@/lib/app-config";
import { Award } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `My Marks | ${config.institutionShortName} Management`,
  };
}

const BUCKET_ORDER = [
  { key: "internal", label: "Internal" },
  { key: "external", label: "External" },
  { key: "assignment", label: "Assignments" },
  { key: "other", label: "Other" },
] as const;

type BucketKey = (typeof BUCKET_ORDER)[number]["key"];

function bucketFor(examType: string): BucketKey {
  if (examType === "internal" || examType === "external" || examType === "assignment") {
    return examType;
  }
  return "other";
}

function typeLabel(examType: string): string {
  if (examType === "midterm") return "Mid-term";
  return examType.charAt(0).toUpperCase() + examType.slice(1);
}

export default async function StudentMarksPage() {
  const session = await requireStudent();
  const ctx = await getStudentContext(session.id);

  if (!ctx) {
    return (
      <div className="p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="My Marks"
            breadcrumbs={[{ label: "Student", href: "/student/dashboard" }, { label: "My Marks" }]}
          />
          <EmptyState
            icon={Award}
            title="No active enrollment"
            description="You are not enrolled in a section for the current academic year."
          />
        </div>
      </div>
    );
  }

  const [marks, config] = await Promise.all([
    getStudentMarks(session.id),
    getAppConfig(),
  ]);

  const bySubject = new Map<string, typeof marks>();
  for (const m of marks) {
    if (!bySubject.has(m.subject)) bySubject.set(m.subject, []);
    bySubject.get(m.subject)!.push(m);
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="My Marks"
          subtitle={`${ctx.yearLabel}-${ctx.sectionName} · Roll #${ctx.rollNumber}`}
          breadcrumbs={[{ label: "Student", href: "/student/dashboard" }, { label: "My Marks" }]}
        />

        {marks.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No marks published yet"
            description="When your faculty records test marks, they appear here."
          />
        ) : (
          <div className="space-y-6">
            {Array.from(bySubject.entries()).map(([subject, rows]) => {
              const buckets = new Map<BucketKey, typeof rows>();
              for (const m of rows) {
                const key = bucketFor(m.examType);
                const list = buckets.get(key) ?? [];
                list.push(m);
                buckets.set(key, list);
              }
              return (
                <div key={subject}>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {subject}
                  </h2>
                  <div className="bg-white rounded-2xl border border-kvsr-soft shadow-sm overflow-hidden">
                    {BUCKET_ORDER.map((bucket, bucketIndex) => {
                      const bucketRows = buckets.get(bucket.key) ?? [];
                      if (bucketRows.length === 0) return null;
                      return (
                        <div
                          key={bucket.key}
                          className={bucketIndex > 0 ? "border-t border-kvsr-soft" : undefined}
                        >
                          <p className="px-5 pt-4 pb-1 text-xs font-bold text-kvsr-muted uppercase tracking-wider">
                            {bucket.label}
                          </p>
                          <div className="divide-y divide-kvsr-soft">
                            {bucketRows.map((m) => {
                              const pct = Math.round(
                                (Number(m.marksObtained) / Number(m.maxMarks)) * 100
                              );
                              const showType =
                                bucket.key === "other" && m.examType !== "other";
                              return (
                                <div
                                  key={m.id}
                                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                  <div>
                                    <p className="font-medium text-kvsr-ink">{m.title}</p>
                                    {showType && (
                                      <p className="text-xs text-muted-foreground">
                                        {typeLabel(m.examType)}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-kvsr-ink">
                                      {Number(m.marksObtained)}
                                      <span className="text-sm text-muted-foreground font-normal">
                                        {" "}/ {Number(m.maxMarks)}
                                      </span>
                                    </span>
                                    <span
                                      className={`text-sm font-semibold w-12 text-right ${
                                        pct >= config.marksGoodPct
                                          ? "text-emerald-600"
                                          : pct >= config.marksWarnPct
                                          ? "text-amber-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {pct}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
