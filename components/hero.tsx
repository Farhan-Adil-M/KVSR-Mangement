"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoAnimation } from "./logo-animation";

export function Hero() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      router.push("/dashboard");
    }, 4000);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearTimeout(redirectTimer);
      clearInterval(countdownInterval);
    };
  }, [router]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-white via-slate-50 to-kvsr-orange/5">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.03, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] rounded-full bg-kvsr-navy"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.05, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.2 }}
          className="absolute -bottom-1/2 -left-1/2 w-[600px] h-[600px] rounded-full bg-kvsr-orange"
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl mx-auto"
      >
        <motion.div variants={itemVariants}>
          <LogoAnimation size={180} />
        </motion.div>

        <motion.div variants={itemVariants} className="mt-8 space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-kvsr-navy">
            KVSR Management
          </h1>
          <p className="text-lg sm:text-xl text-kvsr-navy/80 max-w-2xl mx-auto">
            Dr. K.V. Subba Reddy Institute of Technology
          </p>
          <p className="text-sm sm:text-base text-kvsr-orange font-semibold tracking-wide uppercase">
            Kurnool, Andhra Pradesh
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-kvsr-orange border-t-transparent rounded-full"
            />
            <span className="text-sm text-kvsr-navy/70">
              Loading in {countdown}s
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/dashboard")}
            className="px-8 py-3 bg-kvsr-navy text-white rounded-full font-medium shadow-lg shadow-kvsr-navy/25 hover:bg-kvsr-navy/90 transition-colors"
          >
            Enter Dashboard
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-6 text-center text-xs text-kvsr-navy/50"
      >
        NAAC A+ Accredited | JNTUA Affiliated | AICTE Approved
      </motion.div>
    </div>
  );
}
