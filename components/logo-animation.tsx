"use client";

import { motion } from "motion/react";
import Image from "next/image";

export function LogoAnimation({ size = 180 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer rotating rings */}
      <motion.div
        className="absolute inset-[-15%] rounded-full border border-kvsr-orange/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-[-25%] rounded-full border border-dashed border-white/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      {/* Glow pulse */}
      <motion.div
        className="absolute inset-[-10%] rounded-full bg-kvsr-orange/20 blur-2xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Logo container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotateY: -30 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{
          duration: 1,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={{ scale: 1.05, rotateY: 10 }}
        className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-white/10 shadow-2xl shadow-kvsr-orange/20"
        style={{ transformStyle: "preserve-3d" }}
      >
        <Image
          src="/College_logo.jpg"
          alt="KVSRIT Logo"
          width={size}
          height={size}
          priority
          className="object-contain bg-white"
        />
      </motion.div>
    </div>
  );
}
