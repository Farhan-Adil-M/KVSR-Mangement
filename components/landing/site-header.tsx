"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoAnimation } from "@/components/logo-animation";

export function SiteHeader() {
  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative z-20 px-4 sm:px-6 py-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold focus-visible:ring-offset-2 focus-visible:ring-offset-kvsr-deep rounded-lg"
        >
          <div className="w-9 h-9">
            <LogoAnimation size={36} variant="nav" />
          </div>
          <span className="font-semibold text-white text-base sm:text-lg tracking-tight">
            KVSRIT
          </span>
        </Link>
        <Link
          href="/identify"
          className="px-4 sm:px-5 py-2.5 bg-kvsr-cta text-white text-sm font-medium rounded-full hover:bg-kvsr-cta/90 transition-colors flex items-center gap-2 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-kvsr-gold focus-visible:ring-offset-2 focus-visible:ring-offset-kvsr-deep min-h-[44px]"
        >
          <span className="hidden sm:inline">Open Dashboard</span>
          <span className="sm:hidden">Dashboard</span>
          <ArrowRight size={15} className="hidden sm:block" />
        </Link>
      </div>
    </motion.header>
  );
}
