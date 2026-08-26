import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { getFacultyTimetable } from "@/lib/db/portal-queries";
import { requireFaculty } from "@/lib/auth/guards";
import { Calendar } from "lucide-react";

export const metadata = { title: "My Timetable | KVSR Management" };
export const dynamic = "force-dynamic";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function FacultyTimetablePage() {
  const session = await requireFaculty();
  const slots = await getFacultyTimetable(session.id);

  return (
    <div className="p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader
          title="My Timetable"
          subtitle="Your assigned classes for the current academic year"
        />

        {slots.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No classes assigned"
            description="You have no timetable slots yet. Contact the HOD to get class assignments."
          />
        ) : (
          <div className="space-y-5">
            {DAYS.map((day) => {
              const daySlots = slots.filter((s) => s.dayOfWeek === day);
              if (daySlots.length === 0) return null;
              return (
                <div key={day}>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {day}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-4 rounded-xl border border-kvsr-soft bg-white shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-kvsr-ink text-sm">
                            {slot.subject}
                          </span>
                          {slot.isLab && (
                            <span className="px-2 py-0.5 rounded-full bg-kvsr-orange/10 text-kvsr-cta text-xs font-medium">
                              Lab
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          P{slot.periodNumber} · {slot.startTime.slice(0, 5)}–
                          {slot.endTime.slice(0, 5)}
                        </p>
                        <p className="text-xs text-kvsr-cta mt-1 font-medium">
                          {slot.year}-{slot.section}
                        </p>
                      </div>
                    ))}
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
