import { z } from "zod";

/**
 * Shared biometric descriptor validation. Lives outside "use server" files so
 * both action modules can import it (Next.js allows only async function
 * exports from server-action files).
 */
export const descriptorSchema = z
  .array(z.number())
  .length(128)
  .refine(
    (arr) => arr.every((n) => Number.isFinite(n) && Math.abs(n) < 1e3),
    "descriptor must be finite and bounded"
  );

/** Euclidean distance between two 128-d descriptors (server-side copy). */
export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Element-wise average of descriptors. All inputs must be length 128. */
export function averageDescriptors(list: number[][]): number[] {
  if (list.length === 0) throw new Error("cannot average zero descriptors");
  const out = new Array<number>(list[0].length).fill(0);
  for (const d of list) {
    for (let i = 0; i < out.length; i++) out[i] += d[i];
  }
  return out.map((v) => v / list.length);
}
