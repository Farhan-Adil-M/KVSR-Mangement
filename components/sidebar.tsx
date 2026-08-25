"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Calendar, LayoutDashboard, Users, BookOpen, Settings } from "lucide-react";
import Image from "next/image";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/timetable", label: "Timetable", icon: Calendar },
  { href: "#", label: "Students", icon: Users, disabled: true },
  { href: "#", label: "Faculty", icon: BookOpen, disabled: true },
  { href: "#", label: "Settings", icon: Settings, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-kvsr-navy text-white flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/College_logo.jpg"
            alt="KVSRIT"
            width={48}
            height={48}
            className="rounded-full object-contain"
          />
          <div>
            <h2 className="font-bold text-lg leading-tight">KVSR</h2>
            <p className="text-xs text-white/70">Management</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-kvsr-orange text-white"
                  : item.disabled
                  ? "text-white/40 cursor-not-allowed"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/50 text-center">
          Development Mode
        </p>
      </div>
    </aside>
  );
}
