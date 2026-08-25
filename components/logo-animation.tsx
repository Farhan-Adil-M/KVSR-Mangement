"use client";

import { motion } from "motion/react";
import Image from "next/image";

export function LogoAnimation({ size = 180 }: { size?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative"
    >
      <motion.div
        animate={{
          boxShadow: [
            "0 0 0 0 rgba(212, 115, 20, 0)",
            "0 0 0 20px rgba(212, 115, 20, 0.1)",
            "0 0 0 0 rgba(212, 115, 20, 0)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="rounded-full"
      >
        <Image
          src="/College_logo.jpg"
          alt="KVSRIT Logo"
          width={size}
          height={size}
          priority
          className="rounded-full object-contain"
        />
      </motion.div>
    </motion.div>
  );
}
