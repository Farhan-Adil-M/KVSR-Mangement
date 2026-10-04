import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { StudentContactEditor } from "@/components/student-contact-editor";
import { getStudentContext, requireStudent } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAppConfig } from "@/lib/app-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, IdCard, User } from "lucide-react";

export async function generateMetadata() {
  const config = await getAppConfig();
  return {
    title: `My Profile | ${config.institutionShortName} Management`,
  };
}

export default async function StudentProfilePage() {
  const session = await requireStudent();
  const ctx = await getStudentContext(session.id);

  const [profile] = await db
    .select({
      fullName: students.fullName,
      rollNumber: students.rollNumber,
      email: students.email,
      phone: students.phone,
      contactLockedAt: students.contactLockedAt,
    })
    .from(students)
    .where(eq(students.id, session.id))
    .limit(1);

  const contactLockedAt = profile?.contactLockedAt
    ? profile.contactLockedAt.toISOString()
    : null;
  const contactLockedOn = profile?.contactLockedAt
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(profile.contactLockedAt)
    : null;

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader title="My Profile" subtitle="Your academic identity" />

        {!profile ? (
          <EmptyState icon={User} title="Profile not found" />
        ) : (
          <div className="max-w-xl space-y-6">
            <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
              <CardHeader className="pb-4 pt-6 px-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-kvsr-navy/5 text-kvsr-navy font-semibold text-2xl">
                    {profile.fullName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-xl text-kvsr-navy">
                      {profile.fullName}
                    </CardTitle>
                    {ctx && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {ctx.yearLabel}-{ctx.sectionName} · Roll #{profile.rollNumber}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-6 pb-6">
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <GraduationCap className="w-4 h-4" />
                  Roll Number: {profile.rollNumber}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-kvsr-soft/80 bg-white shadow-sm">
              <CardHeader className="pb-3 pt-6 px-6">
                <CardTitle className="text-lg text-kvsr-navy flex items-center gap-2">
                  <IdCard className="w-5 h-5 text-kvsr-cta" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <StudentContactEditor
                  phone={profile.phone}
                  email={profile.email}
                  contactLockedAt={contactLockedAt}
                  contactLockedOn={contactLockedOn}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
