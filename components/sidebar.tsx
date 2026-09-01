"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Calendar,
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  Menu,
  X,
  GraduationCap,
  ClipboardCheck,
  Bell,
  FileText,
  Award,
  ClipboardList,
  User,
  Fingerprint,
  Building2,
  UserCheck,
  type LucideIcon,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import { logout } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/auth/session";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/students", label: "Students", icon: GraduationCap },
  { href: "/admin/faculty", label: "Faculty", icon: Users },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/timetable", label: "Timetable", icon: Calendar },
  { href: "/admin/attendance/reports", label: "Attendance Reports", icon: ClipboardCheck },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const FACULTY_NAV: NavItem[] = [
  { href: "/faculty/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/faculty/timetable", label: "My Timetable", icon: Calendar },
  { href: "/faculty/classes", label: "My Classes", icon: BookOpen },
  { href: "/faculty/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/faculty/students", label: "My Students", icon: Users },
  { href: "/faculty/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/faculty/marks", label: "Marks Entry", icon: Award },
  { href: "/faculty/faculty-attendance", label: "Faculty Attendance", icon: UserCheck },
  { href: "/faculty/notifications", label: "Notifications", icon: Bell },
];

const STUDENT_NAV: NavItem[] = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/attendance", label: "My Attendance", icon: ClipboardCheck },
  { href: "/student/biometrics", label: "My Biometrics", icon: Fingerprint },
  { href: "/student/timetable", label: "My Timetable", icon: Calendar },
  { href: "/student/marks", label: "Marks", icon: Award },
  { href: "/student/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/student/exams", label: "Examinations", icon: FileText },
  { href: "/student/syllabus", label: "Syllabus", icon: BookOpen },
  { href: "/student/notifications", label: "Notifications", icon: Bell },
  { href: "/student/profile", label: "Profile", icon: User },
];

const NAV_BY_ROLE: Record<SessionUser["role"], NavItem[]> = {
  admin: ADMIN_NAV,
  hod: FACULTY_NAV,
  faculty: FACULTY_NAV,
  student: STUDENT_NAV,
};

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  admin: "Admin",
  hod: "HOD",
  faculty: "Faculty",
  student: "Student",
};

interface SidebarProps {
  user: SessionUser;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = NAV_BY_ROLE[user.role];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-kvsr-navy text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-kvsr-orange/50">
            <Image
              src="/College_logo.jpg"
              alt="KVSRIT"
              width={36}
              height={36}
              className="object-contain bg-white"
            />
          </div>
          <div>
            <h2 className="font-bold text-base leading-tight">KVSRIT</h2>
            <p className="text-[10px] text-white/70">{ROLE_LABEL[user.role]}</p>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 w-72 bg-kvsr-navy text-white flex flex-col h-screen shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-kvsr-orange/50">
              <Image
                src="/College_logo.jpg"
                alt="KVSRIT"
                width={48}
                height={48}
                className="object-contain bg-white"
              />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">KVSRIT</h2>
              <p className="text-xs text-white/70">{ROLE_LABEL[user.role]}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  active
                    ? "bg-kvsr-orange text-white shadow-lg shadow-kvsr-orange/20 font-semibold"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10">
          <div className="px-4 py-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-kvsr-orange/20 flex items-center justify-center shrink-0">
                <GraduationCap size={18} className="text-kvsr-orange" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-white/50">{ROLE_LABEL[user.role]}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-xs font-medium text-white disabled:opacity-50"
            >
              {isLoggingOut ? (
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
