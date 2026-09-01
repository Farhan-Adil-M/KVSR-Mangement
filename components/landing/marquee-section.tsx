import { BadgeCheck } from "lucide-react";
import { Marquee } from "./primitives";

const ACCREDITATIONS = [
  "AICTE Approved",
  'NAAC "A+" Accredited',
  "NBA Accredited",
  "NIRF Ranked",
  "UGC Recognized",
  "JNTUA Affiliated",
];

export function MarqueeSection() {
  return (
    <section
      aria-label="Accreditations"
      className="bg-kvsr-navy border-y border-white/10 py-6"
    >
      <p className="sr-only">{ACCREDITATIONS.join(" · ")}</p>
      <Marquee>
        <div className="flex shrink-0 gap-10" aria-hidden="true">
          {ACCREDITATIONS.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-300"
            >
              <BadgeCheck size={16} className="text-kvsr-gold" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 gap-10" aria-hidden="true">
          {ACCREDITATIONS.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-300"
            >
              <BadgeCheck size={16} className="text-kvsr-gold" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </Marquee>
    </section>
  );
}
