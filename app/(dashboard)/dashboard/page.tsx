import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, BookOpen, Clock } from "lucide-react";

export const metadata = {
  title: "Dashboard | KVSR Management",
};

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-kvsr-navy">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to KVSR Management System
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-kvsr-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-kvsr-navy">843</div>
            <p className="text-xs text-muted-foreground">Across all years</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faculty
            </CardTitle>
            <BookOpen className="h-4 w-4 text-kvsr-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-kvsr-navy">41</div>
            <p className="text-xs text-muted-foreground">Including HOD</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Timetable Slots
            </CardTitle>
            <Calendar className="h-4 w-4 text-kvsr-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-kvsr-navy">530</div>
            <p className="text-xs text-muted-foreground">Weekly slots</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Periods/Day
            </CardTitle>
            <Clock className="h-4 w-4 text-kvsr-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-kvsr-navy">7</div>
            <p className="text-xs text-muted-foreground">09:50 AM - 05:00 PM</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-kvsr-navy">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Use the sidebar to navigate between modules.
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
              <li>View and manage timetable</li>
              <li>Track attendance</li>
              <li>Manage students and faculty</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-kvsr-navy">Department</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Currently managing CSE department data. The system is built to
              scale to multiple departments when ready.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
