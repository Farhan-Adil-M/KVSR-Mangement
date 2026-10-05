/**
 * Pure, deterministic event budget planner. No DB, no server-only imports,
 * no randomness — same inputs always produce the same plans. The server
 * action wrapper lives in lib/actions/events.ts.
 */

export type EventPlanTier = "budget" | "premium";

export interface PlannedItem {
  label: string;
  amount: number;
  note?: string;
}

export interface EventPlan {
  name: "Budget" | "Premium";
  items: PlannedItem[];
  total: number;
  perHead: number;
  fitsBudget: boolean;
  notes: string[];
}

export interface EventPlanResult {
  eventType: string;
  plans: EventPlan[];
}

export interface PlanEventInput {
  title: string;
  description?: string | null;
  attendees: number;
  budget: number;
}

/* ---------------- Indian market rate card (₹) ---------------- */

const CATERING_VEG = { budget: 130, premium: 260 } as const;
const CATERING_NONVEG_EXTRA = 90;
const DJ = { budget: 12_000, premium: 35_000 } as const;
const SOUND_LIGHTS = { budget: 8_000, premium: 20_000 } as const;
const DECOR = {
  perHead: { budget: 60, premium: 150 },
  min: { budget: 5_000, premium: 20_000 },
} as const;
const PHOTOGRAPHY = { budget: 5_000, premium: 18_000 } as const;
const CONTINGENCY_PCT = 0.08;

/** Fixed-item multipliers by event size tier. */
const TIER_MULTIPLIERS = { small: 1, medium: 1.5, large: 2.5 } as const;

const PRIZE_BASES: Record<string, { budget: number; premium: number }> = {
  freshers: { budget: 3_000, premium: 8_000 },
  farewell: { budget: 3_000, premium: 8_000 },
  annual: { budget: 8_000, premium: 25_000 },
  cultural: { budget: 6_000, premium: 20_000 },
  tech: { budget: 5_000, premium: 15_000 },
  sports: { budget: 5_000, premium: 15_000 },
  workshop: { budget: 2_000, premium: 5_000 },
  general: { budget: 3_000, premium: 10_000 },
};

const PRIZE_NOTES: Record<string, string> = {
  freshers: "Titles, sashes and spot prizes for ice-breakers.",
  farewell: "Mementos, titles and thank-you gifts.",
  annual: "Overall championship trophies and category prizes.",
  cultural: "Prizes for each cultural event and best performers.",
  tech: "Cash prizes and kits for hackathon/expo winners.",
  sports: "Trophies, medals and winner/runners-up prizes.",
  workshop: "Certificates and small kits for participants.",
  general: "Spot prizes and mementos for winners.",
};

/* ---------------- Keyword detection ---------------- */

const EVENT_TYPE_KEYWORDS: [string, string[]][] = [
  ["freshers", ["fresher", "orientation", "induction", "welcome"]],
  ["farewell", ["farewell", "send-off", "sendoff", "valedictory", "goodbye"]],
  ["workshop", ["workshop", "seminar", "webinar", "bootcamp", "training", "masterclass"]],
  ["tech", ["tech", "hackathon", "coding", "robotics", "ideathon", "expo", "symposium", "startup"]],
  ["sports", ["sport", "cricket", "kabaddi", "volleyball", "basketball", "athletic", "tournament", "championship", "games"]],
  ["cultural", ["cultural", "dance", "music", "singing", "sangeet", "drama", "skit", "talent", "fest"]],
  ["annual", ["annual", "anniversary", "foundation"]],
];

const NON_VEG_KEYWORDS = [
  "non-veg",
  "nonveg",
  "non veg",
  "chicken",
  "mutton",
  "fish",
  "biryani",
  "egg",
  "seafood",
];

function detectEventType(title: string, description?: string | null): string {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  for (const [type, keywords] of EVENT_TYPE_KEYWORDS) {
    if (keywords.some((keyword) => text.includes(keyword))) return type;
  }
  return "general";
}

function detectNonVeg(title: string, description?: string | null): boolean {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  return NON_VEG_KEYWORDS.some((keyword) => text.includes(keyword));
}

/* ---------------- Helpers ---------------- */

function sizeTier(attendees: number): keyof typeof TIER_MULTIPLIERS {
  if (attendees < 100) return "small";
  if (attendees <= 300) return "medium";
  return "large";
}

function round500(value: number): number {
  return Math.round(value / 500) * 500;
}

function withContingency(subtotal: number): number {
  return subtotal + Math.round(subtotal * CONTINGENCY_PCT);
}

/** Indian numbering (₹1,50,000 style) without locale dependence. */
function formatINR(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const digits = String(Math.abs(Math.round(amount)));
  if (digits.length <= 3) return `${sign}₹${digits}`;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${sign}₹${rest},${last3}`;
}

/* ---------------- Plan builders ---------------- */

function buildBudgetPlan(
  eventType: string,
  attendees: number,
  budget: number,
  nonVeg: boolean
): EventPlan {
  const multiplier = TIER_MULTIPLIERS[sizeTier(attendees)];
  const notes: string[] = [];
  const decorMin = DECOR.min.budget;

  let cateringPerHead = CATERING_VEG.budget + (nonVeg ? CATERING_NONVEG_EXTRA : 0);
  let dj = round500(DJ.budget * multiplier);
  const sound = round500(SOUND_LIGHTS.budget * multiplier);
  let decor = Math.max(attendees * DECOR.perHead.budget, decorMin);
  let photography = round500(PHOTOGRAPHY.budget * multiplier);
  const prizeBase = (PRIZE_BASES[eventType] ?? PRIZE_BASES.general).budget;
  const prizes = round500(prizeBase * multiplier);

  const totalOf = (catering: number) =>
    withContingency(catering + dj + sound + decor + photography + prizes);

  let total = totalOf(attendees * cateringPerHead);

  // Deterministic trim sequence until the plan fits (or trims are exhausted).
  if (total > budget && nonVeg) {
    const saved = attendees * CATERING_NONVEG_EXTRA;
    cateringPerHead -= CATERING_NONVEG_EXTRA;
    total = totalOf(attendees * cateringPerHead);
    notes.push(`Dropped non-veg catering to fit the budget (saves ~${formatINR(saved)}).`);
  }
  if (total > budget && photography > 0) {
    const saved = photography;
    photography = 0;
    total = totalOf(attendees * cateringPerHead);
    notes.push(`Dropped photography to fit the budget (saves ~${formatINR(saved)}).`);
  }
  if (total > budget && decor > decorMin) {
    const saved = decor - decorMin;
    decor = decorMin;
    total = totalOf(attendees * cateringPerHead);
    notes.push(`Reduced decor to the minimum kit (saves ~${formatINR(saved)}).`);
  }
  if (total > budget && cateringPerHead > 100) {
    const saved = attendees * (cateringPerHead - 100);
    cateringPerHead = 100;
    total = totalOf(attendees * cateringPerHead);
    notes.push(`Switched to simple meals at ₹100/head (saves ~${formatINR(saved)}).`);
  }
  if (total > budget && dj > 0) {
    const saved = dj;
    dj = 0;
    total = totalOf(attendees * cateringPerHead);
    notes.push(`Dropped the DJ; keeping sound & lights (saves ~${formatINR(saved)}).`);
  }

  const items: PlannedItem[] = [
    {
      label: `Catering (₹${cateringPerHead}/head × ${attendees})`,
      amount: attendees * cateringPerHead,
    },
    { label: "DJ", amount: dj, note: dj === 0 ? "Dropped to fit the budget" : undefined },
    { label: "Sound & lights", amount: sound },
    { label: "Decor", amount: decor },
    {
      label: "Photography",
      amount: photography,
      note: photography === 0 ? "Dropped to fit the budget" : undefined,
    },
    { label: "Prizes & awards", amount: prizes, note: PRIZE_NOTES[eventType] ?? PRIZE_NOTES.general },
    { label: "Stage & venue", amount: 0, note: "On-campus venue — no rental cost" },
  ];
  const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
  const contingency = Math.round(subtotal * CONTINGENCY_PCT);
  items.push({ label: "Contingency (8%)", amount: contingency });
  total = subtotal + contingency;

  if (total > budget) {
    notes.push(
      `Even after trims this plan exceeds the budget by ${formatINR(total - budget)} — consider raising the budget or trimming the guest list.`
    );
  }

  return {
    name: "Budget",
    items,
    total,
    perHead: attendees > 0 ? Math.round(total / attendees) : total,
    fitsBudget: total <= budget,
    notes,
  };
}

function buildPremiumPlan(
  eventType: string,
  attendees: number,
  budget: number,
  nonVeg: boolean
): EventPlan {
  const multiplier = TIER_MULTIPLIERS[sizeTier(attendees)];
  const notes: string[] = [];
  const decorMin = DECOR.min.premium;

  const cateringPerHead = CATERING_VEG.premium + (nonVeg ? CATERING_NONVEG_EXTRA : 0);
  const catering = attendees * cateringPerHead;
  const dj = round500(DJ.premium * multiplier);
  const sound = round500(SOUND_LIGHTS.premium * multiplier);
  const decor = Math.max(attendees * DECOR.perHead.premium, decorMin);
  const photography = round500(PHOTOGRAPHY.premium * multiplier);
  const prizeBase = (PRIZE_BASES[eventType] ?? PRIZE_BASES.general).premium;
  const prizes = round500(prizeBase * multiplier);

  const items: PlannedItem[] = [
    {
      label: `Catering (₹${cateringPerHead}/head × ${attendees})`,
      amount: catering,
    },
    { label: "DJ", amount: dj },
    { label: "Sound & lights", amount: sound },
    { label: "Decor", amount: decor },
    { label: "Photography", amount: photography },
    { label: "Prizes & awards", amount: prizes, note: PRIZE_NOTES[eventType] ?? PRIZE_NOTES.general },
    { label: "Stage & venue", amount: 0, note: "On-campus venue — no rental cost" },
  ];
  const subtotal = items.reduce((acc, item) => acc + item.amount, 0);
  const contingency = Math.round(subtotal * CONTINGENCY_PCT);
  items.push({ label: "Contingency (8%)", amount: contingency });
  const total = subtotal + contingency;

  if (total > budget) {
    const over = total - budget;
    notes.push(`Exceeds the budget by ${formatINR(over)}.`);
    notes.push(
      "Trim candidates: switch catering to the budget menu (₹130/head), downgrade photography to the budget package, or reduce decor to the standard kit."
    );
    const cateringItem = items.find((item) => item.label.startsWith("Catering"));
    if (cateringItem) {
      cateringItem.note = `Trim candidate: budget menu at ₹${CATERING_VEG.budget}/head saves ~${formatINR(attendees * (cateringPerHead - CATERING_VEG.budget))}.`;
    }
    const photographyItem = items.find((item) => item.label === "Photography");
    if (photographyItem) {
      photographyItem.note = `Trim candidate: budget photography package (~${formatINR(round500(PHOTOGRAPHY.budget * multiplier))}).`;
    }
    const decorItem = items.find((item) => item.label === "Decor");
    if (decorItem) {
      decorItem.note = `Trim candidate: standard decor kit (~${formatINR(Math.max(attendees * DECOR.perHead.budget, DECOR.min.budget))}).`;
    }
  }

  return {
    name: "Premium",
    items,
    total,
    perHead: attendees > 0 ? Math.round(total / attendees) : total,
    fitsBudget: total <= budget,
    notes,
  };
}

/**
 * Deterministic heuristic planner: detects the event type from keywords,
 * produces a Budget and a Premium plan with Indian-market line items, trims
 * the Budget plan until it fits, and marks trim candidates on Premium.
 */
export function planEventLocally(input: PlanEventInput): EventPlanResult {
  const attendees = Math.round(input.attendees);
  const budget = Math.round(input.budget);
  if (!Number.isFinite(attendees) || attendees < 10 || attendees > 5000) {
    throw new Error("Attendees must be between 10 and 5000.");
  }
  if (!Number.isFinite(budget) || budget < 1000 || budget > 10_000_000) {
    throw new Error("Budget must be between ₹1,000 and ₹1,00,00,000.");
  }

  const eventType = detectEventType(input.title, input.description);
  const nonVeg = detectNonVeg(input.title, input.description);

  const budgetPlan = buildBudgetPlan(eventType, attendees, budget, nonVeg);
  const premiumPlan = buildPremiumPlan(eventType, attendees, budget, nonVeg);

  if (budget > premiumPlan.total) {
    premiumPlan.notes.push(
      `Your budget exceeds the Premium plan by ${formatINR(budget - premiumPlan.total)} — consider upgrading catering, decor, or adding return gifts.`
    );
  }

  return { eventType, plans: [budgetPlan, premiumPlan] };
}
