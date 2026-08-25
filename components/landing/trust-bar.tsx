"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

const accreditations = [
  "NAAC A+ Accredited",
  "JNTUA Affiliated",
  "AICTE Approved",
];

export function TrustBar() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="py-10 border-t border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-center">
          <span className="text-xs text-kvsr-muted uppercase tracking-[0.15em] font-medium">
            Trusted by KVSRIT
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
            {accreditations.map((item, index) => (
              <span key={item} className="flex items-center gap-3">
                {item}
                {index < accreditations.length - 1 && (
                  <span className="hidden sm:inline w-1 h-1 rounded-full bg-white/40" />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
