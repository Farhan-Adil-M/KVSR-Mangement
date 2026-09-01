"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardCheck,
  UserCheck,
  Bell,
  Fingerprint,
  Award,
  type LucideIcon,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_BY_ROLE: Record<SessionUser["role"], NavItem[]> = {
  admin: [
    { href: "/admin/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/departments", label: "Depts", icon: Building2 },
    { href: "/admin/attendance/reports", label: "Reports", icon: ClipboardCheck },
    { href: "/admin/notifications", label: "Alerts", icon: Bell },
  ],
  hod: [
    { href: "/faculty/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/faculty/students", label: "Students", icon: Users },
    { href: "/faculty/attendance", label: "Attendance", icon: ClipboardCheck },
    { href: "/faculty/faculty-attendance", label: "Staff", icon: UserCheck },
    { href: "/faculty/notifications", label: "Alerts", icon: Bell },
  ],
  faculty: [
    { href: "/faculty/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/faculty/students", label: "Students", icon: Users },
    { href: "/faculty/attendance", label: "Attendance", icon: ClipboardCheck },
    { href: "/faculty/faculty-attendance", label: "My Record", icon: UserCheck },
    { href: "/faculty/notifications", label: "Alerts", icon: Bell },
  ],
  student: [
    { href: "/student/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
    { href: "/student/biometrics", label: "Face ID", icon: Fingerprint },
    { href: "/student/marks", label: "Marks", icon: Award },
    { href: "/student/notifications", label: "Alerts", icon: Bell },
  ],
};

export function MobileNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[user.role];

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-kvsr-soft shadow-[0_-4px_20px_rgba(2,27,67,0.08)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 min-h-[56px] justify-center transition-colors ${
                active ? "text-kvsr-cta" : "text-slate-600 hover:text-kvsr-ink"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              <span
                className={`text-[10px] leading-none ${
                  active ? "font-bold" : "font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
