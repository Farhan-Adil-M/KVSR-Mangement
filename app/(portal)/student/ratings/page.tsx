import { FacultyRatings } from "@/components/faculty-ratings";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { requireStudent } from "@/lib/auth/guards";
import { getRateableFaculty } from "@/lib/actions/ratings";
import { getAppConfig } from "@/lib/app-config";
import { Star } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `Faculty Ratings | ${config.institutionShortName} Management`,
  };
}

export default async function StudentRatingsPage() {
  await requireStudent();

  const [faculty, config] = await Promise.all([
    getRateableFaculty(),
    getAppConfig(),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Faculty Ratings"
          subtitle={`Rate the faculty who teach you, from 1 to 5 stars · ${config.institutionShortName}`}
          breadcrumbs={[
            { label: "Student", href: "/student/dashboard" },
            { label: "Faculty Ratings" },
          ]}
        />

        {faculty.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No faculty to rate yet"
            description="Once faculty are assigned to your classes, you can rate them here."
          />
        ) : (
          <FacultyRatings rows={faculty} />
        )}
      </div>
    </div>
  );
}
