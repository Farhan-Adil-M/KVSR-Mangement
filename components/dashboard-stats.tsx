"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, BookOpen, Calendar, Clock } from "lucide-react";

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
      gradient: "from-blue-500 to-blue-600",
      lightGradient: "from-blue-50 to-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Faculty Members",
      value: faculty,
      subtitle: "Including HOD",
      icon: BookOpen,
      gradient: "from-kvsr-orange to-amber-500",
      lightGradient: "from-orange-50 to-amber-100",
      iconColor: "text-kvsr-orange",
    },
    {
      title: "Timetable Slots",
      value: slots,
      subtitle: "Weekly scheduled slots",
      icon: Calendar,
      gradient: "from-emerald-500 to-emerald-600",
      lightGradient: "from-emerald-50 to-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "Periods per Day",
      value: periods,
      subtitle: "09:50 AM - 05:00 PM",
      icon: Clock,
      gradient: "from-violet-500 to-violet-600",
      lightGradient: "from-violet-50 to-violet-100",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
          >
            <Card
              className={`group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br ${card.lightGradient}`}
            >
              <div
                className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity`}
              />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div
                  className={`p-2 rounded-lg bg-gradient-to-br ${card.lightGradient}`}
                >
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-kvsr-navy">
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
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
