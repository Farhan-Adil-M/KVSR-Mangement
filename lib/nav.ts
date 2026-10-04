import type { LucideIcon } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import {
  Award,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Fingerprint,
  GraduationCap,
  LayoutDashboard,
  Settings,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";

/**
 * Single source of truth for portal navigation (Level 4 spec §9.1).
 * The sidebar and the mobile bottom bar both derive from these maps —
 * never define nav items anywhere else.
 *
 * Role notes:
 * - `hod` lives under the /faculty prefix (middleware maps hod → /faculty)
 *   and is the faculty map PLUS the HOD-only Enrollment surface (§5, §9.2).
 * - Plain faculty must never see HOD surfaces, so its map simply omits them.
 */

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Bottom-bar candidate. The bar renders the role's mobile items in map
   * order (exactly 5 per role — see the flag notes below).
   */
  mobile?: boolean;
  /** Sidebar section: "main" (default) or the admin-only "setup" group. */
  group?: "main" | "setup";
}

/**
 * Mobile flags: the §9.2 tables mark a priority core per role; the bar needs
 * exactly 5 (acceptance: "bottom bar shows exactly 5 items per role"), so each
 * role is completed to 5 with its most-used destinations — reproducing the
 * pre-existing bottom bar per role (plus Events for students, per §9.2).
 */
const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/admin/students", label: "Students", icon: GraduationCap, mobile: true },
  { href: "/admin/faculty", label: "Faculty", icon: Users },
  { href: "/admin/departments", label: "Departments", icon: Building2, mobile: true },
  { href: "/admin/enrollment", label: "Enrollment", icon: UserPlus },
  { href: "/admin/timetable", label: "Timetable", icon: Calendar },
  { href: "/admin/attendance/reports", label: "Attendance Reports", icon: ClipboardCheck, mobile: true },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, mobile: true },
  { href: "/admin/setup", label: "Setup", icon: Wrench, group: "setup" },
  { href: "/admin/settings", label: "Settings", icon: Settings, group: "setup" },
];

const HOD_NAV: NavItem[] = [
  { href: "/faculty/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/faculty/timetable", label: "My Timetable", icon: Calendar },
  { href: "/faculty/classes", label: "My Classes", icon: BookOpen },
  { href: "/faculty/attendance", label: "Attendance", icon: ClipboardCheck, mobile: true },
  { href: "/faculty/students", label: "My Students", icon: Users, mobile: true },
  { href: "/faculty/enrollment", label: "Enrollment", icon: UserPlus },
  { href: "/faculty/events", label: "Events", icon: CalendarDays },
  { href: "/faculty/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/faculty/marks", label: "Marks Entry", icon: Award },
  { href: "/faculty/faculty-attendance", label: "Faculty Attendance", icon: UserCheck, mobile: true },
  { href: "/faculty/notifications", label: "Notifications", icon: Bell, mobile: true },
];

/** Faculty = HOD map minus the HOD-only Enrollment surface (§9.2). */
const FACULTY_NAV: NavItem[] = HOD_NAV.filter((item) => item.href !== "/faculty/enrollment");

const STUDENT_NAV: NavItem[] = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/student/attendance", label: "My Attendance", icon: ClipboardCheck, mobile: true },
  { href: "/student/timetable", label: "My Timetable", icon: Calendar, mobile: true },
  { href: "/student/marks", label: "Marks", icon: Award, mobile: true },
  { href: "/student/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/student/exams", label: "Examinations", icon: FileText },
  { href: "/student/syllabus", label: "Syllabus", icon: BookOpen },
  { href: "/student/events", label: "Events", icon: CalendarDays, mobile: true },
  { href: "/student/biometrics", label: "My Biometrics", icon: Fingerprint },
  { href: "/student/notifications", label: "Notifications", icon: Bell },
  { href: "/student/profile", label: "Profile", icon: User },
];

export const NAV_BY_ROLE: Record<SessionUser["role"], NavItem[]> = {
  admin: ADMIN_NAV,
  hod: HOD_NAV,
  faculty: FACULTY_NAV,
  student: STUDENT_NAV,
};
