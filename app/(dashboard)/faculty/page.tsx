import { DashboardHeader } from "@/components/dashboard-header";
import { FacultyList } from "@/components/faculty-list";
import { getFacultyList } from "@/lib/db/queries";

export const metadata = {
  title: "Faculty | KVSR Management",
};

interface FacultyPageProps {
  searchParams: { search?: string };
}

export default async function FacultyPage({ searchParams }: FacultyPageProps) {
  const searchQuery = searchParams.search || "";
  const faculty = await getFacultyList(searchQuery || undefined);

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="Faculty"
          subtitle="Directory of teaching staff and their schedules"
        />

        <FacultyList faculty={faculty} searchQuery={searchQuery} />
      </div>
    </div>
  );
}
