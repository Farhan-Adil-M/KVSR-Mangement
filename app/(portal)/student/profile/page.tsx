import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { getStudentContext, requireStudent } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, GraduationCap } from "lucide-react";

export const metadata = { title: "My Profile | KVSR Management" };

export default async function StudentProfilePage() {
  const session = await requireStudent();
  const ctx = await getStudentContext(session.id);

  const [profile] = await db
    .select({
      fullName: students.fullName,
      rollNumber: students.rollNumber,
      email: students.email,
      phone: students.phone,
    })
    .from(students)
    .where(eq(students.id, session.id))
    .limit(1);

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader title="My Profile" subtitle="Your academic identity" />

        {!profile ? (
          <EmptyState icon={User} title="Profile not found" />
        ) : (
          <div className="max-w-xl">
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
                {profile.email && (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {profile.email}
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {profile.phone}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
