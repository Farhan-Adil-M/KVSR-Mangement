"use client";

import { Star, Quote } from "lucide-react";
import { Reveal, SectionHeading } from "./primitives";

interface Testimonial {
  initials: string;
  name: string;
  role: string;
  quote: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    initials: "KA",
    name: "K. Anusha",
    role: "II Year CSE · Student",
    quote:
      "Attendance used to eat ten minutes of every period. Now I just walk in and I'm marked present.",
  },
  {
    initials: "SR",
    name: "Dr. S. Ramesh",
    role: "Assistant Professor · ECE",
    quote:
      "I mark a full section's attendance in under a minute, and my timetable updates itself.",
  },
  {
    initials: "ML",
    name: "Prof. M. Lakshmi",
    role: "HOD · Mechanical",
    quote:
      "Every department's attendance and workload is on one screen before 10 a.m.",
  },
];

export function TestimonialsSection() {
  return (
    <section id="stories" className="scroll-mt-16 bg-kvsr-deep py-20 sm:py-24 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            dark
            eyebrow="In their words"
            title="Trusted on campus, every day."
          />
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t, index) => (
            <Reveal key={t.name} delay={index * 0.08}>
              <figure className="flex flex-col h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7">
                <div
                  className="flex items-center gap-1 mb-4"
                  aria-label="Rated 5 out of 5"
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className="fill-kvsr-gold text-kvsr-gold"
                      aria-hidden="true"
                    />
                  ))}
                  <span className="sr-only">5 out of 5</span>
                </div>

                <Quote
                  size={20}
                  className="text-kvsr-gold/60 mb-3"
                  aria-hidden="true"
                />

                <blockquote className="text-slate-300 leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                <figcaption className="flex items-center gap-3 mt-6 pt-5 border-t border-white/10">
                  <span className="w-11 h-11 rounded-full bg-kvsr-gold/15 text-kvsr-gold ring-1 ring-kvsr-gold/30 font-display font-semibold flex items-center justify-center shrink-0">
                    {t.initials}
                  </span>
                  <span>
                    <span className="block text-white font-semibold">{t.name}</span>
                    <span className="block text-sm text-slate-400">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
