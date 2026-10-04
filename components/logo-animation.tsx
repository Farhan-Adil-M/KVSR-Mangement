"use client";

import { motion } from "motion/react";
import Image from "next/image";

interface LogoAnimationProps {
  size?: number;
  variant?: "hero" | "nav";
  /** Accessible name for the crest image (institution short name). */
  alt?: string;
}

export function LogoAnimation({ size = 120, variant = "hero", alt = "Institution crest" }: LogoAnimationProps) {
  const isHero = variant === "hero";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div
        className={`relative w-full h-full rounded-full overflow-hidden bg-white ${
          isHero ? "ring-4 ring-kvsr-deep shadow-2xl" : "ring-2 ring-kvsr-orange/40"
        }`}
      >
        <Image
          src="/College_logo.jpg"
          alt={alt}
          width={size}
          height={size}
          priority
          className="object-contain"
        />
      </div>
    </motion.div>
  );
}
