"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_BY_ROLE } from "@/lib/nav";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Mobile bottom bar — derives its items from the single nav source
 * (lib/nav.ts, §9.1): the role's `mobile: true` items in map order.
 * Active state uses color + weight + icon stroke, never color alone (§9.4).
 */
export function MobileNav({
  user,
  institutionShortName,
}: {
  user: SessionUser;
  institutionShortName: string;
}) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[user.role].filter((item) => item.mobile === true);

  return (
    <nav
      aria-label={`${institutionShortName} primary navigation`}
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
              className={`flex flex-col items-center gap-1 py-2.5 min-h-[56px] justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-kvsr-gold ${
                active ? "text-kvsr-cta" : "text-slate-600 hover:text-kvsr-ink"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
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
