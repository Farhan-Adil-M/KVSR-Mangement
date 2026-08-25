"use client";

import { motion } from "motion/react";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <h1 className="text-3xl sm:text-4xl font-bold text-kvsr-navy">{title}</h1>
      {subtitle && <p className="text-muted-foreground mt-2 text-lg">{subtitle}</p>}
    </motion.div>
  );
}
