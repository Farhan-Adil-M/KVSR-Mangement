"use client";

import { motion } from "motion/react";
import Image from "next/image";

interface LogoAnimationProps {
  size?: number;
  variant?: "hero" | "nav";
}

export function LogoAnimation({ size = 120, variant = "hero" }: LogoAnimationProps) {
  const isHero = variant === "hero";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative"
      style={{ width: size, height: size }}
    >
      {isHero && (
        <motion.div
          className="absolute inset-[-12%] rounded-full border border-kvsr-gold/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
        />
      )}

      {isHero && (
        <motion.div
          className="absolute inset-0 rounded-full bg-kvsr-cta/30 blur-2xl"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div
        className={`relative w-full h-full rounded-full overflow-hidden bg-white ${
          isHero ? "ring-4 ring-kvsr-deep shadow-2xl" : "ring-2 ring-kvsr-orange/40"
        }`}
      >
        <Image
          src="/College_logo.jpg"
          alt="KVSRIT Logo"
          width={size}
          height={size}
          priority
          className="object-contain"
        />
      </div>
    </motion.div>
  );
}
