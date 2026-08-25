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
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";

const navItems: {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timetable", label: "Timetable", icon: Calendar },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/students", label: "Students", icon: Users },
  { href: "/faculty", label: "Faculty", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
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
            <p className="text-[10px] text-white/70">Management</p>
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
              <p className="text-xs text-white/70">Management</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 + 0.1 }}
              >
                <Link
                  href={item.disabled ? "#" : item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative",
                    active
                      ? "bg-kvsr-orange text-white shadow-lg shadow-kvsr-orange/20"
                      : item.disabled
                      ? "text-white/40 cursor-not-allowed"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                  {item.disabled && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/10">
                      Soon
                    </span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
            <div className="w-9 h-9 rounded-lg bg-kvsr-orange/20 flex items-center justify-center">
              <GraduationCap size={18} className="text-kvsr-orange" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">CSE Department</p>
              <p className="text-xs text-white/50">Academic Year 2026-27</p>
            </div>
          </div>
          <p className="text-xs text-white/40 text-center">
            Development Mode
          </p>
        </div>
      </aside>
    </>
  );
}
