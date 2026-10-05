import { DashboardHeader } from "@/components/dashboard-header";
import { requireAdmin } from "@/lib/auth/guards";
import { FacultyList } from "@/components/faculty-list";
import { getFacultyList } from "@/lib/db/queries";
import { getRatingSummaries } from "@/lib/actions/ratings";
import { getAppConfig } from "@/lib/app-config";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Faculty | ${config.institutionShortName} Management`,
  };
}

interface FacultyPageProps {
  searchParams: { search?: string };
}

export default async function FacultyPage({ searchParams }: FacultyPageProps) {
  await requireAdmin();
  const searchQuery = searchParams.search || "";
  const [faculty, ratingSummaries] = await Promise.all([
    getFacultyList(searchQuery || undefined),
    getRatingSummaries(),
  ]);

  const ratings: Record<string, { average: number; count: number }> = {};
  for (const row of ratingSummaries) {
    ratings[row.facultyId] = { average: row.average, count: row.count };
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Faculty"
          subtitle="Directory of teaching staff and their schedules"
        />

        <FacultyList faculty={faculty} searchQuery={searchQuery} ratings={ratings} />
      </div>
    </div>
  );
}
