"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { LogoAnimation } from "./logo-animation";
import { ArrowRight, Calendar, Users, BookOpen, Shield } from "lucide-react";
import Image from "next/image";

const features = [
  { icon: Calendar, label: "Smart Timetable", desc: "Section-wise schedules" },
  { icon: Users, label: "Attendance", desc: "Track every session" },
  { icon: BookOpen, label: "Faculty", desc: "Manage teaching staff" },
  { icon: Shield, label: "Academic Records", desc: "Organized & secure" },
];

const stats = [
  { value: "843", label: "Students" },
  { value: "41", label: "Faculty" },
  { value: "530", label: "Weekly Slots" },
];

export function Hero() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden bg-kvsr-navy">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-kvsr-orange/20 via-kvsr-navy to-kvsr-navy" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
        
        {/* Floating orbs */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-kvsr-orange/10 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl"
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div style={{ y, opacity }} className="relative z-10">
        {/* Navigation bar */}
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-kvsr-orange/50">
                <Image
                  src="/College_logo.jpg"
                  alt="KVSRIT"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <span className="font-bold text-white text-lg">KVSR Management</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/dashboard")}
              className="px-5 py-2 bg-kvsr-orange text-white text-sm font-medium rounded-full hover:bg-kvsr-orange/90 transition-colors flex items-center gap-2"
            >
              Enter Dashboard
              <ArrowRight size={16} />
            </motion.button>
          </div>
        </motion.nav>

        {/* Hero content */}
        <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-20">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8"
            >
              <LogoAnimation size={160} />
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
              }}
              className="space-y-4"
            >
              <div className="overflow-hidden">
                <motion.h1
                  variants={{
                    hidden: { y: 80, opacity: 0 },
                    visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
                  }}
                  className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight"
                >
                  KVSR{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-kvsr-orange to-amber-400">
                    Management
                  </span>
                </motion.h1>
              </div>

              <motion.p
                variants={{
                  hidden: { y: 30, opacity: 0 },
                  visible: { y: 0, opacity: 1, transition: { duration: 0.7 } },
                }}
                className="text-xl sm:text-2xl text-white/80 max-w-2xl mx-auto font-light"
              >
                Dr. K.V. Subba Reddy Institute of Technology
              </motion.p>

              <motion.p
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  visible: { y: 0, opacity: 1, transition: { duration: 0.6 } },
                }}
                className="text-sm sm:text-base text-kvsr-orange font-medium tracking-[0.2em] uppercase"
              >
                Kurnool, Andhra Pradesh
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(212, 115, 20, 0.5)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/dashboard")}
                className="group px-8 py-4 bg-gradient-to-r from-kvsr-orange to-amber-500 text-white text-lg font-semibold rounded-full shadow-xl shadow-kvsr-orange/20 flex items-center gap-3"
              >
                Launch Dashboard
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/timetable")}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white text-lg font-medium rounded-full border border-white/20 hover:bg-white/20 transition-colors"
              >
                View Timetable
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.1 }}
              className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
            >
              {stats.map((stat, index) => (
                <div key={stat.label} className="text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.3 + index * 0.1 }}
                    className="text-3xl sm:text-4xl font-bold text-white"
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-xs sm:text-sm text-white/60 mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="w-full max-w-6xl mx-auto mt-24 px-4 pb-16"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.5 + index * 0.1 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="group p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-kvsr-orange/30 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-kvsr-orange/20 flex items-center justify-center mb-4 group-hover:bg-kvsr-orange/30 transition-colors">
                      <Icon className="w-6 h-6 text-kvsr-orange" />
                    </div>
                    <h3 className="text-white font-semibold mb-1">{feature.label}</h3>
                    <p className="text-white/60 text-sm">{feature.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            className="pb-8 text-center"
          >
            <p className="text-xs text-white/40">
              NAAC A+ Accredited | JNTUA Affiliated | AICTE Approved
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
