"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { NAV_BY_ROLE, type NavItem } from "@/lib/nav";
import {
  GraduationCap,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import { logout } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/auth/session";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  admin: "Admin",
  hod: "HOD",
  faculty: "Faculty",
  student: "Student",
};

/** Sidebar section order: main items first, then the admin Setup group. */
const GROUP_ORDER: NonNullable<NavItem["group"]>[] = ["main", "setup"];

const GROUP_LABEL: Record<NonNullable<NavItem["group"]>, string> = {
  main: "",
  setup: "Setup",
};

interface SidebarProps {
  user: SessionUser;
  /** Institution short name from app config (server-provided, §8.4). */
  institutionShortName: string;
  /** Full institution name — used as the crest image's accessible name. */
  institutionName: string;
}

export function Sidebar({ user, institutionShortName, institutionName }: SidebarProps) {
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
              alt={institutionName}
              width={36}
              height={36}
              className="object-contain bg-white"
            />
          </div>
          <div>
            <h2 className="font-bold text-base leading-tight">{institutionShortName}</h2>
            <p className="text-[10px] text-white/70">{ROLE_LABEL[user.role]}</p>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center justify-center min-h-[48px] min-w-[48px] rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="portal-sidebar"
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
        id="portal-sidebar"
        className={cn(
          "fixed top-0 left-0 z-[70] w-72 bg-kvsr-navy text-white flex flex-col h-screen shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-kvsr-orange/50">
              <Image
                src="/College_logo.jpg"
                alt={institutionName}
                width={48}
                height={48}
                className="object-contain bg-white"
              />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{institutionShortName}</h2>
              <p className="text-xs text-white/70">{ROLE_LABEL[user.role]}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Primary">
          {GROUP_ORDER.map((group) => {
            const groupItems = navItems.filter((item) => (item.group ?? "main") === group);
            if (groupItems.length === 0) return null;
            return (
              <div key={group}>
                {GROUP_LABEL[group] && (
                  <p className="px-4 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    {GROUP_LABEL[group]}
                  </p>
                )}
                {groupItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold",
                        active
                          ? "bg-kvsr-orange text-white shadow-lg shadow-kvsr-orange/20 font-semibold"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon size={20} strokeWidth={active ? 2.2 : 2} aria-hidden="true" />
                      <span className={active ? "font-semibold" : "font-medium"}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
              className="w-full flex items-center justify-center gap-2 px-3 min-h-[48px] rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-xs font-medium text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold"
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
