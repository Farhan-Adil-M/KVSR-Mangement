"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Calendar, Clock } from "lucide-react";

interface DashboardStatsProps {
  students: number;
  faculty: number;
  slots: number;
  periods: number;
}

export function DashboardStats({
  students,
  faculty,
  slots,
  periods,
}: DashboardStatsProps) {
  const statCards = [
    {
      title: "Total Students",
      value: students,
      subtitle: "Across all years",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Faculty Members",
      value: faculty,
      subtitle: "Including HOD",
      icon: BookOpen,
      color: "text-kvsr-cta",
      bg: "bg-orange-50",
    },
    {
      title: "Timetable Slots",
      value: slots,
      subtitle: "Weekly scheduled",
      icon: Calendar,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Periods per Day",
      value: periods,
      subtitle: "09:50 AM - 05:00 PM",
      icon: Clock,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-8">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: index * 0.08 + 0.1 }}
          >
            <Card className="relative overflow-hidden border border-kvsr-soft/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 h-full">
              <CardHeader className="flex flex-row items-start justify-between pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-medium text-muted-foreground leading-tight">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bg} shrink-0 ml-3`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <div className="text-3xl font-bold text-kvsr-ink tracking-tight">
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {card.subtitle}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
