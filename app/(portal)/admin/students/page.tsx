import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { getStudentAnalytics, type StudentAnalyticsRow } from "@/lib/db/portal-queries";
import { getSections } from "@/lib/db/queries";
import { requireAdmin } from "@/lib/auth/guards";
import { Search, GraduationCap, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export const metadata = { title: "Student Performance | KVSR Management" };

interface PageProps {
  searchParams: {
    q?: string;
    section?: string;
    year?: string;
    bucket?: string;
    sort?: string;
  };
}

const BUCKETS = [
  { value: "all", label: "All Students" },
  { value: "best", label: "Best Performing" },
  { value: "attention", label: "Needs Attention" },
  { value: "low-attendance", label: "Low Attendance" },
];

const SORTS = [
  { value: "overall_desc", label: "Overall ↓" },
  { value: "overall_asc", label: "Overall ↑" },
  { value: "attendance_asc", label: "Attendance ↑" },
  { value: "academic_desc", label: "Academic ↓" },
  { value: "behaviour_desc", label: "Behaviour ↓" },
  { value: "participation_desc", label: "Participation ↓" },
];

function badgeFor(row: StudentAnalyticsRow) {
  const badges: { label: string; className: string }[] = [];
  if (row.overallPct != null && row.overallPct >= 80) {
    badges.push({ label: "Best Performing", className: "bg-emerald-50 text-emerald-700 border-emerald-200" });
  }
  if (row.attendancePct != null && row.attendancePct < 75) {
    badges.push({ label: "Low Attendance", className: "bg-amber-50 text-amber-700 border-amber-200" });
  }
  if (
    (row.overallPct != null && row.overallPct < 50) ||
    (row.attendancePct != null && row.attendancePct < 75)
  ) {
    badges.push({ label: "Needs Attention", className: "bg-red-50 text-red-700 border-red-200" });
  }
  return badges;
}

export default async function AdminStudentsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const [all, sections] = await Promise.all([getStudentAnalytics(), getSections()]);

  const q = (searchParams.q ?? "").trim().toLowerCase();
  const section = searchParams.section ?? "all";
  const year = searchParams.year ?? "all";
  const bucket = searchParams.bucket ?? "all";
  const sort = searchParams.sort ?? "overall_desc";

  let rows = all;

  if (q) {
    rows = rows.filter(
      (r) => r.fullName.toLowerCase().includes(q) || r.rollNumber.toLowerCase().includes(q)
    );
  }
  if (section !== "all") rows = rows.filter((r) => r.section === section);
  if (year !== "all") rows = rows.filter((r) => r.year === year);

  if (bucket === "best") {
    rows = rows.filter((r) => r.overallPct != null && r.overallPct >= 80);
  } else if (bucket === "attention") {
    rows = rows.filter(
      (r) => (r.overallPct != null && r.overallPct < 50) || (r.attendancePct != null && r.attendancePct < 75)
    );
  } else if (bucket === "low-attendance") {
    rows = rows.filter((r) => r.attendancePct != null && r.attendancePct < 75);
  }

  const byNum = (v: number | null) => (v == null ? -1 : v);
  rows = [...rows].sort((a, b) => {
    switch (sort) {
      case "overall_asc":
        return byNum(a.overallPct) - byNum(b.overallPct);
      case "attendance_asc":
        return byNum(a.attendancePct) - byNum(b.attendancePct);
      case "academic_desc":
        return byNum(b.academic ? Number(b.academic) : null) - byNum(a.academic ? Number(a.academic) : null);
      case "behaviour_desc":
        return byNum(b.behaviour ? Number(b.behaviour) : null) - byNum(a.behaviour ? Number(a.behaviour) : null);
      case "participation_desc":
        return byNum(b.participation ? Number(b.participation) : null) - byNum(a.participation ? Number(a.participation) : null);
      default:
        return byNum(b.overallPct) - byNum(a.overallPct);
    }
  });

  const link = (params: Partial<PageProps["searchParams"]>) => {
    const merged = { q: searchParams.q, section, year, bucket, sort, ...params };
    const sp = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v && v !== "all") sp.set(k, v);
    });
    const qs = sp.toString();
    return `/admin/students${qs ? `?${qs}` : ""}`;
  };

  const years = Array.from(new Set(sections.map((s) => s.year)));

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Student Performance"
          subtitle="Analytics across attendance and aggregated faculty evaluations"
        />

        {/* Filters */}
        <div className="p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm space-y-4 mb-6">
          <form action="/admin/students" method="GET" className="flex flex-col sm:flex-row gap-3">
            <input type="hidden" name="section" value={section} />
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="bucket" value={bucket} />
            <input type="hidden" name="sort" value={sort} />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted" />
              <input
                type="text"
                name="q"
                defaultValue={searchParams.q ?? ""}
                placeholder="Search by name or roll number"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
              />
            </div>
            <button className="px-5 py-2.5 bg-kvsr-navy text-white text-sm font-medium rounded-xl hover:bg-kvsr-navy/90">
              Search
            </button>
          </form>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              {BUCKETS.map((b) => (
                <a
                  key={b.value}
                  href={link({ bucket: b.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    bucket === b.value
                      ? "bg-kvsr-navy text-white"
                      : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft hover:border-kvsr-navy/30"
                  }`}
                >
                  {b.label}
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Section</p>
              <div className="flex flex-wrap gap-2">
                <a href={link({ section: "all" })} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${section === "all" ? "bg-kvsr-navy text-white" : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft"}`}>All</a>
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={link({ section: s.name })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${section === s.name ? "bg-kvsr-navy text-white" : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft"}`}
                  >
                    {s.year}-{s.name}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Year</p>
              <div className="flex flex-wrap gap-2">
                <a href={link({ year: "all" })} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${year === "all" ? "bg-kvsr-cta text-white" : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft"}`}>All</a>
                {years.map((y) => (
                  <a key={y} href={link({ year: y })} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${year === y ? "bg-kvsr-cta text-white" : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft"}`}>{y}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Sort by</p>
              <div className="flex flex-wrap gap-2">
                {SORTS.map((s) => (
                  <a
                    key={s.value}
                    href={link({ sort: s.value })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${sort === s.value ? "bg-kvsr-gold text-kvsr-deep" : "bg-kvsr-navy/[0.03] text-kvsr-ink border border-kvsr-soft"}`}
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Overall score = Academic×50% + Behaviour×20% + Participation×30%, averaged across all evaluating faculty.
            Needs Attention: overall &lt; 50 or attendance &lt; 75%. Low Attendance: &lt; 75%.
          </p>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No students match these filters" />
        ) : (
          <div className="bg-white rounded-2xl border border-kvsr-soft shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="bg-kvsr-navy/[0.03] text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-3 py-3">Class</th>
                  <th className="px-3 py-3">Attendance</th>
                  <th className="px-3 py-3">Academic</th>
                  <th className="px-3 py-3">Behaviour</th>
                  <th className="px-3 py-3">Participation</th>
                  <th className="px-3 py-3">Overall</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kvsr-soft">
                {rows.map((r) => {
                  const badges = badgeFor(r);
                  return (
                    <tr key={r.id} className="hover:bg-kvsr-navy/[0.02]">
                      <td className="px-5 py-3">
                        <p className="font-medium text-kvsr-ink">{r.fullName}</p>
                        <p className="text-xs text-muted-foreground">{r.rollNumber}</p>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                        {r.year}-{r.section}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {r.attendancePct != null ? `${r.attendancePct}%` : "—"}
                        <span className="text-xs text-muted-foreground font-normal">
                          {" "}({r.attended ?? 0}/{r.held ?? 0})
                        </span>
                      </td>
                      <td className="px-3 py-3">{r.academic ? Number(r.academic).toFixed(1) : "—"}</td>
                      <td className="px-3 py-3">{r.behaviour ? Number(r.behaviour).toFixed(1) : "—"}</td>
                      <td className="px-3 py-3">{r.participation ? Number(r.participation).toFixed(1) : "—"}</td>
                      <td className="px-3 py-3 font-bold text-kvsr-ink">
                        {r.overallPct != null ? `${r.overallPct}%` : "—"}
                        {r.evaluators ? (
                          <span className="text-xs text-muted-foreground font-normal"> ({r.evaluators})</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {badges.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          {badges.map((b) => (
                            <span key={b.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${b.className}`}>
                              {b.label === "Needs Attention" && <AlertTriangle className="w-3 h-3" />}
                              {b.label === "Best Performing" && <TrendingUp className="w-3 h-3" />}
                              {b.label === "Low Attendance" && <TrendingDown className="w-3 h-3" />}
                              {b.label}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
